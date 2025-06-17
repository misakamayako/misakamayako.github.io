---
title: Web Worker 类型概览
description: 本文系统梳理了 Web 平台三种主要 Worker 类型——DedicatedWorker、SharedWorker 和 ServiceWorker，详细解析它们的通信机制、作用域、生命周期、浏览器支持及典型应用场景，帮助开发者选择合适的 Worker 类型提升性能与用户体验。
tags: [Web Worker, DedicatedWorker, SharedWorker, ServiceWorker, 多线程, 前端性能, 离线缓存]
slug: 15b29448545c
auth: misakamayako
pubDate: 2025/05/15
---

Web 平台提供三种主要的 Worker 类型：**DedicatedWorker**、**SharedWorker** 和 **ServiceWorker**。
* **Dedicated Worker** 由单个页面创建，仅供该页面使用，可以执行与主线程并发运行的任务。
* **Shared Worker** 则可以被同源的多个页面或 iframe 共享访问；它在所有连接它的上下文间使用同一个Worker实例，通过 `MessagePort` 和 `onconnect` 事件进行通信。
* **Service Worker** 是一种后台独立线程，专门用于网络请求拦截、离线缓存、后台同步、推送等功能；它注册到指定作用域下，可拦截该作用域内页面的网络请求，为 PWA 提供离线支持。
* 三者均不能直接操作 DOM，运行在独立的全局上下文（专用、共享或服务的 GlobalScope），只能通过消息传递或事件与页面交互。

## 通信机制与作用域

* **Dedicated Worker：** 通过 `new Worker(url)` 创建后，主线程与 Worker 通过 `postMessage`/`onmessage` 双向通信。该 Worker 独立于任何其他页面，**仅限创建它的脚本上下文通信**。作用域为创建它的页面自身；其他页面无法直接访问或通信。

* **Shared Worker：** 通过 `new SharedWorker(url)` 创建后，Worker 端使用 `onconnect` 事件捕获连接。每个连接会得到一个 `MessagePort`，页面通过 `port.start()` 开启通信，然后用 `port.postMessage()`/`port.onmessage` 与 Worker 交互。同源的不同页面/窗口/iframe 只要使用相同的脚本 URL，就能 **共享同一个 Worker 实例**。

* **Service Worker：** 通过 `navigator.serviceWorker.register()` 注册，在指定的作用域（默认是其所在目录及子路径）范围内生效。受控页面可以通过 `navigator.serviceWorker.controller` 或者在注册时获取`serviceWorker`实例并使用`sw.postMessage()`/`sw.addEventListener`与 sw 交换消息。Service Worker 还是一个特殊的 Worker，有特殊的全局事件包括 `install`、`activate`、`fetch`、`push` 等，可以拦截受控范围内页面的网络请求并返回自定义响应，从而实现离线缓存、消息推送等功能。

下表对比了三种 Worker 在通信和作用域方面的差异：

| 特性       | DedicatedWorker                                               | SharedWorker                                                                                       | ServiceWorker                                                                                             |
|----------|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **通信机制** | 单页面与 DedicatedWorker 间通过 `postMessage()` 和 `onmessage` 进行双向通信 | 多页面间通过 `MessagePort` 和 `onconnect` 共享同一个实例：每个页面连接到同一个 SharedWorker 实例，通过 `port.postMessage()` 发送消息 | 受控页面与 Service Worker 通过 `postMessage`/`onmessage` 交换消息。同时，Service Worker 可侦听 `fetch`、`push` 等事件，拦截并处理网络请求 |
| **作用域**  | **单一创建者**：仅限创建它的页面/脚本使用，其他页面无法访问                              | **同源共享**：同一源（协议、主机、端口）下的多个页面/iframe/Workers 可共享同一实例                                                | **注册作用域**：注册时可指定 scope，Service Worker 可控制该作用域内所有页面（同一源下的指定路径范围）。                                          |

## 生命周期与内存共享

