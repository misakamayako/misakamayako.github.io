---
title: MVI 在真实项目中该怎么落地：State、Intent 与 Effect 的边界
description: 传统的 MVVM 往往会导致 ViewModel 状态碎片化，而 MVI 则通过“单向数据流”构建起绝对可靠的状态管理逻辑。本文深度探讨 MVI 在 Android 项目中的落地实践：如何定义不可变的 State 唯一真理，如何通过 Bootstrapper 与 Action 区分用户意图与系统驱动，以及如何利用纯函数 Reducer 打造 100% 可测试的业务逻辑。彻底解决 Compose 重组带来的状态同步难题。
tags:
  - "MVIKotlin"
  - "异步编程"
  - "响应式编程"
  - "发布订阅"
  - "事件总线"
  - "Kotlin 协程"
  - "状态管理"
auth: misakamayako
slug: "24a358bdbf05"
pubDate: 2026/01/14
seriesId: 6b16fa2b-5585-4c4d-a8cc-c17a05fd5549
seriesName: "在 Android 中构建可长期演化的 Feature 架构：从模块边界到单向数据流"
seriesOrder: 4
---
这是系列文章的第四篇。

在前三篇中，我们将 Feature 变成了“孤岛”，并用 API 接口强制隔离了物理依赖。现在，我们进入了 Feature 的**内部（Internal）**。

在传统的 MVVM 中，ViewModel 往往是混乱之源：
*   十几个 `MutableLiveData` 或 `MutableStateFlow` 散落在各个角落。
*   `isLoading` 在这个函数里变 `true`，却忘了在那个异常捕获里变 `false`。
*   UI 层直接调用 ViewModel 的方法，逻辑分散在 View 和 VM 之间。

当 Compose 遇到这种混乱时，UI 的 **重组（Recomposition）** 会把你所有的状态同步 bug 放大十倍。

为了解决这个问题，我们需要引入 **MVI (Model-View-Intent)**。但这不只是改个名字，而是要建立一条**绝对单向的数据流水线**。

---

> **“如果不限制数据的流向，你就永远不知道 Bug 是从哪里流出来的。”**

MVI 的核心哲学只有一句话：**状态（State）是唯一的真理，而真理只能通过纯函数来改变。**

我们将一个页面的逻辑拆解为三个核心概念：**State（状态）**、**Intent（意图）**、**Effect/Label（一次性事件）**。

## 一、 State：唯一的真理

在 MVVM 中，你可能有：
```kotlin
// ❌ 传统的 MVVM 噩梦
val isLoading = MutableStateFlow(false)
val userList = MutableStateFlow<List<User>>(emptyList())
val error = MutableStateFlow<String?>(null)
val isEndReached = MutableStateFlow(false)
```
当这四个变量独立变化时，你很难保证它们组合起来是合法的。比如：`isLoading` 是 `true`，但 `error` 也是 `String`，UI 该显示 Loading 还是 Error？

在 MVI 中，我们将它们合并为一个 **不可变（Immutable）** 的数据类：

```kotlin
// ✅ MVI 的做法：单一数据源
@Immutable
data class UserListState(
    val isLoading: Boolean = false,
    val userList: PersistentList<User> = persistentListOf(),
    val errorMessage: String? = null,
    val isEndReached: Boolean = false
)
```
**UI 只需要盯着这一个 State 对象**。无论发生什么，只要拿到 State，UI 就能像画快照一样把它画出来。

## 二、 Intent：用户的“想”

用户点击了按钮，不是调用 `viewModel.loadMore()`，而是发送一个 **Intent（意图）**。
Intent 描述了 **“用户想做什么”**，而不是 **“程序该怎么运行”**。

```kotlin
sealed interface UserListIntent {
    data object LoadMore : UserListIntent
    data class OnUserClick(val userId: Long) : UserListIntent
    data object Refresh : UserListIntent
}
```

