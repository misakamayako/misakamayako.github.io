---
title: 个人 Kotlin Android 项目代码风格规范
description: 基于 Kotlin + Jetpack Compose + Clean Architecture + MVI 的多模块 Android 项目工程规范，适用于长期维护、中大型、模块化 Android 项目。
tags: 
  - Android
  - Kotlin
  - Jetpack Compose
  - 软件架构
  - MVIKotlin
  - 状态管理
  - Kotlin 协程
  - 异步编程
  - 数据库
  - 数据库设计
  - 数据管理
slug: '231307891e30'
auth: misakamayako
pubDate: 2026/05/07
---
# 1. 总体设计原则

## 1.1 核心原则

项目整体遵循以下设计目标：

* 强模块边界
* 强不可变状态
* 强分层
* 可测试
* 可扩展
* 长期维护优先
* 尽量降低 Android Framework 对业务层侵入

---

## 1.2 架构模式

采用：

* Clean Architecture
* MVI（MVIKotlin）
* 多模块 Feature 拆分
* Compose 单向数据流（UDF）

---

# 2. 模块结构规范

## 2.1 Feature 双模块结构

每个功能拆分为：

```text
:feature:<featureName>:api
:feature:<featureName>:internal
```

例如：

```text
:feature:user:api
:feature:user:internal
```

---

## 2.2 API 模块职责

`api` 模块仅暴露：

* 对外数据模型
* Repository 接口
* Navigation API
* 对外 Contract
* 公共常量
* 跨模块通信接口

禁止：

* Room
* Retrofit
* ViewModel
* Compose Screen 实现
* RepositoryImpl
* DI 实现

---

## 2.3 Internal 模块职责

`internal` 模块负责：

* Data
* Domain
* Presentation
* DI
* Store 实现
* 数据源实现
* UI 实现
* 对外暴露 Route Graph

外部模块禁止直接依赖 internal。

---

## 2.4 Internal 模块目录结构

```text
internal/
├── data/
│   ├── local/
│   ├── remote/
│   ├── mapper/
│   ├── repo/
│   └── source/
│
├── domain/
│   ├── usecase/
│   └── repository/
│
├── presentation/            # 如果模块预期只有一个表现层，可以省略下面的二级文件夹
│   ├── list/
│   ├── detail/
│   └── component/
│
├── di/
│
└── common/
```

---

## 2.5 包结构建议

推荐：

```kotlin
feature.user.internal.data.repo
feature.user.internal.presentation.list
```

不推荐：

```kotlin
feature.user.internal.internal.internal
```

---

# 3. 可见性规范

| 修饰符       | 使用范围            |
| --------- | --------------- |
| public    | api 模块对外接口      |
| internal  | internal 模块内部实现 |
| private   | 文件/类内部实现        |
| protected | 仅明确需要继承扩展时使用    |

---

## 3.1 原则

### api 模块默认 public

### internal 模块默认 internal

避免：

```kotlin
public class UserRepositoryImpl
```

---

# 4. 命名规范

---

## 4.1 类型命名

| 类型               | 规则         |
| ---------------- | ---------- |
| 类                | PascalCase |
| 接口               | PascalCase |
| data class       | PascalCase |
| object           | PascalCase |
| enum             | PascalCase |
| sealed interface | PascalCase |

---

## 4.2 函数命名

函数统一使用 **camelCase**

要求：

* 动词开头
* 语义明确
* 避免缩写

推荐：

```kotlin
loadUser()
fetchById()
updateProfile()
```

不推荐：

```kotlin
doData()
handle()
process()
```

---

## 4.3 Boolean 命名
推荐使用主要关注的状态命名

推荐：
```kotlin
isLoading
```
不推荐：
```kotlin
isIdle
```
统一：

```kotlin
isXxx
hasXxx
shouldXxx
canXxx
```

例如：

```kotlin
isLoading
hasPermission
shouldRefresh
```

---

## 4.4 Mapper 命名

统一：

```kotlin
toEntity()
toDomain()
toUiState()
```

禁止：

```kotlin
convert()
map()
transform()
```

---

# 5. 数据模型规范

---

## 5.1 Domain Model

```kotlin
data class User(
    val id: Long = 0,
    val name: String = "",
    val avatar: String? = null,
    val tags: PersistentList<String> = persistentListOf(),
)
```

