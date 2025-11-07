---
title: BroadcastChannel API 概述
description: 本文详细介绍了 BroadcastChannel API 的用法、特性、浏览器兼容性及与其他前端通信方式的对比，帮助开发者理解如何在同源多页面环境中高效实现消息广播。
tags: [ BroadcastChannel, 前端通信, Web API ]
auth: misakamayako
slug: 8b40690e60a0
pubDate: 2025/05/20
---


**BroadcastChannel API** 是一项浏览器 Web API，允许同一来源（origin）下的不同浏览上下文（如多个标签页、iframe、`window.open` 打开的窗口，甚至同源的 Worker）之间进行消息广播通信。所有加入同一频道（channel）名称的上下文都能彼此收发消息。

## 创建频道与监听消息

* 使用 `new BroadcastChannel(name)` 创建或加入一个广播频道。其中 `name` 为频道标识，字符串形式。例如：

```javascript
const channel = new BroadcastChannel('my_channel');
```

  只要存在至少一个上下文使用该名称创建频道，底层通道即被打开。
* 在频道对象上，可以用 `onmessage` 或 `addEventListener('message', handler)` 监听消息事件。例如：

```javascript
channel.onmessage = event => {
  console.log('收到消息：', event.data);
};
```

  当其他同名频道调用 `postMessage()` 发送消息时，所有监听该频道的上下文（包括本上下文自身）都会触发 `message` 事件。
* 若要退出频道，调用 `channel.close()`。该方法会“终止与底层频道的连接，从而允许对对象进行垃圾回收”。关闭频道后，当前上下文不再接收该频道的新消息。

## 发送消息

* 向频道广播消息只需调用 `postMessage(data)`：

```javascript
channel.postMessage('这是一条测试消息');
```

  消息可为任意类型的数据（遵循[结构化克隆算法](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)），包括对象、数组、Blob、File、ArrayBuffer 等。发送端无需指定目标，消息会自动发送给所有监听该频道的上下文。
* 接收端通过 `message` 事件对象的 `event.data` 属性获取消息内容，例如：

```javascript
channel.onmessage = event => {
  console.log('接收到：', event.data);
};
```
* **注意**：消息内容通过浏览器内部的结构化克隆算法传输，因此函数、Symbol 等不可克隆类型会被丢弃。发送大型复杂对象会消耗更多资源，可能会影响性能。

## 示例演示

下面给出一个简单示例：假设在两个同源页面（或窗口）中分别运行以下脚本，它们都订阅了频道 `"demo_channel"`。

* **页面 A 脚本：**

```javascript
const bcA = new BroadcastChannel('demo_channel');
bcA.onmessage = e => {
  console.log('页面 A 收到：', e.data);
};
// 页面 A 主动发送消息
bcA.postMessage('你好，页面 B！');
```
* **页面 B 脚本：**

```javascript
const bcB = new BroadcastChannel('demo_channel');
bcB.onmessage = e => {
  console.log('页面 B 收到：', e.data);
};
// 页面 B 发送消息
bcB.postMessage('页面 A，你好！');
```

在这个例子中，页面 A 发送的消息会被页面 B 接收，同样页面 B 的消息会被页面 A 接收。开发者只需保证创建了同名的 `BroadcastChannel` 实例，并设置好 `onmessage` 处理器，即可实现多页间双向通信。

## 兼容性与浏览器支持

BroadcastChannel API 自 Chrome 54、Firefox 38、Opera 41 开始支持。Chrome（及Chromium Edge）、Firefox、Opera 均在其现代版本中支持此 API，而 Safari 在 15.4+（iOS Safari 同版本）开始支持。下表为主要浏览器支持情况参考：

* **Chrome / Chromium Edge**：54 及以上版本支持。
* **Firefox**：38 及以上版本支持。
* **Opera**：41 及以上版本支持。
* **Safari / iOS Safari**：15.4 及以上版本支持。
* **IE、旧版 Safari/Android 浏览器**：不支持。

**使用建议：** 在使用前可通过 `if ('BroadcastChannel' in window)` 进行特性检测。对于不支持的环境，可考虑退回到 `localStorage+storage` 或其他机制方案。

## 限制与注意事项

* **同源限制**：BroadcastChannel 只能在“同源”上下文间通信。具体要求是协议、域名和端口均相同。跨域页面无法通过 BroadcastChannel 直接通信。
* **页面关闭**：调用 `close()` 或页面卸载时，当前上下文会断开频道连接。一旦关闭，当前页就不再接收该频道的后续消息，也不会触发事件。其它页面继续广播时，即使使用`service worker`，已关闭页面无法获得这些消息。
* **性能与消息大小**：广播消息通过结构化克隆传输，支持复杂数据结构。与 `localStorage` 方法不同，BroadcastChannel 不受浏览器的数据大小限制。不过，过大的消息仍会占用较多资源，可能导致通信延迟或失败。根据测试，简单消息的广播延迟一般在 1–2 毫秒左右，性能开销很低。但在高频率或超大消息场景下，仍需谨慎设计以避免性能瓶颈。

## 与其他通信机制的对比

* **BroadcastChannel vs LocalStorage+storage 事件**：传统跨标签页通信常用 `localStorage` 写入 + `storage` 事件监听的方式，但该方法只能发送字符串（需要手动序列化）、存在浏览器限制的存储上限，并且存取是同步操作，有时效率较低。相比之下，BroadcastChannel API 不需要读写磁盘，全程在内存中广播，支持任意可克隆对象，没有大小限制，实时性也更好（无需轮询或频繁 I/O）。
* **BroadcastChannel vs postMessage**：`window.postMessage` 允许跨源通信，但需要持有目标窗口的引用并指定目标 origin，使用较复杂。而 BroadcastChannel 则无需引用目标窗口，只要在各自页面创建同名频道即可，且同源保证了消息安全性，无需额外校验来源。简单场景下，BroadcastChannel 的用法更直接。但如果需要和不同 origin 的页面通信，就只能使用 `postMessage`。
* **BroadcastChannel vs SharedWorker**：SharedWorker 允许多个同源页面共享一个后台脚本实例，适合需要集中状态管理、锁机制或共享 WebSocket 连接的复杂场景。而 BroadcastChannel 是轻量级的广播机制，更适合简单的事件通知或状态同步任务。例如同步 UI 操作或广播通知时用 BroadcastChannel 更简便；而需要在多个页面间维护持久一致状态，SharedWorker 可能更合适。
* **BroadcastChannel vs MessageChannel**：MessageChannel 提供两个端口的一对一通信管道（适用于需要精确控制双向通信的场景），而 BroadcastChannel 是一对多广播模型。如果只在两个窗口间通信，二者皆可选择；但 BroadcastChannel 可自动广播给所有订阅者，使用更简单。

总的来说，BroadcastChannel API 以其使用方便、一对多广播和支持多种数据类型等优点，成为同源多页面实时通信的理想方案。但需注意兼容性和同源限制，在实际开发中合理选择通信方式。