UI 层变得极度简单，只负责分发事件：
```kotlin
Button(onClick = { onIntent(UserListIntent.LoadMore) }) { Text("加载更多") }
```

## 三、 The Engine：Store 的内部循环

这是 MVI 最复杂也最精髓的部分。从 Intent 到新的 State，中间经历了什么？
通常我们需要两个组件：**Executor（执行器）** 和 **Reducer（聚合器）**。

### 1. Executor：处理副作用（脏活累活）
Executor 负责处理所有的**不确定性**：网络请求、数据库查询、埋点上报。
它接收 `Intent`，执行异步操作，然后产出 **Message（内部消息）**。

*   **输入**：Intent (LoadMore)
*   **动作**：调用 `UserRepository.getUserList()`（上一篇定义的接口）
*   **输出**：Message (LoadingStarted, DataLoaded, ErrorOccurred)

```kotlin
class ExecutorImpl :
    CoroutineExecutor<Intent, Nothing, State, Message, Label>() {
    override fun executeIntent(intent: Intent) {
        when(intent) {
            is LoadMore -> {
                dispatch(Message.LoadingStarted) // 立即发个消息说开始了
                try {
                    val users = repo.getUsers()
                    dispatch(Message.DataLoaded(users)) // 数据回来了
                } catch (e: Exception) {
                    dispatch(Message.ErrorOccurred(e.message)) // 出错了
                }
            }
        }
    }
}
```

### 2. Reducer：纯函数的艺术
Reducer 是一个**纯函数**。它不查库、不联网，只做数学题。
公式：**Old State + Message = New State**

```kotlin
private object ReducerImpl : Reducer<State,Message> {
    override fun State.reduce(msg: Message): State {
        return when(msg) {
            is Message.LoadingStarted -> copy(isLoading = true)
            is Message.DataLoaded -> copy(
                isLoading = false,
                userList = oldState.userList + msg.users
            )
            is Message.ErrorOccurred -> copy(
                isLoading = false,
                errorMessage = msg.error
            )
        }
    }
}
```

**这一步的价值在于**：因为 Reducer 是纯逻辑，**你可以为它编写 100% 覆盖率的单元测试**，而不需要 Mock 任何网络或数据库。

### 进阶：如何优雅地初始化数据

1.  **在 `ViewModel.init {}` 块里？**
    *   缺点：如果不小心在测试时实例化了 ViewModel，它就开始联网了，导致单元测试很难写。
2.  **在 Compose 的 `LaunchedEffect(Unit)` 里？**
    *   缺点：配置旋转（Configuration Change）导致 Activity 重建时，UI 会重新挂载，请求可能会被再次触发（虽然 ViewModel 还在，但触发逻辑在 UI 层）。

**Bootstrapper (启动器)** 就是为了解决这个问题而生的。

#### 1. 它的位置在哪里？

请看这张升级版的 MVI 流程图：

*   **Intent (意图)**：来自 **UI**（用户点击加载）。
*   **Action (动作)**：来自 **内部**（Bootstrapper 启动、系统事件）。

**Executor（执行器）** 是一个“双插头”组件：它既处理外部来的 `Intent`，也处理内部产生的 `Action`。

```text
       [User Click]                 [System Start]
            ↓                             ↓
        (Intent)                   (Bootstrapper)
            ↓                             ↓
            ╰-----> [Executor] <----------╯
                         ↓
                      (Message)
                         ↓
                     [Reducer]
```

#### 2. 代码如何实现？

让我们回到之前的 `UserListFactory`，补全这块逻辑：

