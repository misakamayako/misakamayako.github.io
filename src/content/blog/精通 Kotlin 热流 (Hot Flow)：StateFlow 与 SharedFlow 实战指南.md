---
title: 精通 Kotlin 热流 (Hot Flow)：StateFlow 与 SharedFlow 实战指南
description: 本文是 Kotlin 协程热流 (Hot Flow) 的实用指南。通过清晰的示例，讲解了 StateFlow 和 SharedFlow 如何在 Android/KMP 项目中高效管理 UI 状态和处理一次性事件通知，并介绍了 stateIn/shareIn 这两个关键操作符的最佳用法。
tags: [Kotlin, Kotlin 协程, 响应式编程, 异步编程, 软件架构, 发布订阅, 性能优化]
auth: misakamayako
slug: e5908b6640c6
pubDate: 2025/11/17
---
## 1. 什么是热流？
热流 (Hot Flow) 是 Kotlin 协程 Flow 中的重要概念。用一个生活中的比喻来理解：
> **热流就像直播平台上的直播流视频**
>
> *   **主动播放**：视频一旦创建就会主动播放，无论是否有人订阅。
> *   **共享进度**：每个观众的播放进度都是相同的。A 从第 5 分钟开始看，30 分钟后 B 再开始看，他们看到的画面都是一样的。

简单来说，**热流** 一旦开始发射，就不会因为订阅者的加入或离开而改变自己的“时间线”。通常情况下，它不会等待订阅者，也不会倒带。
此外，与冷流不同的是，`SharedFlow` 与 `StateFlow` 并不会自动产生数据。它们只是承载数据，真正的来源始终是发射它们的生产者（emit）。

----
## 2. 核心特性

1. **主动执行**
    热流一旦创建便开始发射数据，无需等待订阅者的订阅操作。
2. **共享实例**
   多个订阅者共享同一个数据流实例，订阅者接收到的是热流当前的最新数据，不会从头开始重放。
3. **有状态**
    热流通可以保存最新的数据状态（如 `StateFlow` 持有当前状态），方便新订阅者立即获得当前值。
4. **持续发射**
    热流不会因为某个订阅者取消而停止发射数据，通常独立于订阅者生命周期持续运行，除非显式停止。

### 典型代表

* 通过 `SharedFlow` 或者 `StateFlow` 的构建器创建的流。
* 通过 `shareIn` 或者 `stateIn` 将一个冷流转换为热流。


### StateFlow vs. SharedFlow：状态 vs. 事件

如果说热流是“直播”，那么：
* `SharedFlow` 就是直播本身：它持续不断地广播事件。你中途加入，只能看到加入后的新内容（除非配置了 replay 缓存）。它非常适合发送“阅后即焚”的通知，如 `Toast` 或导航事件。
* `StateFlow` 就像是直播间顶部的“当前比分”或“主播状态”公告牌：它永远只显示最新的状态。你任何时候进入直播间，看到的比分都是最新的。新订阅者会立即收到当前值。因此，它天生就是用来管理 UI 状态的。

另外，一个特别的点是：`StateFlow` 本质上是一个配置为 `replay = 1`、`onBufferOverflow = DROP_OLDEST` 且行为特殊的 `SharedFlow`。

---

## 3. 基础示例与分析
```kotlin
fun main(): Unit = runBlocking {
    // 1. 创建一个 MutableSharedFlow
    // 这是一个可变的 SharedFlow，我们可以通过它来发射 (emit) 值。
    // 默认情况下，新订阅者不会收到任何历史值 (replay = 0)。
    val sharedFlow = MutableSharedFlow<Int>()
    // 启动一个协程作为发射器 (Emitter)
    launch {
        println("发射器已启动")
        delay(1L)// 短暂让出CPU，让其他协程有启动和执行的机会
        // 或者使用这个挂起，等待至少有一个订阅者 sharedFlow.subscriptionCount.first { count -> count > 0 }
        for (i in 1..4) {
            println("发射数据: $i")
            sharedFlow.emit(i)
            delay(1000) // 每秒发射一个
        }
        // SharedFlow 不会像普通 Flow 那样因为上游结束而结束。
        // 除非你停止发射它（取消发射器协程），否则它会一直保持活跃。
        cancel()
    }

    // 启动第一个订阅者 (Collector 1)
    launch {
        println("订阅者1 已启动")
        sharedFlow.collect { value ->
            println("--- 订阅者1 收到: $value")
        }
    }

    // 延迟 1.5 秒，让发射器先发射一些数据
    delay(1500)

    // 启动第二个订阅者 (Collector 2)，它会加入得比较晚
    launch {
        println("订阅者2 已启动")
        sharedFlow.collect { value ->
            println("------ 订阅者2 收到: $value")
        }
    }
}
```