---

## 5.2 通用约定

### 所有字段必须提供默认值

目的：

* 方便 Preview
* 方便初始化 State
* 降低空状态复杂度

---

### 初始为空时，集合必须默认空集合

推荐：

```kotlin
emptyList()
persistentListOf()
```

禁止：

```kotlin
null
```

---

### 可空必须显式语义化

推荐：

```kotlin
val avatar: String?
```

不推荐：

```kotlin
var avatar = ""
```

---

# 6. Compose Stability 规范

---

## 6.1 State 必须稳定（Stable）

推荐：

```kotlin
@Immutable
data class UiState(
    val items: PersistentList<Item>,
)
```

---

## 6.2 State 内禁止出现

* MutableList
* MutableMap
* Context
* Activity
* Fragment
* NavController
* CoroutineScope
* Flow
* Channel

---

## 6.3 推荐使用不可变集合

统一使用：

```kotlin
kotlinx.collections.immutable
```

推荐：

```kotlin
PersistentList
PersistentMap
```

---

# 7. MVI 规范

---

## 7.1 Store 拆分规范

不推荐 `FeatureFactory.kt` 单文件包含：

* Executor
* Reducer
* Action
* Message
* Bootstrapper
* create()

---

## 7.2 推荐结构

```text
mvi/
├── FeatureStore.kt
├── action/
├── bootstrapper/
├── executor/
├── reducer/
├── message/
└── factory/
```

---

## 7.3 Intent 规范

区分：

* UI Intent
* Internal Action

推荐：

```kotlin
sealed interface UserIntent {

    sealed interface Ui : UserIntent

    sealed interface Internal : UserIntent
}
```

---

## 7.4 Reducer 规范

Reducer：

* 必须纯函数
* 禁止 IO
* 禁止日志
* 禁止协程
* 禁止 Repository 调用

---

## 7.5 Label 规范

Label 仅用于：

* Toast
* Snackbar
* Navigation
* Dialog
* 一次性事件

禁止：

* 保存 UI State
* 持久化业务状态

---

# 8. ViewModel 规范

---

## 8.1 ViewModel 职责

ViewModel 仅负责：

* 生命周期桥接
* Store 生命周期管理
* StateFlow 暴露
* Intent 转发

禁止：

* 业务逻辑
* Repository 调用
* 数据转换

---

## 8.2 推荐基类

```kotlin
abstract class StoreViewModel<S : Store<*, *, *>>(
    protected val store: S,
) : ViewModel() {

    override fun onCleared() {
        store.dispose()
    }
}
```

---

# 9. Compose UI 规范

---

## 9.1 双函数模式

每个页面：

```kotlin
FeatureScreenRoot()
FeatureScreen()
```

---

## 9.2 Root 职责

负责：

* collect state
* collect label
* navigation
* snackbar
* side effect

---

## 9.3 Screen 职责

仅负责：

* UI 渲染
* 事件回调

保证：

* 可 Preview
* 可测试
* 无副作用

---

## 9.4 Composable 拆分原则

以下情况建议拆分为独立 Composable：

- 内部 UI 状态或交互逻辑较复杂但是不需要与 ViewModel 或 MVI 绑定
- 需要在多个页面或模块中复用
- 已形成明确的视觉或业务语义单元
- 参数数量过多，影响可读性
- 存在独立 Preview 价值
- 可以明显提升主 Screen 的可读性

---

# 10. Preview 规范

---

## 10.1 必须覆盖状态

每个页面至少：

* Loading
* Empty
* Error
* Data

---

## 10.2 Preview 数据集中管理

推荐：

```text
preview/
├── PreviewData.kt
└── PreviewProvider.kt
```

---

# 11. 协程与 Flow 规范

---

## 11.1 Dispatcher 禁止硬编码

禁止：

```kotlin
Dispatchers.IO
```

推荐：

```kotlin
withContext(ioDispatcher)
```

---

## 11.2 Flow 使用原则

| 场景    | 类型                 |
| ----- | ------------------ |
| UI 状态 | StateFlow          |
| 单次事件  | SharedFlow / Label |
| 数据库监听 | Flow               |
| 网络请求  | suspend            |

---

## 11.3 UI 收集规范

