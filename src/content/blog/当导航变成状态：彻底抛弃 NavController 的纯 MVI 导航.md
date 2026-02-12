---
title: 当导航变成状态：彻底抛弃 NavController 的纯 MVI 导航
description: 导航不应是一个“控制器”，而应是一个“列表”。作为系列文章的终结篇，本文挑战 Android 开发的传统习惯，展示如何彻底抛弃 NavController，构建一套纯粹的 MVI 导航系统。通过将导航栈直接转化为 Store 中的不可变状态，实现单一数据源、类型安全且完美契合 Compose 生命周期。自此，App 架构将进化为由 State 驱动的纯粹状态机。
tags:
  - "软件架构"
  - "Android"
  - "Jetpack Compose"
  - "MVIKotlin"
  - "Kotlin 协程"
  - "异步编程"
  - "发布订阅"
  - "响应式编程"
auth: misakamayako
slug: "435a921db46b"
pubDate: 2026/01/22
seriesId: 6b16fa2b-5585-4c4d-a8cc-c17a05fd5549
seriesName: "在 Android 中构建可长期演化的 Feature 架构：从模块边界到单向数据流"
seriesOrder: 5
---
这是系列文章的**第五篇**。

在前四篇中，我们构建了一个严格分层、模块隔离、MVI 驱动的架构体系。现在，我们要攻克最后一个堡垒：**导航**。

在传统的 Android 开发中，我们习惯依赖 `NavController` 或 `FragmentManager` 来管理页面。但这带来了一个经典的 **“双重数据源”难题**：UI 框架维护了一套页面栈，而我们的业务 Store 可能也需要感知当前页面状态。当这两者不同步时，Bug 便随之而来。

在本架构的终极形态中，我们将采取一种**纯粹的 MVI 方案**：彻底抛弃 `NavController`，回归数据结构的本质。

---

> **“导航不应该是一个‘控制器’（Controller），导航应该只是一个‘列表’（List）。”**

如果我们将整个 App 视为一个状态机，那么“当前显示什么页面”无非就是 Store 中的一个变量。

在本篇中，我们将展示如何利用 Compose 的声明式特性，构建一个**单一数据源（Single Source of Truth）、类型安全、且完美支持 MVI** 的导航系统。

## 一、 核心回顾：Core 层的契约

无论底层实现多么激进，Core 层的抽象永远是稳定的。这保证了 Feature 模块的零感知。

```kotlin
// core/common/navigation/Screen.kt
// 页面即数据：必须可序列化，不可变
@Serializable
@Immutable
sealed interface Screen

// core/common/navigation/Router.kt
// 动作即接口：Feature 只管调，不管谁实现
interface Router {
    fun navigateTo(screen: Screen)
    fun popBack()
}
```

## 二、 真正的单一数据源：MainStore

在 App 壳工程的顶层 MVI 中，我们直接把“导航栈”变成了状态的一部分。我们不需要复杂的 Graph XML，只需要一个简单的 List。

```kotlin
// app/internal/presentation/mvi/MainStore.kt

// 1. State: 导航栈只是一个 List
data class MainState(
    val backStack: PersistentList<Screen> = persistentListOf(HomeScreen) // 初始页面
)

// 2. Intent: 所有的跳转都是对 List 的增删
sealed interface MainIntent {
    data class PushScreen(val screen: Screen) : MainIntent
    data object BackClicked : MainIntent
}

// 3. Reducer: 纯逻辑处理
override fun MainState.reduce(msg: Message): MainState = when (msg) {
    is Message.Push -> copy(backStack = backStack + msg.screen)
    is Message.Pop -> copy(backStack = backStack.dropLast(1))
}
```

## 三、 胶水层：Router 的“去权”

既然导航只是发 Intent，那么 `Router` 的实现类就变得极度简单。它不再持有任何 Controller，它只是一个 **Intent 发送器**。

```kotlin
// app/internal/navigation/AppRouterImpl.kt
@Stable
internal class AppRouterImpl(
    private val handleIntent: (MainIntent) -> Unit
) : Router {

    override fun navigateTo(screen: Screen) {
        // 跳转 = 发送 Push 意图
        handleIntent(MainIntent.PushScreen(screen))
    }

    override fun popBack() {
        // 返回 = 发送 Back 意图
        handleIntent(MainIntent.BackClicked)
    }
}
```

## 四、 UI 层：构建 NavDisplay

这是整个系统的“渲染引擎”。我们需要一个容器来根据 `List<Screen>` 渲染页面，并处理 ViewModel 的生命周期。