### 输出结果
```terminaloutput
发射器已启动
订阅者1 已启动
发射数据: 1
--- 订阅者1 收到: 1
发射数据: 2
--- 订阅者1 收到: 2
订阅者2 已启动
发射数据: 3
--- 订阅者1 收到: 3
------ 订阅者2 收到: 3
发射数据: 4
--- 订阅者1 收到: 4
------ 订阅者2 收到: 4
```

**分析**：
* **订阅者1** 几乎是立即开始订阅的，所以它从第一个值 `1` 开始，收到了所有发射的数据。
* **订阅者2** 在程序启动后 2.5秒 才开始订阅。在这段时间里，数据 1 和 2 已经被发射出去了。
* 因此，订阅者2 错过了 1 和 2，它收到的第一个值是 3，也就是它开始订阅后 sharedFlow 发射的第一个值。
* 从值 3 开始，两个订阅者都会同时收到所有后续的数据（3, 4）。

另外需要说明的是，`MutableSharedFlow` 是一个可高度配置的构造器，使得它可以满足各种常见的应用场景：

1. **replay: Int**：缓存并向新订阅者重放的最新值的数量。默认是 0，即不重放。如果设为 10，新订阅者会立刻收到最近的 10 条消息。StateFlow 就可以看作是 replay = 1 的特殊 SharedFlow。

2. **extraBufferCapacity: Int**：除 `replay` 缓存外，额外提供的缓冲容量。当发射速度快于收集速度时，数据会暂存在这里，避免阻塞发射者。
   
3. onBufferOverflow: BufferOverflow：当缓冲区（replay + extraBufferCapacity）满了之后，如何处理新数据。
   - **SUSPEND (默认)**: 挂起（阻塞）发射者，直到缓冲区有空间。
   - **DROP_OLDEST**: 丢弃缓冲区中最旧的数据，为新数据腾出空间。
   - **DROP_LATEST**: 丢弃最新的数据。

---

### 4. 从冷到热的桥梁：`stateIn` 和 `shareIn`

在实际开发中，我们很少直接创建 `MutableSharedFlow` 或 `MutableStateFlow`。更常见的场景是，我们有一个“冷”的数据源（比如从 Room 数据库查询数据的 `Flow<List<User>>`，或者一次性的网络请求），但我们希望多个订阅者能够高效地共享这份数据，而不是每次订阅都重新触发一次数据库查询或网络请求。

这时，`stateIn` 和 `shareIn` 就派上了用场。它们是转换操作符，可以将任意冷流（Cold Flow）转换为热流（Hot Flow）。

*   **`shareIn`**：将冷流转换为 `SharedFlow`。它非常适合广播事件或需要多个订阅者共享但没有“当前状态”概念的数据。
*   **`stateIn`**：将冷流转换为 `StateFlow`。它在 `shareIn` 的基础上，额外提供了“状态”的特性，即它总是会缓存最新的值。这让它成为 UI 状态管理的完美选择。

这两个操作符的核心在于它们的配置参数，尤其是 `SharingStarted` 策略，它精确地定义了冷流何时启动以及何时停止。

#### `SharingStarted`：热流的生命周期控制器

`SharingStarted` 定义了上游冷流何时开始发射数据，以及在没有订阅者时何时停止。

1.  **`SharingStarted.Eagerly`**
    *   **行为**：立即启动上游冷流，并且永远不会停止。
    *   **场景**：适用于那些必须立即开始并持续运行的数据源，无论是否有 UI 在观察。例如，持续收集传感器数据并写入日志。
    *   **缺点**：如果没有任何订阅者，会浪费资源。

2.  **`SharingStarted.Lazily`**
    *   **行为**：当第一个订阅者出现时启动上游冷流，并且永远不会停止。
    *   **场景**：比 `Eagerly` 稍好，可以延迟启动。但一旦启动，即使所有订阅者都离开了，它也不会停止。
    *   **缺点**：在订阅者来了又走的情况下，同样会浪费资源。