Compose 必须：

```kotlin
collectAsStateWithLifecycle()
```

---

## 11.4 生命周期收集规范

使用：

```kotlin
repeatOnLifecycle()
```

---

## 11.5 禁止

```kotlin
GlobalScope
```

---

# 12. Room 规范

---

## 12.1 Entity 规范

```kotlin
@Entity(
    tableName = "user",
)
internal data class UserEntity(
    @PrimaryKey
    val id: Long = 0,
)
```

---

## 12.2 枚举禁止 Ordinal

推荐：

```kotlin
enum.name
```

禁止：

```kotlin
enum.ordinal
```

---

## 12.3 Upsert 优先

推荐：

```kotlin
@Upsert
```

避免：

```kotlin
OnConflictStrategy.REPLACE
```

因为：

```text
REPLACE = DELETE + INSERT
```

可能导致：

* ID 变化
* 外键异常
* Trigger 触发

---

## 12.4 DAO 原则

DAO：

* 只负责数据库
* 不写业务逻辑
* 不做 UI 转换

---

# 13. Mapper 规范

---

## 13.1 Mapper 必须单向

允许：

```text
Entity -> Domain
Domain -> Entity
Domain -> UiState
```

禁止：

```text
UiState -> Entity
UiState -> Domain
```

---

## 13.2 Mapper 必须纯函数

禁止：

* Repository 调用
* IO
* 日志
* Context

---

# 14. DI 规范

---

## 14.1 Koin DSL

推荐：

```kotlin
singleOf(::RepositoryImpl)
factoryOf(::UserUseCase)
viewModelOf(::UserViewModel)
```

---

## 14.2 Module 拆分

```text
di/
├── DataModule.kt
├── DomainModule.kt
├── PresentationModule.kt
└── FeatureModule.kt
```

---

# 15. 日志规范

---

## 15.1 禁止直接使用 Log

推荐：

```kotlin
Logger.d(TAG) { "load success: id=$id" }
```

---

## 15.2 日志原则

日志必须：

* 可搜索
* 可过滤
* 避免无意义文本

推荐：

```kotlin
"user load success: id=$id"
```

不推荐：

```kotlin
"success"
```

---

# 16. Kotlin 语言规范

---

## 16.1 优先使用 data object

推荐：

```kotlin
data object Loading
```

---

## 16.2 优先 sealed interface

推荐：

```kotlin
sealed interface Intent
```

而不是：

```kotlin
sealed class Intent
```

---

## 16.3 trailing comma

推荐：

```kotlin
data class Foo(
    val a:Int,
    val b:Int,
    val c:Int,
)
```

---

## 16.4 禁止使用 `!!`

禁止：

```kotlin
value!!
```

---

# 17. 文件组织规范

---

## 17.1 一个文件一个主类型

推荐：

```text
UserRepository.kt
```

---

## 17.2 特殊情况允许聚合

例如：

```text
Models.kt
Extensions.kt
Enums.kt
```

---

# 18. 测试规范

---

## 18.1 Reducer 必须单元测试

因为：

* 纯函数
* 最稳定
* 最容易测试

---

## 18.2 Mapper 必须测试

重点：

* null
* default
* enum fallback

---

## 18.3 Preview 不能替代测试

Preview 仅用于：

* UI 快速验证
* 视觉检查

---

# 19. 推荐工具链

| 类型               | 推荐                             |
|------------------|--------------------------------|
| 格式化              | ktlint                         |
| 静态分析             | detekt                         |
| API 检查           | binary-compatibility-validator |
| Benchmark        | macrobenchmark                 |
| Baseline Profile | baselineprofile                |
| 不可变集合            | kotlinx.collections.immutable  |
| 时间库              | kotlinx-datetime               |

---

# 20. 推荐 Gradle Convention Plugin

建议后期抽离：

```text
build-logic/
```

统一管理：

* Compose
* Kotlin
* KSP
* Room
* Detekt
* Ktlint
* Android Config

避免：

* 模块重复配置
* 版本漂移

---

# 21. 最终目标

本规范目标：

* 保持长期可维护性
* 降低模块耦合
* 降低状态复杂度
* 降低 Compose 重组问题
* 保持架构一致性
* 提高多人协作稳定性
* 降低后期重构成本

