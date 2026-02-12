---
title: Core 模块不是工具箱：Android 架构里的“地基层”该放什么
description: Core 模块的职责不是代码复用，而是制定“物理定律”。本文探讨如何避免 Core 模块演变为 God Module（上帝模块），通过无业务、无内部依赖、高抽象三大戒律，重新定义导航系统、UI 规范与工具类边界。实战演示如何将导航抽象为状态（Screen），实现业务模块与底层框架的彻底解耦。
tags:
  - "软件架构"
  - "Android"
  - "Jetpack Compose"
  - "Kotlin"
  - "性能优化"
  - "后端设计"
  - "JVM"
auth: misakamayako
slug: "45493f6eef9d"
pubDate: 2026/01/07
seriesId: 6b16fa2b-5585-4c4d-a8cc-c17a05fd5549
seriesName: "在 Android 中构建可长期演化的 Feature 架构：从模块边界到单向数据流"
seriesOrder: 2
---
在上一篇中，我们确立了“Feature 互不依赖”的铁律。但问题随之而来：如果 Feature 之间不能沟通，基础设施（如路由、网络、UI 规范）该放在哪里？

很多人的第一反应是：“扔进 `Core` 或者 `Common` 模块里。”
这没错，但怎么“扔”，决定了你的架构是**坚如磐石的地基**，还是**摇摇欲坠的垃圾堆**。

---

> **“Core 模块的目的不是为了代码复用，而是为了制定物理定律。”**

在大多数项目中，`core` 或 `common` 模块最终都会演变成一个 **God Module**（上帝模块）。
这里面塞满了 `StringUtils`、`DateUtils`、网络请求封装、甚至还有莫名其妙的 `UserSession` 管理类。

这种“垃圾堆式”的 Core 模块会导致两个严重后果：
1.  **修改恐惧**：你改了一个字符串格式化方法，结果导致三个完全无关的业务模块崩溃了。
2.  **依赖臃肿**：你想写一个极简的 Feature，结果一引入 `core`，它把 Retrofit、Room、Glide 全带进来了，哪怕你根本不需要数据库。

在 Clean Architecture + Multi-Module 的架构下，我们需要重新定义 Core 的职责。

## 一、 Core 的三大戒律

要防止 Core 腐化，必须遵守三条戒律：

1.  **无业务（Business Free）**：Core 里绝对不能出现 `User`、`Order`、`Product` 这样的词汇。它只能包含计算机科学领域的词汇（如 `Network`、`Database`、`Screen`、`Theme`）。
2.  **无内部依赖（Leaf Node）**：Core 位于架构最底层，它不能依赖项目内的任何其他模块。
3.  **高抽象（Abstracted）**：Core 定义的是 **“How”**（怎么做），而不是 **“What”**（做什么）。

Core 实际上是你为公司定制的一套 **SDK**。就像 Google 提供了 Android SDK，你基于它开发 App；你的 Feature 模块基于你的 Core SDK 开发业务。

## 二、 重新定义导航：Screen 即状态

在传统的 Android 开发中，导航往往意味着 `Intent` 跳转或者 Fragment Transaction，充满了硬编码的字符串（如 `/user/detail?id=123`）。

在本架构中，我们将**导航抽象为状态**。这一步非常关键，它决定了我们后续 MVI 的路由能否走通。

我们在 `core/common/navigation/` 下定义基础规则：

```kotlin
// file: core/common/navigation/Screen.kt

/**
 * 所有页面的基类
 * 1. @Serializable: 支持序列化，为了支持 Nav3 的 Type-Safe 路由，也为了进程被杀后能恢复。
 * 2. @Immutable: 告诉 Compose 这是一个稳定对象，优化重组性能。
 */
@Serializable
@Immutable
sealed interface Screen

/**
 * 标记接口：用于 Feature 内部的导航图根节点
 * 例如 User 模块的所有页面都实现 UserScreenRoot
 */
@Serializable
@Immutable
sealed interface FeatureGraphRoot : Screen
```