3.  **`SharingStarted.WhileSubscribed(stopTimeoutMillis: Long = 0, replayExpirationMillis: Long = Long.MAX_VALUE)`**
    *   **行为**：当第一个订阅者出现时启动，当最后一个订阅者消失后，等待 `stopTimeoutMillis` 毫秒。如果在这期间没有新的订阅者出现，则停止上游冷流。
    *   **优势**：这是最常用、最高效的策略。它完美地处理了 Android 应用中的屏幕旋转等配置变更。例如，当屏幕旋转时，旧的 UI 实例会取消订阅，新的 UI 实例会重新订阅。如果 `stopTimeoutMillis` 设置为 5000ms（5秒），那么在这 5 秒的配置变更窗口期内，上游冷流（如网络请求）不会被取消和重启，数据得以保留，从而避免了不必要的重复加载，并保证了 UI 的流畅。

**代码示例**
假设我们有一个从网络获取用户列表的冷流：
```kotlin
// 这是一个冷流，每次 collect 都会触发 "Fetching data..."
val userListFlow: Flow<List<String>> = flow {
    println("Fetching data from network...")
    delay(2000) // 模拟网络延迟
    emit(listOf("Alice", "Bob", "Charlie"))
}
```

在 ViewModel 中，我们可以将其转换为一个热的 `StateFlow`：
```kotlin
class MyViewModel(userRepository: UserRepository) : ViewModel() {
    
    // 将冷流转换为一个热的 StateFlow
    val usersState: StateFlow<List<String>> = userRepository.getUsersFlow()
        .stateIn(
            scope = viewModelScope, // 在 ViewModel 的生命周期内运行
            started = SharingStarted.WhileSubscribed(5000), // 智能启停策略
            initialValue = emptyList() // 初始值，在数据返回前 UI 可以显示空列表
        )
}
```
通过这种方式，`getUsersFlow()` 只会在第一个 UI 订阅者出现时被调用一次。后续的所有订阅者（包括屏幕旋转后重建的 UI）都会共享这同一个数据流和它的最新状态。

---

### 5. 跨平台实战：热流的应用

热流，特别是 `StateFlow` 和 `SharedFlow`，是现代响应式编程的核心，在 Android 和 Kotlin Multiplatform (KMP) 项目中扮演着至关重要的角色。

#### **UI 状态管理 (`StateFlow`)**

在 MVVM (Model-View-ViewModel) 架构中，ViewModel 负责准备并管理与 UI 相关的数据。`StateFlow` 是暴露 UI 状态的理想选择。

**场景**: 一个典型的用户资料页面，需要处理加载中、加载成功、加载失败三种状态。

```kotlin
// 1. 定义 UI 状态的密封类
sealed interface UserProfileUiState {
    object Loading : UserProfileUiState
    data class Success(val user: User) : UserProfileUiState
    data class Error(val message: String) : UserProfileUiState
}

// 2. 在 ViewModel 中管理和暴露状态
class UserProfileViewModel(api: UserApi) : ViewModel() {
    // 私有的、可变的 MutableStateFlow，仅在 ViewModel 内部修改
    private val _uiState = MutableStateFlow<UserProfileUiState>(UserProfileUiState.Loading)
    
    // 公开的、不可变的 StateFlow，供 UI 订阅
    val uiState: StateFlow<UserProfileUiState> = _uiState.asStateFlow()

    init {
        fetchUserProfile()
    }

    private fun fetchUserProfile() {
        viewModelScope.launch {
            _uiState.value = UserProfileUiState.Loading
            try {
                val user = api.getUser()
                _uiState.value = UserProfileUiState.Success(user)
            } catch (e: Exception) {
                _uiState.value = UserProfileUiState.Error("Failed to load user")
            }
        }
    }
}
```
**UI 层 (Jetpack Compose)**
```kotlin
@Composable
fun UserProfileScreen(viewModel: UserProfileViewModel) {
    // a. collectAsStateWithLifecycle 自动处理生命周期
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (val state = uiState) {
        is UserProfileUiState.Loading -> ShowLoadingSpinner()
        is UserProfileUiState.Success -> ShowUserProfile(user = state.user)
        is UserProfileUiState.Error -> ShowError(message = state.message)
    }
}
```
**优势**:
*   **单一数据源**: UI 的所有状态都来自 `uiState` 这一个流。
*   **状态保留**: `StateFlow` 会持有最新状态。当屏幕旋转时，新的 UI 会立即收到当前的状态（例如 `Success` 状态），而不会闪烁或显示错误的加载界面。
*   **线程安全**: ViewModel 在后台线程更新状态，UI 在主线程安全地观察变化。

