---
title: Electron 主进程 ECONNRESET 排查：Node 的 fetch 与 net.fetch 到底差在哪
slug: ec9f2a7b4d1e
pubDate: 2026/09/08
description: 记录一次 Electron 桌面客户端登录请求被 ECONNRESET 打断的完整排查过程：如何用对照实验锁定到 TLS 指纹被中间层拦截，以及 Node 内置 fetch 与 Electron net.fetch 在底层网络栈上的本质差异。
tags: [ Electron, Node.js, fetch, TLS, 网络调试 ]
auth: misakamayako
---

## 一、问题现象

一个 Electron 桌面客户端，所有 HTTP 请求都由主进程统一转发（渲染层 → IPC → 主进程 `fetch`）。上线后出现一个诡异问题：

- 客户端每次登录都失败，主进程抛错：

```text
[api:request] POST https://api.example.com/api/auth/login body={"email":"...","password":"..."}
[api:request] error: [TypeError: fetch failed] {
  [cause]: Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20) {
    errno: -4077,
    code: 'ECONNRESET',
    syscall: 'read'
  }
}
```

- 更奇怪的是：**服务端日志里根本没有这条请求**，就好像请求从没到达过应用层。
- 而在浏览器里手动 `fetch('https://api.example.com/api/auth/login', { method: 'POST' })`，服务端立刻就有日志（虽然返回 500，但至少请求到了）。

同一个地址、同一个接口，浏览器通，Electron 主进程不通。问题出在哪？

## 二、架构背景：请求到底从哪发出

很多 Electron 应用的网络请求并不发生在渲染进程里。出于安全（JWT 不暴露给渲染层）和 CORS（后端未开放跨域）的考虑，这类应用会把请求收口到主进程：

```text
React 组件 (渲染进程)
  └─ window.api.request(...)          // preload 暴露的桥接
       └─ ipcRenderer.invoke('api:request', ...)
            └─ 主进程 handler 里 fetch(baseURL + path)   // 真正的 HTTP 在这里
```

关键点在于：主进程里写的 `fetch`，不是浏览器那个 `fetch`，而是 **Node.js 内置的 `fetch`**（底层是 undici）。这为后面的一切埋下了伏笔。

## 三、排查过程：层层排除

### 3.1 加日志，先看清请求

第一件事是给 `api:request` 加上请求/响应日志，确认失败点。日志很快告诉我们：请求在 TLS 层 `read` 阶段被 `ECONNRESET`，也就是**连接被对端用 RST 强行掐断**，而不是超时、拒绝连接或 DNS 解析失败。

### 3.2 排除「服务端挂了」和「网络不通」

- `Test-NetConnection api.example.com -Port 443`：TCP 可达，IP 能解析。
- 用系统 Node 直接写脚本连打 8 次接口：全部成功（401 是正常的未登录响应，说明服务端健康）。
- 再做 16 并发 × 5 轮的压测：80/80 全部成功。

结论：服务器本身没问题，这台机器到服务器的链路也没问题。

### 3.3 排除并发与 IPv6

- 并发压测全过，排除「连接数被服务端限流」。
- `Resolve-DnsName` 只有 A 记录、没有 AAAA，排除 IPv6 优先导致的握手失败。

### 3.4 一个看似合理的假设：空闲连接复用

Node 的 fetch 会复用连接池里的空闲连接。如果某条连接已被服务端在空闲期关闭，客户端再复用这条「死连接」就会在读取时收到 RST。这能解释「偶发」与「服务端无日志」。

于是我给请求加了 `ECONNRESET` 自动重试：

```ts
async function fetchWithRetry(label, url, init, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init)
    } catch (err) {
      if (attempt < retries) await sleep(300 * (attempt + 1))
    }
  }
}
```

结果打脸：**连续 3 次全部 ECONNRESET，一次都没成功**。如果是偶发的死连接，重试理应能建立新连接成功；现在每次都失败，说明问题不是「复用」，而是「这个客户端发起的连接本身就会被拒」。

### 3.5 决定性实验：同进程双栈对照

这是整个排查的关键一步。我把实验搬进 Electron 主进程内部，**在同一时刻、同一进程里，分别用两种 fetch 打同一个接口**：

| 实验环境 | 结果 |
|---|---|
| 系统 Node 24（OpenSSL）直连 | ✅ 全部成功 |
| Electron 主进程 `globalThis.fetch`（Node undici） | ❌ 全部 ECONNRESET |
| Electron 主进程 `net.fetch`（Chromium 网络栈） | ✅ 全部成功 |
| 浏览器 | ✅ 成功 |

同一台机器、同一接口、同一请求体，唯一变量就是「用哪条网络栈」。至此原因已经锁死了。

## 四、锁定原因：两条网络栈，两套 TLS 指纹

Electron 主进程里其实有两个同名但完全不同的 `fetch`：

- `globalThis.fetch` = **Node.js 内置 fetch**（undici），走 Node 自己的 HTTP/TLS 栈；在 Electron 里，Node 的 TLS 底层把 OpenSSL 换成了 **BoringSSL**。
- `net.fetch` = Electron 封装在 **Chromium 网络服务** 之上的 fetch，和渲染层、和 Chrome 浏览器**同一条代码路径**。

