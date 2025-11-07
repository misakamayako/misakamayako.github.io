---
title: Challenge–Response 身份验证概述
description: 挑战-响应是一种安全的认证协议，通过动态随机挑战和密码学计算验证身份，避免密码在网络中明文传输。服务器生成一次性随机数发送给客户端，客户端使用预共享密钥计算并返回响应，服务器验证响应以完成认证。该机制能有效防止重放攻击，适用于网络认证、API安全等场景，是构建零信任架构的重要基础。
tags: [ 网络安全, 软件架构 ]
auth: misakamayako
slug: f4f6ab28b53d
pubDate: 2025/10/13
---

Challenge–Response（挑战-响应）是一类认证协议，其中验证方（如服务器）向客户端发送一个随机挑战（nonce），客户端必须基于事先共享的秘密（如密码或密钥）计算出正确的响应才能被认证。该过程可分为以下几个步骤：
- **生成挑战**：服务器为每次认证生成一个不可预测的随机值（nonce），并发送给客户端。
- **客户端响应**：客户端使用预共享的秘密（如密码或密钥）和该挑战，运用哈希或签名算法计算响应值。此过程中秘密本身并未直接传输。
- **验证响应**：服务器使用相同的算法和原始挑战值计算预期响应，与客户端提供的响应进行比较。若匹配则认证通过。

挑战-响应机制的**优点**包括：避免直接在网络中发送密码/密钥，利用加密哈希等函数保护凭证，且每次认证使用不同的随机挑战（nonce）来防止重放攻击。部分实现还支持双向验证，即服务器也对客户端发起挑战以增强安全。该方案适用于网络认证协议（如CHAP、SCRAM）和密码学密钥交换等场景，能有效降低被动监听盗取凭证的风险。

## 防重放攻击机制与局限

挑战-响应通过**一次性挑战(nonce)** 防止重放：服务器为每次请求生成新随机值，确保记录到的老对话不可复用。正如业界所指出的，“良好的挑战-响应系统会为每次交互生成新的挑战，并确保之前的挑战不被重用，这样录制到的通信无法拼凑成新的欺诈请求”。因此，即便攻击者拦截了之前的挑战-响应对，也无法用旧响应冒充合法客户端。

不过，挑战-响应防重放也有**局限**：
- **挑战唯一性要求高**：如果服务器错误地重用挑战，或挑战来源可预测，就会被攻击者利用重放旧响应。因此系统必须为每次会话或每笔交易生成全新的随机挑战，并跟踪已使用的挑战。
- **凭证泄露风险**：挑战-响应自身不解决密钥或密码被盗的问题。如果攻击者获得了用户的密码/密钥，就能生成合法响应，系统无法分辨真伪。挑战-响应对凭证泄露无能为力，服务器无法确定提供密码的人是否真的是合法用户；如果冒充者给出了正确的密码，系统也会授予访问权限。
- **需要安全通道**：挑战-响应不对剩余会话数据提供加密或完整性保障，因此通常需要配合HTTPS/TLS使用，防止中间人篡改挑战或响应内容。
- **服务器状态跟踪**：服务器需维护已发出的挑战（如内存缓存或数据库），以验证响应并防止重放，这增加了实现复杂度；同时每次认证需要额外的交互往返。

此外，一些认证方案在挑战-响应基础上加入时间戳或随机数。例如Oracle HMAC方案要求请求头中包含时间戳且与当前时间误差不能超过15分钟，用以防止重放。总之，挑战-响应通过**动态且不可重用的挑战**来防重放，但只有在严格设计和安全实现下才能有效。

## 常见认证方式对比

下表对比了挑战-响应与其他常见API认证方式的基本原理、防重放机制、优缺点等：

