---
title: 隐写不隐身：为 LSB 加上 HMAC 防篡改与 AES 防窃听
description: LSB 能藏信息却不能保护信息。本文引入 HMAC 数字指纹防篡改，再叠加 AES-256-GCM 加密防窃听，并硬核测算 1080P 图片的容量上限。
tags:
  - "隐写术"
  - "LSB"
  - "信息安全"
  - "加密"
  - "HMAC"
  - "AES"
  - "TypeScript"
auth: misakamayako
slug: "74991bb71075"
pubDate: 2026/05/22
seriesId: deea0ff0-74e0-4377-ad41-75a6c3a58d25
seriesName: "从零到一实现图片隐写术：渐进式 LSB 加密指南"
seriesOrder: 3
---
[上一篇](/blog/bf1ac0404cfc/) 我们完成了 LSB 的工程化实现——把任意 Buffer 编码进 PNG 像素。但现在这个方案有一个危险的漏洞：任何拿到图片的人都能提取数据，而且如果有人在传输途中修改了像素，解码端毫无察觉。

安全性分两个维度：**防篡改（完整性）** 和 **防窃听（机密性）**。LSB 自身两者都不具备，我们需要分两步补齐。

---

## 一、LSB 的盲区：为什么需要自己的"校验码"

LSB 编码后的图片，像素的 LSB 位就是你的秘密数据。这带来两个风险：

**风险一：无认证。** 任何人拿到图片，跑一遍 LSB 解码就能读出数据。虽然没有密钥的情况下可能看不懂（如果是加密数据），但攻击者可以**伪造一份数据编码进另一张图片**，接收方无从分辨真假。

**风险二：无完整性校验。** 传输过程中如果图片被重新保存、被中间设备微调，哪怕只翻转了几个比特，解码端也会傻傻地输出被篡改的结果。

> **隐蔽不等于安全。LSB 解决了"藏"的问题，但没有解决"保"的问题。**

---

## 二、上半场：HMAC 数字指纹

HMAC（Hash-based Message Authentication Code）是一种基于哈希的消息认证码。它的工作方式：

1.  发送方和接收方**预先共享一个密钥**（key）
2.  发送方用 `HMAC(key, 数据)` 生成一个 32 字节的"数字指纹"
3.  接收方用同一个 key 重新计算指纹，比对是否一致
4.  任何人对数据的任何修改，都会导致指纹不匹配

### 数据结构更新

在上一篇的数据结构中，我们在扩展名后面插入 HMAC：

```
┌────────────┬──────────────┬──────────────────┬─────────────────┐
│  4B 总长度  │  10B 扩展名   │  32B HMAC 指纹    │  数据本体       │
│  (uint32)  │  (固定字段)   │  (SHA-256)       │  (任意二进制)    │
└────────────┴──────────────┴──────────────────┴─────────────────┘
```

总长度更新为：`totalLen = 10 + 32 + data.length = 42 + data.length`

### 编码端：签名

```typescript
import { createHmac } from 'crypto';

function buildPayloadWithHMAC(
  data: Buffer,
  ext: string,
  key: Buffer
): Buffer {
  const extBuf = encodeExtension(ext);
  const hmac = createHmac('sha256', key).update(data).digest();
  // hmac.length === 32

  const totalLen = 10 + 32 + data.length;
  const header = Buffer.alloc(4);
  header.writeUInt32BE(totalLen, 0);

  return Buffer.concat([header, extBuf, hmac, data]);
}
```

### 解码端：验证

```typescript
import { timingSafeEqual } from 'crypto';

function extractAndVerify(
  pixels: Buffer,
  key: Buffer
): { ext: string; data: Buffer } | null {
  // ... 提取 LSB 比特，读取长度头和扩展名（同上一篇）...

  const hmac = payloadBuf.subarray(10, 42);        // 32B HMAC
  const data = payloadBuf.subarray(42, 10 + totalLen - 10);

  // 重新计算 HMAC 并比对
  const expected = createHmac('sha256', key).update(data).digest();
  if (!timingSafeEqual(hmac, expected)) {
    console.error('HMAC 验证失败——数据已被篡改！');
    return null; // 拒绝输出
  }

  const ext = decodeExtension(extBuf);
  return { ext, data };
}
```

> **为什么用 `timingSafeEqual` 而不是 `===`？**普通的字符串/字节比对是逐字节短路的一碰到不同就立即返回，攻击者可以通过测量响应时间来逐字节推断正确的 HMAC。`timingSafeEqual` 始终遍历全部字节，耗时恒定，杜绝了时序侧信道攻击。

---

## 三、下半场：AES 加密

HMAC 保证了数据完整性，但数据本身仍然以明文形式存储在像素 LSB 中。任何拿到图片的人都可以提取出原始字节。

如果数据本身就是加密的，那即使被提取，攻击者看到的也只是一段随机噪声——他既不知道里面是什么，也不知道这段"噪声"其实是一段经过精心编码的有效数据。

### Chi-square 统计检测

这里有一个容易被忽视的点：**明文数据的 LSB 分布不符合随机分布**。自然图片的 LSB 位经过 DCT 等处理后呈现特定的统计特征，而你将明文数据写入 LSB 后，这些位置变成了"纯人造数据"，LSB 的 0/1 分布会偏离正常的 50% 随机分布。