#### **一次性事件通知 (`SharedFlow`)**

有时我们需要从 ViewModel 向 UI 发送一些“阅后即焚”的事件，比如弹出一个 Toast、显示一个 Snackbar 或者导航到新页面。这类事件不应被视为“状态”。如果使用 `StateFlow`，屏幕旋转后 UI 会重新收到旧的事件，导致 Toast 被重复弹出。

`SharedFlow` (通常 `replay = 0`) 是处理这类事件的完美工具。

**场景**: 用户点击“保存”按钮后，ViewModel 保存数据，然后通知 UI 显示“保存成功”的 Snackbar。

```kotlin
// 在 ViewModel 中
class EditProfileViewModel(repository: ProfileRepository) : ViewModel() {
    private val _events = MutableSharedFlow<String>() // replay = 0 by default
    val events: SharedFlow<String> = _events.asSharedFlow()

    fun onSaveClick(newName: String) {
        viewModelScope.launch {
            repository.saveName(newName)
            _events.emit("Profile saved successfully!") // 发射一次性事件
        }
    }
}

// 在 UI 层 (Fragment 或 Composable)
// 使用 LaunchedEffect 保证只在 key 变化或首次组合时执行一次订阅
LaunchedEffect(Unit) {
    viewModel.events.collect { message ->
        // 显示 Snackbar
        scaffoldState.snackbarHostState.showSnackbar(message)
    }
}
```
**优势**:
*   **事件不重放**: 新的订阅者（或屏幕旋转后的 UI）不会收到过去的旧事件。
*   **解耦**: ViewModel 只负责发射事件，不关心谁在监听以及如何处理。
*   **广播机制**: 如果有多个观察者，它们都可以同时收到这个事件。

---

### 6. 结论：如何选择冷流与热流

理解冷流和热流的区别并知道何时使用它们，是编写高效、健壮的 Kotlin 协程代码的关键。

| 特性        | 冷流 (`Flow`)                 | 热流 (`StateFlow` / `SharedFlow`)    |
|:----------|:----------------------------|:-----------------------------------|
| **执行时机**  | 当 `collect` 被调用时才执行。        | 创建后（或根据 `SharingStarted` 策略）就主动执行。 |
| **数据共享**  | 每个 `collect` 都是一次独立的、全新的执行。 | 多个订阅者共享同一个数据流实例。                   |
| **状态**    | 无状态。                        | **有状态**。`StateFlow` 总是持有最新值。       |
| **订阅者关系** | 生产者与消费者是一对一关系。              | 生产者与消费者是一对多关系（广播）。                 |
| **生命周期**  | 与调用 `collect` 的协程绑定。        | 独立于订阅者，与创建它的 `CoroutineScope` 绑定。  |

#### **黄金原则：默认用冷流，需要时才转热流**

1.  **默认使用冷流 (`Flow`)**：
    对于大多数一次性的数据操作，如执行一次网络请求、从数据库读取一次数据或处理文件，冷流是最简单、最安全的选择。它们遵循结构化并发，当消费者的作用域结束时，它们会自动清理资源，不会造成资源泄漏。

2.  **当需要“共享”或“状态”时，才使用热流**：
    只有在以下明确的场景下，才应该考虑将冷流通过 `stateIn` 或 `shareIn` 转换为热流，或者直接使用 `MutableStateFlow`/`MutableSharedFlow`：
    *   **UI 状态管理**：当多个 UI 组件需要观察并响应同一个应用状态时，使用 `StateFlow`。
    *   **昂贵计算的共享**：当一个数据源（如复杂的数据库查询、网络请求）的创建成本很高，并且其结果需要被多个下游消费者共享时，使用 `shareIn` 或 `stateIn` 来避免重复计算。
    *   **事件广播**：当你需要向多个监听器广播一次性事件时（如用户操作通知、推送消息），使用 `SharedFlow`。
    *   **持续的数据源**：当数据源本身就是持续不断的（如 GPS 位置更新、蓝牙设备信号），并且需要被应用的多个部分使用时，热流是自然的选择。

总之，将冷流视为基础构建块，将热流视为一种为实现状态共享和高效广播而生的特殊工具。正确地运用它们，将使你的应用逻辑更加清晰、性能更高。