**为什么这么设计？**
这种设计把“页面跳转”变成了一个**纯数据结构**问题。
*   我要去用户详情页？不是构造一个 Intent，而是实例化一个 Data Class：`UserDetailScreen(id=100)`。
*   这个对象是不可变的、可序列化的、类型安全的。

这彻底消除了 `Bundle.getString("id")` 带来的类型转换异常风险。在 Core 层，我们只定义“有一个东西叫 Screen”，至于具体有哪些 Screen，那是 Feature 自己的事。

## 三、 Router 必须是接口

既然 Core 不知道具体有哪些页面，那 Feature 如何跳转呢？

通常做法是在 Core 里写一个路由表，但这违背了“无业务”原则。
正确的做法是：**Core 只定义“跳转”这个动作的接口**。

```kotlin
// file: core/common/navigation/Router.kt

interface Router {
    fun navigateTo(screen: Screen)
    fun popBack()
    // ... 其他基础动作
}
```

注意，这里**没有实现**。真正的实现（是使用 Jetpack Navigation，还是 Voyager，还是 Activity 跳转）由 `app` 壳工程决定，并通过 DI 注入给 Feature。

这带来了巨大的好处：**Feature 模块彻底与导航框架解耦**。
你在写业务逻辑时，只知道 `router.navigateTo(screen)`。如果哪天 Google 废弃了 Jetpack Navigation，你只需要重写 `app` 模块里的 Router 实现类，所有 Feature 代码**一行都不用改**。

## 四、 UI 系统：统一的设计语言

Core 的另一个重要职责是承载 **Design System**。

如果 `feature:user` 自己写了一套颜色，`feature:cart` 自己写了一套 Typography，App 看起来就会像缝合怪。

Core 应该包含：
*   **Theme**: `Color`, `Type`, `Shape` 的统一定义。
*   **Components**: 只有**通用**组件能放这里。
    *   ✅ `PrimaryButton`, `LoadingView`, `ErrorStateView`
    *   ❌ `UserAvatarView` (这是业务组件，哪怕复用率高，也不该在 Core)

```kotlin
// file: core/common/ui/theme/Theme.kt
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AppColors,
        typography = AppTypography,
        content = content
    )
}
```

这样，Feature 模块开发 UI 时，只需调用 `AppTheme` 和 `PrimaryButton`，就能自动对齐设计规范。

## 五、 工具类（Utils）的陷阱

Core 里最危险的地方就是 `utils` 包。

**什么能放？**
*   纯计算机逻辑：`DateFormatter`（如果只是格式化时间戳）、`JsonUtils`、`FileUtils`。
*   Kotlin 扩展：`String.isValidEmail()`。

**什么不能放？**
*   业务相关逻辑：`PriceFormatter`。
    *   *陷阱*：刚开始只是加个 `$` 符号。后来要支持不同国家货币，再后来要支持 VIP 价格变色。这属于**业务逻辑**，应该放在 Feature 或特定的 Domain 层，而不是 Core。

## 六、 总结

读完这一篇，你应该对 Core 模块有了新的认知：

1.  **Core 是约束**：它规定了所有 Feature 必须使用 `Screen` 接口定义页面，必须使用 `Router` 接口跳转。
2.  **Core 是地基**：它提供了设计系统和基础工具，确保上层建筑（Feature）风格统一。
3.  **Core 不懂业务**：它不知道用户是谁，不知道商品多少钱。

**现在，地基打好了。**

我们定义了 `Screen` 接口，但具体的 `UserListScreen` 谁来定义？
我们定义了 `Router` 接口，但谁来调用它？

下一篇，我们将进入真正的战场——业务模块。我们将看到如何通过 **API / Internal 分离** 的设计，让 Feature 既能像积木一样被组装，又能保守住自己的秘密。

**下一篇：[《让 Feature 像第三方库一样被使用：API / Internal 的边界设计》](/blog/ea305ecafca7/)**