```kotlin
// 1. 定义 Action (内部动作，UI 不可见)
private sealed interface Action {
    data object InitLoad : Action // 初始化加载
}

// 2. 实现 Bootstrapper
private inner class BootstrapperImpl : CoroutineBootstrapper<Action>() {
    override fun invoke() {
        // 当 Store 创建并启动时，自动分发这个 Action
        dispatch(Action.InitLoad)
    }
}

// 3. Executor 处理 Action (和处理 Intent 类似)
private inner class ExecutorImpl : CoroutineExecutor<Intent, Action, State, Message, Label>() {
    
    // 处理 Action (来自 Bootstrapper)
    override fun executeAction(action: Action, getState: () -> State) {
        when (action) {
            Action.InitLoad -> {
                // 复用加载逻辑
                loadData(isRefresh = true)
            }
        }
    }

    // 处理 Intent (来自 UI)
    override fun executeIntent(intent: Intent, getState: () -> State) {
        when (intent) {
            Intent.Refresh -> loadData(isRefresh = true)
            // ...
        }
    }
    
    private fun loadData(isRefresh: Boolean) { ... }
}
```

#### 3. 为什么要区分 Intent 和 Action？

你可能会问：“为什么不直接让 Bootstrapper 发送一个 `UserListIntent.Refresh`？”

这是一个非常好的设计哲学问题：

*   **Intent 是“外部契约”**：它代表**用户**的操作。用户能“点击刷新按钮”，但用户不能“初始化 ViewModel”。
*   **Action 是“内部驱动”**：它代表**系统**的行为。初始化数据、定时器触发、或者来自其他 Service 的回调，这些都是系统行为。

通过区分 `Intent` 和 `Action`，我们实现了：
1.  **语义清晰**：UI 只能发 Intent，系统只能发 Action。
2.  **权限控制**：UI 永远无法伪造一个“内部 Action”。


## 四、 Label / Effect：处理一次性事件

有些事情不是状态。比如“弹出一个 Toast”或者“跳转到详情页”。
如果你把“显示 Toast”放进 `State` 里（比如 `val showToast: Boolean`），你会遇到经典的 **“旋转屏幕后 Toast 又弹一次”** 的 Bug。

在 MVI 中，我们用 **Label (或 Effect)** 来处理这种**一次性事件**。

```kotlin
sealed interface UserListLabel {
    data class NavigateToDetail(val userId: Long) : UserListLabel
    data class ShowToast(val msg: String) : UserListLabel
}
```

Executor 在处理逻辑时，可以同时发射 Label：
```kotlin
// Executor 内部
is OnUserClick -> {
    // 这不是状态变化，这是副作用
    publish(UserListLabel.NavigateToDetail(intent.userId))
}
```

UI 层（Compose）监听这个流，用完即弃：

```kotlin
// Compose UI
LaunchedEffect(Unit) {
    viewModel.labels.collect { label ->
        when(label) {
            is NavigateToDetail -> router.navigateTo(...)
            is ShowToast -> snackbar.show(...)
        }
    }
}
```

## 五、 完整的单向数据流闭环：双触发模型

现在，我们把**用户交互**（Intent）和**系统初始化**（Bootstrapper）结合起来，这才是真实项目中完整的 MVI 心跳图。

Executor 是整个系统的“心脏”，它同时接收两路血液输入：

### 1. 两条输入路径
*   **路径 A (用户驱动)**：UI 按钮点击 $\rightarrow$ **Intent** (如 `LoadMore`) $\rightarrow$ Executor
*   **路径 B (系统驱动)**：Store 创建/生命周期开始 $\rightarrow$ **Bootstrapper** $\rightarrow$ **Action** (如 `InitLoad`) $\rightarrow$ Executor

### 2. 统一处理 (Executor)
无论来自 Intent 还是 Action，Executor 都会统一调用 Repository（API 层接口）执行业务逻辑。
*   *Executor: "我不管你是用户点的，还是自动加载的，反正我就负责去拿数据。"*

### 3. 两条输出路径
*   **路径 C (状态更新)**：Executor $\rightarrow$ **Message** (如 `DataLoaded`) $\rightarrow$ **Reducer** (纯计算) $\rightarrow$ **New State** $\rightarrow$ UI 刷新。
*   **路径 D (一次性事件)**：Executor $\rightarrow$ **Label** (如 `ShowToast`) $\rightarrow$ UI 监听处理 (导航/弹窗)。