| 方法                                | 验证原理及防重放机制                                                                                                      | 优点                                                        | 缺点                                                                |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|-------------------------------------------------------------------|
| **Challenge–Response**<br>（挑战-响应） | 验证服务器为每次请求生成随机挑战，客户端使用预共享密码/密钥对挑战进行哈希/签名后返回响应。由于挑战唯一，旧的挑战/响应无法重用。                                               | - 凭证不明文传输<br>- 动态挑战防止重放<br>- 可支持双向认证                      | - 需服务器保存挑战状态，增加实现复杂度<br>- 若秘密泄露仍然无法防御<br>- 每次认证需额外交互回合            |
| **JWT（JSON Web Token）**           | 认证后服务器发放签名令牌（可包含用户信息），客户端后续请求携带该令牌。重放防御依赖令牌的有效期和（可选的）唯一ID（jti）；否则令牌在有效期内可被重放。如果 JWT 在其有效期内未被撤销，攻击者可以重放该令牌。      | - 无状态，易扩展<br>- 自包含，可携带用户权限等信息                             | - 不能即时撤销（除非维护黑名单）<br>- 令牌泄露或签名弱易被滥用<br>- 有效期内可能被重放（需使用 jti 等机制防范） |
| **OAuth2**                        | 使用标准授权流程生成访问令牌（Bearer Token）。本身无挑战-响应机制，通常在第一步授权服务认证后发放令牌。防重放依赖令牌策略（短期过期、绑定TLS等）。若不使用加强措施（如PKCE），令牌或授权码被窃取后可重用。 | - 广泛标准，支持第三方授权和细粒度权限<br>- 流程灵活，支持多种场景（社交登录、OAuth2.0授权码流等） | - 实现复杂度高，需HTTPS保障<br>- 配置和部署容易出错<br>- 令牌若泄露可能被滥用（需要额外机制防护）        |
| **HMAC 签名认证**                     | 客户端对请求内容（包括时间戳、URI、参数等）使用共享密钥进行 HMAC 签名，服务器验证签名。可在请求中加入时间戳或一次性随机串来防止重放。Oracle示例要求时间戳不超过15分钟，否则拒绝，从而抑制重放。        | - 轻量快速，无需服务端会话<br>- 不直接传输敏感信息，只传签名结果                      | - 需保护共享密钥，一旦泄露风险极高<br>- 时间窗口内可能重放，需要严格时间检查<br>- 缺少标准撤销机制          |
| **Mutual TLS（双向TLS）**             | 客户端持有数字证书，在 TLS 握手阶段进行双向证书交换验证。握手过程中双方使用随机数生成会话密钥，因此每次连接都使用新随机数，可天然防止简单重放。                                      | - 强身份验证（基于证书），无需额外发送密码<br>- 通信全程加密，不易被窃听或篡改               | - 证书管理复杂，需要 PKI 基础设施<br>- 浏览器跨域支持有限，不适合纯公共API（通常用于企业内部服务）         |

## 现代替代方案

近年来出现了更现代化的认证方案，可以在安全性和用户体验上优于传统挑战-响应。例如：

- **OAuth2 + PKCE (Proof Key for Code Exchange)**：这是一种OAuth2授权码流程的增强方案，特别适用于没有客户端密钥（如SPA或移动应用）的场景。PKCE 在授权请求时生成一个随机 `code_verifier`，并发送其哈希（`code_challenge`）。当客户端用授权码换取令牌时必须提供原始的 `code_verifier`；服务器比对其哈希值，以确认授权码未被截获。这样，即使攻击者截获了授权码，也无法换取令牌，因为不知道 `code_verifier`。PKCE 是 OAuth2 的扩展，用于防止授权码拦截攻击，缺少 `code_verifier` 的恶意应用不能用窃取的授权码换取令牌。
- **WebAuthn / FIDO2**：WebAuthn 是W3C和FIDO联盟推出的网络认证标准，可实现密码无关的登录方式。它利用用户设备（如手机、硬件密钥或指纹传感器）生成一对公私钥，公钥注册到服务器。之后登录时，服务器向客户端发送挑战，客户端用私钥签名并返回。由于私钥始终保留在设备上，不会传输，攻击者无法窃取；并且密钥对通常受硬件安全模块保护，极难被破解。WebAuthn 用加密方法取代传统密码，并且**“消除了可能被窃取或钓鱼的共享秘密”**。换句话说，WebAuthn 认证中不存在需要在服务端重复使用或泄露的密码，安全性显著提高。
- **其他方案**：还有一些其他现代技术可视需求采用。例如使用 JWT 的替代品 PASETO（更安全的声明令牌格式）、多因素认证（如一次性密码OTP）、硬件安全模块(HSM)集成、甚至零信任架构下的动态会话密钥等。对于浏览器应用，也可考虑结合 OpenID Connect 来同时获取身份信息和授权，同时配合 PKCE 使用以增加安全性。

综上，WebAuthn、OAuth2+PKCE 等方案在安全性或用户体验上优于传统挑战-响应：前者基于公钥体系摒弃了密码凭证，后者在OAuth流程中加入防窃取措施。根据具体应用场景，选择合适的现代认证方式能进一步抵御钓鱼、凭证重放等威胁。

## 前端示例：Vanilla TypeScript 实现挑战-响应

以下是一个简化的前端流程示例，使用纯 TypeScript 通过 Fetch 调用 API 获取挑战并提交响应（使用 Web Crypto API 进行 SHA-256 和 HMAC 运算）：

```typescript
// 假设用户输入的用户名和密码已获取
const username = "alice";
const password = "用户输入的密码";

// 第一步：向服务器请求挑战
fetch(`https://api.example.com/auth/challenge?username=${encodeURIComponent(username)}`)
  .then(res => res.json())
  .then(async data => {
    const challenge: string = data.challenge; // 服务器返回的随机挑战（如 Base64/Hex 字符串）
    const salt: string = data.salt;         // 服务器返回的用户盐值（可选，用于密码加盐）

    // 生成哈希密码：hash = SHA256(password + salt)
    const enc = new TextEncoder();
    const passBytes = enc.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", passBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 导入哈希作为 HMAC 密钥
    const keyData = enc.encode(hashHex);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );
    // 计算 HMAC = HMAC_SHA256(key=hashHex, message=challenge)
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(challenge));
    const sigArray = Array.from(new Uint8Array(signatureBuffer));
    const responseHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 第二步：提交用户名和响应到服务器
    fetch("https://api.example.com/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, response: responseHex })
    })
    .then(res => res.json())
    .then(result => {
      if (result.authenticated) {
        console.log("认证成功");
        // 处理后续逻辑（如跳转或存储 token）
      } else {
        console.error("认证失败");
      }
    });
  })
  .catch(err => console.error("请求出错:", err));