* **Dedicated Worker 生命周期：** Dedicated Worker 一旦被创建，就与创建它的页面生命周期绑定。通常，当页面关闭或调用 `worker.terminate()` 时，该 Worker 就会终止。每个 Dedicated Worker 拥有独立的全局内存空间，**不同实例之间不共享数据**（除非使用 `SharedArrayBuffer` 等特定机制）。全局变量和缓存只在该线程内可见，页面卸载后即全部清理。

* **Shared Worker 生命周期：** Shared Worker 的生命周期更长。首次创建时启动一个线程实例，只要有任何页面保持对它的引用，它就保持存活。当所有连接该 SharedWorker 的页面都关闭或断开引用后（其“owner”集合为空），Shared Worker 会被垃圾回收结束。由于所有页面共用同一个实例，全局变量在各连接间共享：比如某个页面向 Worker 加载的数据，其它页面也能通过消息获取到。因此 Shared Worker 适合保存可跨页面复用的状态或资源。但也要注意内存管理，如果加载大数据结构，他会对所有连接的页面可见。

* **Service Worker 生命周期：** Service Worker 的生命周期与注册/激活流程相关：先触发 `install` 事件，在安装完成后触发 `activate` 事件。激活后，Service Worker 就可以控制对应作用域内的页面。当没有事件处理任务时，浏览器可能在后台停用或销毁 Service Worker 实例；下次有控制范围内页面请求或事件时，Service Worker 会重新启动。Service Worker 拥有自己的全局作用域（`ServiceWorkerGlobalScope`），多个受控页面共享同一个全局上下文，同样可使用全局变量或 IndexedDB/Cache 存储数据，但这些数据对所有页面可见。由于 Service Worker 可能随时被回收，状态应尽量保存在外部存储（如 Cache、IndexedDB）而非仅依赖内存。

## 浏览器支持情况

不同浏览器对三种 Worker 的支持度存在差异：

* **Dedicated Worker：** 几乎所有现代浏览器都支持。Chrome、Firefox、Safari、Edge 及移动浏览器均能使用 Dedicated Worker（IE 10+ 支持）。

* **Shared Worker：** 桌面浏览器支持不一：Chrome、Firefox、Opera、新版 Edge 等均支持 Shared Worker（Chrome 从早期版本就支持；Firefox 29+ 支持）。但 Safari 历经停滞：Safari 5-6 支持 Shared Worker，而 Safari 6.1-15.6 不支持（从 Safari 16 开始又恢复支持）；iOS Safari 类似，5-6 支持，7-15 不支持，16+ 恢复支持。Android 平台则普遍不支持 Shared Worker（Chrome Android 尚不支持）。IE 系列不支持 SharedWorker。总体来看，目前全球大约半数用户浏览器环境支持 SharedWorker（Can I Use 统计约 45%）。

* **Service Worker：** 支持度非常高。现代 Chrome/Firefox/Edge 在较新版本即支持（Chrome 45+、Firefox 44+、Edge 17+）。Safari 从 11.1 (iOS 11.3) 开始支持 Service Worker。移动端绝大多数浏览器（Android Chrome、Samsung Internet 等）支持 Service Worker，但 IE、Opera Mini 等不支持。总体覆盖率约 95%以上。
* **总结：** **DedicatedWorker** 和 **ServiceWorker** 基本属于成熟标准，浏览器兼容性较好；**SharedWorker** 支持较差，应用前需注意目标用户的浏览器环境。

| 浏览器/平台         | DedicatedWorker 支持 | SharedWorker 支持          | ServiceWorker 支持 |
|----------------|--------------------|--------------------------|------------------|
| Chrome 桌面      | ✅ 支持 (4+)          | ✅ 支持 (4+)                | ✅ 支持 (45+)       |
| Firefox 桌面     | ✅ 支持 (3.5+)        | ✅ 支持 (29+)               | ✅ 支持 (44+)       |
| Safari 桌面      | ✅ 支持 (4+)          | ✅ 支持 (5-6, 16+；6.1-15 ❌) | ✅ 支持 (11.1+)     |
| iOS Safari     | ✅ 支持 (5+)          | ✅ 支持 (5-6, 16+；7-15 ❌)   | ✅ 支持 (11.3+)     |
| Android Chrome | ✅ 支持               | ❌ 不支持                    | ✅ 支持 (45+)       |
| Edge           | ✅ 支持 (12+)         | ✅ 支持 (79+)               | ✅ 支持 (17+)       |
| IE             | ✅ 支持 (10+)         | ❌ 不支持                    | ❌ 不支持            |