**这个闭环的价值在于**：UI 层变得极度**愚蠢**。UI 不知道何时该初始化数据，它只负责两件事：
1.  画出当前的 **State**。
2.  告诉 Store 用户做了什么 (**Intent**)。

剩下的所有逻辑调度，全部被关在了 Store 的黑盒子里。

---
## 六、 The Container：ViewModel 扮演什么角色？

在 MVI 中，ViewModel 的地位被“降级”了。它不再负责业务逻辑，它现在只是一个 **“Store 容器”**。

它的职责只有两件事：
1.  **持有 Store**：保证屏幕旋转时 Store 不死，状态不丢。
2.  **桥接流**：把 Store 的 `State` 转换成 Compose 喜欢的 `StateFlow`。

```kotlin
// 示例代码：极简的 ViewModel
class UserViewModel(private val store: UserStore) : ViewModel() {
    val state = store.stateFlow.stateIn(viewModelScope, ...)
    fun accept(intent: Intent) = store.accept(intent)
    override fun onCleared() = store.dispose()
}
```
-----
## 七、 PresentationModule 中组装

MVI 的组件很多（Executor, Reducer, Bootstrapper），我们不能在 ViewModel 里手动 `new` 它们。我们需要在 DI 模块里完成组装。

```kotlin
val userPresentationModule = module {
    // 1. 提供 Factory (装配 Executor, Reducer)
    factory { UserStoreFactory(storeFactory = get(), repo = get()) }

    // 2. 提供 Store (通过 Factory 创建)
    factory { get<UserStoreFactory>().create() }

    // 3. 提供 ViewModel (注入 Store)
    viewModelOf(::UserViewModel)
    //-----------或者携带路由参数-------------//
    factory<UserDetailStore> {(user:User)->
        UserDetailStoreFactory(
            get(),
            get()
        ).create(id)
    }
    viewModel { (user:User)->
        UserDetailViewModel(store = get<UserDetailStore>{parametersOf(user)})
    }
}
```
这样，ViewModel 彻底干净了，所有的组装逻辑都留在了 DI 层。

---
## 八、 总结：为什么要交“样板代码税”？

MVI 看起来确实比 MVVM 写了更多的代码：你需要定义 `State`、`Intent`、`Action`、`Message`、`Label` 五个密封接口（Sealed Interface）。

很多人会问：“值得吗？”
答案是：**当项目复杂度超过某个临界点时，非常值得。**

1.  **语义的绝对清晰**：
    *   看到 `Intent`，你就知道**用户**能干什么。
    *   看到 `Action`，你就知道**系统**自己在干什么。
    *   看到 `Message`，你就知道**状态**是如何一步步变化的。
    *   这种代码是“自解释”的，新来的同事不需要问你逻辑，看接口定义就懂了。

2.  **调试的上帝视角**：
    *   遇到 Bug？只需要在 `Reducer` 里打个断点，打印出的 `Message` 序列就是完整的“案发现场录像”。
    *   你可以轻易复现任何诡异的并发状态问题，因为 Reducer 是单线程运行的纯函数。

3.  **测试的安乐窝**：
    *   你不需要 Mock 复杂的 Android SDK 或生命周期。
    *   你只需要创建一个 State，喂给 Reducer 一个 Message，断言输出的新 State 是否符合预期。这是单元测试最舒服的形式。

现在，Feature 内部的逻辑（Data + Logic）已经无懈可击了。
但还有一个东西游离在 MVI 之外，那就是**导航**。

在 MVVM 里，导航通常是 Fragment 的跳转；但在我们的架构里，导航其实只是**另一种形式的状态变化**。

如何把 Nav3 (Jetpack Navigation Compose) 也纳入这个优雅的单向数据流？

**下一篇：[《当导航变成状态：把 Nav3、MVI 与 Compose 串成一条单向数据流》](/blog/435a921db46b/)**