**Chi-square（卡方）检测**可以统计 LSB 的 0/1 分布偏差，从而判断一张图片是否"被动过手脚"。

对这个问题的对策很直接：**先把数据加密成随机噪声，再写入 LSB。** 密文的 0/1 分布近似均匀随机，与自然图片的 LSB 噪声特征一致，Chi-square 检测无从下手。

### 为什么选 AES-256-GCM

| 特性 | AES-256-GCM               |
|---|---------------------------|
| 机密性 | AES-256 加密，暴力破解几乎不可能完成    |
| 完整性 | GCM 模式自带认证标签，可验证密文未被篡改    |
| 性能 | 硬件加速（AES-NI）支持，加密速度接近内存复制 |
| 无填充 | GCM 是流模式，明文和密文长度一致        |

### 破除焦虑：AES 加密后数据会变大多少？

很多人担心加密后数据膨胀，图片的 LSB 容量不够。我们来精确算这笔账。

AES-256-GCM 的体积膨胀来自两项固定开销：

- **IV（初始化向量）**：12 字节。GCM 模式每次加密需要唯一的 nonce，作为解密参数必须随密文传输。
- **Auth Tag（认证标签）**：16 字节。GCM 模式在加密完成后生成的完整性校验值。

**总计：固定 28 字节。** 明文 1KB，密文 ≈ 1KB + 28B。明文 1MB，密文 ≈ 1MB + 28B。开销是固定的，与数据大小无关，体积膨胀率随数据增大而趋近于零。

> **GCM 是流密码模式，不需要块对齐填充。** 如果你的直觉来自 AES-CBC 的 PKCS7 填充（最多 15 字节），GCM 没有这个问题——输入多少字节，输出多少字节。

### 最终数据结构（Encrypt-then-MAC）

采用业界推荐的 Encrypt-then-MAC 模式：先加密，再对密文计算 HMAC。

```
┌──────────┬──────────┬────────────────────┬──────────────┐
│ 4B 总长度 │ 10B 扩展名 │  AES-256-GCM 密文   │ 32B HMAC(密文)│
│          │          │  (IV + 数据 + Tag)  │              │
└──────────┴──────────┴────────────────────┴──────────────┘
```

为什么 HMAC 在最后？因为 HMAC 计算的是密文——接收方先验证密文完整性，再解密。如果 HMAC 在前面，你就得先读完所有密文才能回头验证，这在流式处理中不友好。

```typescript
import { createCipheriv, createHmac, randomBytes } from 'crypto';

function buildSecurePayload(
  data: Buffer,
  ext: string,
  aesKey: Buffer,
  hmacKey: Buffer
): Buffer {
  const extBuf = encodeExtension(ext);

  // 1. AES-256-GCM 加密
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // 密文 = IV + 加密数据 + Auth Tag
  const ciphertext = Buffer.concat([iv, encrypted, authTag]);

  // 2. HMAC(密文)
  const hmac = createHmac('sha256', hmacKey).update(ciphertext).digest();

  // 3. 组装
  const totalLen = 10 + ciphertext.length + 32;
  const header = Buffer.alloc(4);
  header.writeUInt32BE(totalLen, 0);

  return Buffer.concat([header, extBuf, ciphertext, hmac]);
}
```

解密端流程正好相反：读总长度 → 读扩展名 → 分离密文和 HMAC → 验证 HMAC → AES 解密 → 按扩展名还原输出。

---

## 四、硬核算账：1080P 图片能塞多少东西

现在我们有了完整的安全数据包结构，反过来算一笔账：一张普通 1920×1080 的 PNG 图片，LSB 容量到底有多大？

### 容量计算

```
像素总数 = 1920 × 1080 = 2,073,600 像素
每像素 3 通道 (RGB)，每通道 1 个 LSB 位
LSB 总比特数 = 2,073,600 × 3 = 6,220,800 bit
LSB 总字节数 = 6,220,800 ÷ 8 = 777,600 字节 ≈ 759 KB
```

### 协议开销

```
长度头:     4 字节
扩展名:    10 字节
AES IV:    12 字节
AES Tag:   16 字节
HMAC:      32 字节
───────────────────
总开销:    74 字节
```

74 字节——四舍五入等于没有。

### 能放什么？

```
可用容量 ≈ 777,600 - 74 ≈ 777,526 字节 ≈ 759 KB

✅ 一本 25 万字中文小说
   (250,000 字 × UTF-8 每字 3 字节 = 750,000 字节)

✅ 一份完整的 PDF 合同
   (200 KB ~ 500KB)

✅ 一张中等清晰度的 JPEG 缩略图
   (30 KB ~ 80 KB)
   
✅ 一个 700KB 的 ZIP 压缩包

```

> **一张你在社交平台上随手发的 1080P PNG 截图，其 LSB 层可以神不知鬼不觉地携带一整本长篇小说。**

---

## 下一篇

现在我们的方案同时具备**隐蔽性（LSB）+ 完整性（HMAC）+ 机密性（AES）**，看似完美了。但是——

如果你通过微信把这张图片发给朋友，会发生什么？微信会自动把 PNG 转成 WebP，而在转码的一瞬间，所有 LSB 数据灰飞烟灭。

下一篇，也就是本系列的终章，我们来聊聊 LSB 的现实局限性，以及更高阶的对抗方向：[《隐写术的边界：LSB 的局限性与未来演进方向》](/blog/ae6f1b934fe0/)