TCP 连接建立后、TLS 握手的 `ClientHello` 字节——密码套件顺序、扩展列表、支持的椭圆曲线、ALPN（Node 只协商 http/1.1，Chromium 协商 h2 + http/1.1）、GREASE 值等——合在一起叫 **TLS 指纹（JA3/JA4）**。两条栈发出的指纹长得不一样：

- 服务端（或前面的 WAF/云盾等中间层）**认得 Chromium 风格的握手就放行，认不得 Node 风格的握手就直接 RST**。
- 因此 Node 的请求在握手阶段就被掐断，根本到不了应用层 → 服务端日志一片空白。
- 这也顺带解释了「系统 Node 为什么能通」：系统 Node 用的是 OpenSSL，握手指纹和 Electron 里的 Node（BoringSSL）并不相同，恰好落在被放行的集合里。

一句话总结：**不是 fetch 的 JS 语义不同，而是它们背后发 TCP/TLS 的栈不同，导致握手指纹不同，被前置防护区别对待了。**

## 五、解决方案

### 5.1 切换到 net.fetch

把主进程所有真实请求从全局 `fetch` 换成 Electron 的 `net.fetch`：

```ts
import { app, BrowserWindow, ipcMain, net, safeStorage } from 'electron'

async function fetchWithRetry(label, url, init, retries = 2) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await net.fetch(String(url), init)   // Chromium 网络栈，与浏览器一致
    } catch (err) {
      lastError = err
      const cause = err
      const code = cause.code ?? cause.cause?.code
      console.warn(`[net] ${label} 第 ${attempt + 1} 次失败 (${code ?? 'network error'})`)
      if (attempt < retries) await sleep(300 * (attempt + 1))
    }
  }
  throw lastError
}
```

几个注意点：

- `net.fetch` 的 `input` 只接受 `string` 或 `GlobalRequest`，**不接受 `URL` 对象**，所以 `String(url)` 转一下最稳妥。
- `net.fetch` 必须在 `app.whenReady()` 之后调用；通常请求都发生在窗口建立之后，天然满足。
- 返回的 `Response` 支持 `res.text()` / `res.arrayBuffer()` / `res.headers.get()` 等常规用法，二进制下载照常处理即可。

### 5.2 上传 multipart 的兼容处理

主进程里原来的上传代码用了 Node 的 `FormData` + `Blob`，这两个在 `net.fetch`（Chromium 栈）下的兼容性不确定。干脆绕开，手写 multipart body，服务端 `MultipartFile` 无感知：

```ts
const boundary = `----PromptfolioBoundary${Date.now().toString(16)}`
const head = Buffer.from(
  `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
  'utf-8'
)
const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')
const body = Buffer.concat([head, Buffer.from(file.data), tail])

const res = await fetchWithRetry('api:upload POST /api/images', base + '/api/images', {
  method: 'POST',
  headers: {
    ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  },
  body
})
```

### 5.3 保留重试

`net.fetch` 虽然用的是 Chromium 的连接管理，重试仍然有价值——它守护的是网络层的瞬时抖动（偶发 RST、临时断连），和「换栈」是互补而非重复。

## 六、Node 内置 fetch 与 net.fetch 的差异

| 维度 | `globalThis.fetch`（Node） | `net.fetch`（Electron） |
|---|---|---|
| 网络栈 | Node 的 HTTP/TLS 栈（undici） | Chromium 网络服务 |
| TLS 库 | Electron 下为 BoringSSL | Chromium（也是 BoringSSL，但指纹/配置不同） |
| ALPN | 基本只协商 http/1.1 | h2 + http/1.1，与浏览器一致 |
| 系统代理 | 不认系统代理，直连 | 跟随 session / 系统代理 |
| session / cookies / webRequest | 不参与 | 走 `defaultSession`，可被 `webRequest` 拦截、可用 `ses.fetch` 指定 session |
| 连接复用 | undici 连接池 | Chromium 连接池 |
| 错误语义 | `TypeError: fetch failed` + `cause` 里带底层错误 | 更接近浏览器；连接层问题由 Chromium 内部消化 |
| 适用场景 | 纯 Node 语义的请求 | 需要与渲染层/浏览器行为一致的请求 |

结论很直白：**在 Electron 主进程里，只要不是刻意要用 Node 语义，网络请求一律优先 `net.fetch`。** 它能保证和浏览器一致的代理、证书、session 与 TLS 行为，还能避免「浏览器通、主进程不通」这类最让人抓狂的分裂问题。

## 七、小结与经验

回顾整条排查链，最值得记住的是三点：

1. **先定义清楚「哪个进程在发请求」**。Electron 的请求可能发生在渲染层、主进程、utility process，各自的网络栈完全不同，别想当然。
2. **用对照实验收敛变量，而不是靠猜**。这次最关键的突破，是在同一进程同一时刻并行打两个 `fetch`，一次就把「环境差异」压成了「网络栈差异」。
3. **`ECONNRESET` 出现在 TLS 读取阶段时，优先怀疑握手层面的拦截**（指纹、证书、密码套件），而不是应用层的业务问题——因为服务端没日志这个现象，往往意味着请求根本没走到应用层。
