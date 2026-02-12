---
title: 让 Feature 像第三方库一样被使用：API 与 Internal 的边界设计
description: 如果不允许模块间直接依赖，业务交互该如何进行？本文深度解析 Feature 模块的 API 与 Internal 边界设计。通过物理隔离将“对外的契约”与“内部的脏活”彻底分开。实战演示如何通过领域模型（Domain Model）隔离框架污染，利用接口定义能力，并借助依赖注入实现“面向接口编程”，让业务模块真正像第三方库一样独立且稳健。
tags:
  - "软件架构"
  - "Android"
  - "Kotlin"
  - "JVM"
  - "数据管理"
  - "内存管理"
  - "后端设计"
auth: misakamayako
slug: "ea305ecafca7"
pubDate: 2026/01/11
seriesId: 6b16fa2b-5585-4c4d-a8cc-c17a05fd5549
seriesName: "在 Android 中构建可长期演化的 Feature 架构：从模块边界到单向数据流"
seriesOrder: 3
---
这是系列文章的第三篇。

在前两篇中，我们建立了“Feature 互不依赖”的世界观，并把 `core` 模块变成了纯粹的基础设施。现在，我们要解决最棘手的问题：**如果不允许互相依赖，业务模块之间到底怎么交互？**

比如，`feature:chat`（聊天）模块需要显示用户的头像和昵称，数据肯定在 `feature:user`（用户）模块里。

*   ❌ **错误做法**：Chat 直接依赖 User，调用 `UserDb.dao.getUser()`。
*   ✅ **正确做法**：Chat 依赖 User 的 **API**，User 在 **Internal** 里实现逻辑。

这一篇，我们将把 Feature 模块切开，看看它肚子里的 **API** 和 **Internal** 到底该装什么。

---

> **“Feature 是一个独立发布的产品，而不是一个为了分类文件的文件夹。”**

在传统的 MVVM 架构中，我们习惯按“技术属性”分包：`model`、`view`、`viewmodel`。
但在 Clean Architecture + 多模块架构中，我们必须按“**可见性**”分包。

想象一下你的 `feature:user` 模块是一个**微波炉**。
*   **API (外部可见)**：按钮、显示屏、电源插头。用户（其他模块）只能接触这些。
*   **Internal (外部不可见)**：磁控管、变压器、电路板。用户不需要看，也不允许摸，否则会触电。

## 一、 物理结构：强制性的隔离

为了在物理上强制执行这个规则，你的 Feature 模块文件结构应该长这样：

```text
feature/user/
├── api/                  <-- 【橱窗】其他模块可见
│   ├── model/            <-- 纯净的领域模型
│   ├── UserRepository.kt <-- 接口定义
│   ├── UserGraph.kt      <-- 导航入口
│   └── UserModuleDI.kt   <-- 依赖注入聚合点
└── internal/             <-- 【工厂】对外部隐藏
    ├── data/             <-- 数据库、网络、DTO
    ├── presentation/     <-- MVI、ViewModel、Compose Screen
    └── di/               <-- 内部依赖注入绑定
```

在 Gradle 层面（如果你使用了复合构建或 API 模块分离），其他模块只能 `implementation project(":feature:user:api")`，根本无法访问 `internal` 的代码。

即使在同一个 Gradle 模块内，你也应该利用 Kotlin 的 `internal` 关键字进行严格限制。

## 二、 API 层：真正的“契约”

API 层是该模块对外唯一的承诺。一旦发布，尽量少改。

### 1. Model：是领域语言，不是 DTO
这是初学者最容易混淆的地方。API 里的 `User` 对象，和服务器返回的 JSON，或者数据库里的 Entity，**绝对不能是同一个类**。

**`api/model/User.kt` (领域模型)**
```kotlin
data class User(
    val id: Long,
    val name: String,
    val avatarUrl: String?
)
```
注意：它是纯粹的 Kotlin 类。没有 `@SerializedName` (Gson/Moshi)，没有 `@Entity` (Room)，没有 `@Parcelize` (Android)。它**没有任何框架依赖**。

为什么？因为如果你的 API Model 依赖了 Room 注解，所有使用这个 API 的模块（比如 Chat 模块）都被迫依赖了 Room。这就叫**污染**。

### 2. Repository Interface：定义能力
```kotlin
// api/UserRepository.kt
interface UserRepository {
    suspend fun getUserInfo(id: Long): User?
}
```
这里只定义**接口**。
`feature:chat` 拿到这个接口，就能写代码了：“我要调 `getUserInfo`”。至于你是从 HTTP 拿的，还是从 SQLite 拿的，Chat 模块完全不在乎。

### 3. Navigation：把路由暴露出去
结合上一篇的 `Screen` 接口，我们需要把该模块的入口暴露出来。

```kotlin
// core/navigation/UserRoute.kt
// 定义跳转目标
@Serializable
data class UserDetailScreen(val userId: Long) : UserScreenRoot

// user/api/UserGraph.kt
// 定义导航图构建逻辑 (暴露给 App 壳使用)
fun NavGraphBuilder.userGraph() {
    composable<UserDetailScreen> { ... }
}
```