## 典型使用场景与案例

* **单页高负载计算（DedicatedWorker）：** 适用于将 CPU 密集型任务从主线程卸载的场景，如图像处理、加密运算、复杂数据计算、受控制的文件下载或 WebAssembly 计算等。Dedicated Worker 只被创建它的脚本使用，每个线程独占资源，适合一个页面需要并发处理多个任务时使用多个 Dedicated Worker。

* **跨标签页通信与数据共享（SharedWorker）：** 当需要同源的多个页面/标签之间共享数据或通信时，可使用 SharedWorker。典型案例如在线协同编辑、多窗口实时聊天、统一通知等。举例：如果用户在后台打开了多个标签页，想用一个 WebSocket 连接来接收服务器推送的数据，就可以让所有标签页连接同一个 SharedWorker，由其维持一个后台轮询或 WebSocket 任务，然后将消息广播到各标签页。MDN 示例中就演示了两个页面通过同一个 SharedWorker 并发执行计算。另一个真实案例是后台事件轮询：在一个管理后台中，登录用户可能开了多个页面标签，每个页面都不必独立轮询服务器，而只需由一个 SharedWorker 统一进行轮询并发送通知。SharedWorker 会在有页面打开时保持活跃，所有页面只会收到一次事件通知，不会重复请求。

* **离线缓存和后台服务（ServiceWorker）：** Service Worker 专门用于提升应用可靠性和性能，如资源预缓存、离线访问、后台同步（Background Sync）、推送通知等。典型场景是 Progressive Web App：ServiceWorker 在安装阶段缓存网页资源，当网络不可用时仍能返回缓存内容；还可以拦截所有网络请求，实现智能缓存策略和离线页面。同时，ServiceWorker 能在无任何页面打开时响应推送消息，或在后台进行定期同步。

## 性能与安全性差异

* **性能：** DedicatedWorker 每创建一个线程实例都要占用额外内存和 CPU，适合并行处理任务，但如果多个页面都创建多个线程，可能资源消耗较高。SharedWorker 则只创建单个线程实例供所有页面复用，节省了多实例的内存开销，但多个页面发送给 SharedWorker 的消息会排队处理（仅有一个线程执行），并发度不如多个 DedicatedWorker。ServiceWorker 因为主要处理网络 I/O 和事件驱动任务，不适合长期执行重计算任务；其启动也需经过安装/激活流程，性能主要体现在缓存命中和快速响应网络请求上。

* **安全性：** Service Worker 要求在 HTTPS（或 localhost）环境下注册运行，以确保安全；而 Dedicated/Shared Worker 在任意同源环境中均可使用，无额外安全限制。此外，Service Worker 拥有拦截和修改网络请求的权限（可访问响应缓存、修改请求头等），权限比普通 Worker 高，因此标准要求其必须在安全上下文运行。SharedWorker 要求所有使用的页面同源，而 DedicatedWorker 也只能由同源脚本创建；因此，无论哪种 Worker，脚本和 Worker 文件都必须遵循同源策略。所有 Worker 都在隔离的线程环境中运行，无法直接操作 DOM，只能通过消息交换共享数据，从而避免了直接跨线程访问页面元素带来的安全风险。ServiceWorker 和 SharedWorker 都可以使用 IndexedDB、Cache 等存储，而这些存储也遵循同源规则，不同 Worker 之间需通过这些 API 或消息显式共享数据。

**总结：** SharedWorker 的优势在于**跨页面共享单个后台线程**，适合需要同步状态或复用连接的应用场景；而 DedicatedWorker 更适用于单页面的并行计算；ServiceWorker 则专注于网络层面（离线、缓存、推送）优化。选择何种 Worker 类型，应根据具体需求的并发模型、作用域以及兼容性来决定。