```

此示例中：客户端先以GET方式根据用户名请求服务器返回挑战(`challenge`)和用户的`salt`（用于加盐密码哈希）。然后使用 Web Crypto API 计算 `password+salt` 的 SHA-256 哈希，并将其作为 HMAC-SHA256 的密钥对挑战进行签名。最后以POST方式提交 `{username, response}` 到服务器，服务器验证签名正确后即认为身份合法。实际应用中应通过 HTTPS 进行通信，并在服务器端为每个用户名维护独立的挑战值。

## 后端示例：Spring Boot + Kotlin 实现挑战-响应

下面是基于 Spring Boot 和 Kotlin 的后端示例，演示如何生成挑战、验证响应并检查用户身份（假设用户信息保存在数据库中）。

```kotlin
// 数据库中的用户实体示例
@Entity
data class User(
    @Id val username: String,
    val passwordHash: String,  // 例如 SHA-256(密码+salt) 的十六进制字符串
    val salt: String
)

// 用户仓库
interface UserRepository : JpaRepository<User, String>

// 请求认证的 JSON 载体
data class AuthRequest(val username: String, val response: String)

@RestController
@CrossOrigin(origins = ["*"])  // 允许跨域请求（实际部署时应限定来源）
class AuthController(val userRepository: UserRepository) {

    // 简单地将用户名映射到当前挑战，实际可用分布式缓存或数据库
    private val challengeMap = ConcurrentHashMap<String, String>()

    // 生成挑战：客户端请求带 username 的 GET /auth/challenge?username=…
    @GetMapping("/auth/challenge")
    fun getChallenge(@RequestParam username: String): Map<String, String> {
        val user = userRepository.findById(username).orElseThrow { 
            RuntimeException("用户不存在") 
        }
        // 生成随机挑战（Hex 形式）
        val challenge = SecureRandom().ints(32, 0, 256)
            .toArray().joinToString("") { it.toUInt().toString(16).padStart(2, '0') }
        // 保存挑战用于后续验证
        challengeMap[username] = challenge
        // 返回挑战和盐值
        return mapOf("challenge" to challenge, "salt" to user.salt)
    }

    // 验证响应：客户端 POST {username, response} 到 /auth/verify
    @PostMapping("/auth/verify")
    fun verifyResponse(@RequestBody req: AuthRequest): Map<String, Any> {
        val user = userRepository.findById(req.username).orElse(null)
            ?: return mapOf("authenticated" to false)
        val challenge = challengeMap.remove(req.username) ?: return mapOf("authenticated" to false)

        // 计算预期响应：使用存储的 passwordHash（hex）作为 HMAC 密钥
        val keyBytes = req.username.substring(0, 0).toByteArray() // 不实际使用username
        // 将十六进制字符串转换为字节数组
        val secretBytes = user.passwordHash.chunked(2)
            .map { it.toInt(16).toByte() }
            .toByteArray()
        val mac = Mac.getInstance("HmacSHA256").apply {
            init(SecretKeySpec(secretBytes, "HmacSHA256"))
        }
        val expectedBytes = mac.doFinal(challenge.toByteArray(Charsets.UTF_8))
        val expectedHex = expectedBytes.joinToString("") { "%02x".format(it) }

        // 比较响应
        val success = expectedHex.equals(req.response, ignoreCase = true)
        return mapOf("authenticated" to success)
    }
}
```

**说明：**
- 用户表中存储了用户名、`passwordHash`（例如 `SHA-256(密码+salt)` 的十六进制）和 `salt`。在生成挑战时，服务器从数据库查出用户的盐值返回给客户端。
- 客户端收到挑战后，按前端示例计算响应。在验证时，服务器取出之前保存的挑战，根据用户存储的 `passwordHash` （视为密钥）和挑战计算 HMAC-SHA256，并将结果与客户端提交的 `response` 比较。
- 如果匹配即认证成功（`authenticated: true`）。注意：服务器在验证后从 `challengeMap` 中移除该挑战，避免重放。实际生产环境还应对挑战设置超时，并保证 HTTPS 通信以防止挑战被中间人篡改或捕获。

以上前后端示例展示了一个基于挑战-响应的认证流程：客户端无需直接发送密码，服务器只要校验响应合法即可确认用户身份。当然，实际系统应进一步结合HTTPS/TLS、JWT Token发放、令牌失效机制等来完善整体安全性。