```kotlin
// app/internal/ui/MainScreen.kt

@Composable
fun MainScreen(
    state: MainState, 
    handleIntent: (MainIntent) -> Unit
) {
    // 1. 拦截系统返回键
    // 关键点：物理返回键不再由系统处理，而是触发我们的 Intent
    // 只要栈里不只一页，我们就拦截返回键
    BackHandler(enabled = state.backStack.size > 1) {
        handleIntent(MainIntent.BackClicked)
    }

    // 2. 注入 Router
    val router = remember(handleIntent) { AppRouterImpl(handleIntent) }
    
    CompositionLocalProvider(LocalRouter provides router) {
        Scaffold { innerPadding ->
            // 3. 自定义导航容器 (NavDisplay)
            NavDisplay(
                backStack = state.backStack,
                modifier = Modifier.padding(innerPadding),
                // 关键点：装饰器 (Decorators)
                // 它们负责在没有 NavController 的情况下，
                // 手动维持 ViewModel 和 SaveableState 的存活
                entryDecorators = listOf(
                    rememberSaveableStateHolderNavEntryDecorator(),
                    rememberViewModelStoreNavEntryDecorator()
                ),
                // 4. 路由注册入口
                entryProvider = {
                    // 这里聚合各模块的路由表
                    homeEntryProvider()
                    userEntryProvider() // 见下文详解
                    anotherEntryProvider()
                }
            )
        }
    }
}
```

## 五、 业务层：类型安全的路由注册

在 Feature 模块中，我们如何定义页面和传递参数？
得益于 Kotlin 的泛型和 DSL，我们可以实现**极致的类型安全**。不需要 Bundle，不需要 String Key，参数就是对象本身。

以 `feature:user` 模块为例，我们在 API 层暴露如下的注册扩展函数：

```kotlin
// feature/user/api/UserGraph.kt

fun EntryProviderScope<Screen>.userEntryProvider() {
    // 1. 不带参页面注册
    entry<UserListRoute> {
        // 直接注入 ViewModel
        val kvm = koinViewModel<UserListViewModel>()
        UserListScreenRoot(kvm)
    }

    // 2. 带参页面注册
    // lambda 的参数 params 就是 UserDetail 对象本身，类型自动推断
    entry<UserDetail> { params ->
        Log.d("EntryProviderScope", "in page UserDetail with $params")
        
        // 将参数直接传给 ViewModel
        val kvm = koinViewModel<UserDetailViewModel> {
            parametersOf(params)
        }
        
        UserDetailScreenRoot(kvm)
    }
}
```

**这段代码展示了架构的精髓：**
1.  **直观**：`entry<T>` 明确指出了这个页面对应哪个 Screen 数据类。
2.  **安全**：`params` 是强类型的。你不可能在取 `userId` 时发生类型转换错误，因为它就是一个 Long。
3.  **解耦**：Feature 模块只负责生产 UI 和 ViewModel，不关心这些页面是如何被压栈、如何被动画切换的。

## 六、 进阶：Feature 内部的跳转

在 Feature 内部（例如 `UserListViewModel`），跳转逻辑依然遵循 MVI 的副作用流，且完全无感知底层实现。

```kotlin
// feature/user/internal/presentation/UserListViewModel.kt
fun onItemClick(id: Long) {
    // 发送 Label (副作用)
    publish(UserListLabel.GoToDetail(id))
}

// feature/user/internal/presentation/UserListScreen.kt
val labels = viewModel.labels
LaunchedEffect(Unit) {
    labels.collect { label ->
        when(label) {
            is UserListLabel.GoToDetail -> {
                // 调用 Core 层的 Router 接口
                // 直接传递 UserDetail 对象，参数随对象一起传递
                router.navigateTo(UserDetail(userId = label.id))
            }
        }
    }
}
```

## 七、 全系列总结

至此，我们的 **“可长期演化 Feature 架构”** 构建完成。

通过这五篇文章，我们实现了一个：
1.  **物理隔离**：App / Core / Feature 职责分明，API 与 Internal 严格界定。
2.  **MVI 驱动**：State 是唯一真理，Intent 是唯一驱动力，包括导航。
3.  **纯状态导航**：抛弃了复杂的 `NavController`，让路由栈回归为 Store 中的一个简单 List。
4.  **类型安全**：从 API 定义到路由传参，编译器为你拦截了绝大多数低级错误。

这套 **Compose Based** 架构不再依赖 Android 传统的 `FragmentManager` 或复杂的 `Navigation Graph XML`，而是利用 `Compose` 的声明式特性，将整个 App 变成了一个纯粹、可预测、易测试的状态机。

**(全系列完)**