### 4. DI Module：插头
最后，你需要提供一个 Koin/Hilt 模块，把这些东西打包。

```kotlin
// api/UserModule.kt
val userModule = module {
    // 包含内部的实现，对外只暴露这一个 val
    includes(internalUserModule)
}
```

## 三、 Internal 层：肮脏的现实

API 层像童话一样美好，Internal 层则是现实世界的“下水道”。所有的框架依赖、复杂的逻辑、MVI 状态管理，都封装在这里。

### 1. Data Layer：脏活累活
这里有 `UserEntity` (Room) 和 `UserDto` (Network)。
**必须存在一个 Mapper**，负责把脏数据转化为干净的 API `User` 对象。

```kotlin
// internal/data/mapper/UserMapper.kt
internal fun UserDto.toDomain(): User {
    return User(
        id = this.id,
        name = this.nickname ?: "Unknown", // 处理脏数据
        avatarUrl = this.avatar
    )
}
```

这就是架构的“税”：你需要多写样板代码。但这个税交得值，因为它换来了**隔离性**。哪怕后端把字段名从 `nickname` 改成了 `display_name`，你只需要改 `internal` 里的 Mapper，外面的 `Chat` 模块完全无感知，不用重新编译。

### 2. Implementation：闭环
这里实现 API 接口。

```kotlin
// internal/data/repo/UserRepositoryImpl.kt
internal class UserRepositoryImpl(
    private val api: UserApi,
    private val dao: UserDao
) : UserRepository { // 实现 API 接口
    override suspend fun getUserInfo(id: Long): User? {
        // 缓存策略、网络请求、转换逻辑都在这
        val entity = dao.getUser(id)
        return entity?.toDomain()
    }
}
```

注意 `internal` 关键字。外部没有任何人能 `UserRepositoryImpl()`。它们必须通过依赖注入获取。

### 3. Presentation：UI 是私有的
你可能很惊讶：**UI (Compose Screen) 也是 Internal 的吗？**

是的。
除了极少数通用组件（在 Core 中），业务 UI 都是私有的。
其他模块不需要直接引用 `UserDetailScreen` 的 Composable 函数，它们只需要通过 Router 导航到 `UserDetailScreen` 这个 **Data Class** 即可。

### 4. Domain Layer：业务逻辑的净土

如果你的业务逻辑非常复杂（比如复杂的金融计算、多数据源合并），你可能不希望 `Executor` 直接和 `Repository` 对话。这时，你可以在 `internal` 下再分出一个 `domain` 包。

*   **UseCase**：`GetValidUserUseCase`。它负责编排业务逻辑。
*   **DomainModule**：负责把 UseCase 注入到 Koin 中。

**但在本架构中，UseCase 是完全私有的（Internal）。**
外部模块根本不需要知道你用了 UseCase 还是直接调了 Repo，这是你的内部实现细节。

## 四、 依赖注入：将两者缝合

既然 `UserRepositoryImpl` 是 hidden 的，其他模块怎么拿到它呢？
这就轮到 **App 壳工程** 和 **DI** 出场了。

在 `internal/di/InternalUserModule.kt` 中，我们做绑定：

```kotlin
internal val internalUserDateModule = module {
    // 告诉 Koin：当有人要 UserRepository 时，给他 UserRepositoryImpl
    singleOf(::UserRepositoryImpl) bind UserRepository::class
    // 如果 UserRepository 中有一些不想暴露给其他模块的查询方法
    singleOf(::UserRepositoryImpl) binds arrayOf(
        UserRepository::class,
        InternalUserRepository::class
    )
}
```

当 `app` 模块启动时，它加载了 `userModule`。
当 `feature:chat` 运行时，它向 Koin 伸手要 `get<UserRepository>()`。
Koin 偷偷把 `internal` 里的 `UserRepositoryImpl` 塞给了它。

这就是 **依赖倒置原则 (DIP)** 的终极体现。

## 五、 总结

这一篇是架构的“骨架”。通过严格区分 **API** 和 **Internal**：

1.  **解耦**：Domain Model 不含框架注解，业务逻辑纯净。
2.  **隐藏**：复杂的 MVI、数据库实现对外部不可见，重构内部逻辑零风险。
3.  **协作**：模块间通过 Interface 交互，编译速度快，责任划分清晰。

现在，我们把 Feature 的外观（API）和结构（Internal）都搭好了。
但是，Internal 内部的 UI 逻辑该怎么写？如何让 UI 响应变得可预测？如何避免 ViewModel 膨胀？

下一篇，我们将进入这一套架构的“心脏” —— **MVI 模式**。我们将解释为什么在多模块 + Compose 的世界里，MVVM 已经不够用了。

**下一篇：[《MVI 在真实项目中该怎么落地：State、Intent 与 Effect 的边界》](/blog/24a358bdbf05/)**
