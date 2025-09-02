---
title: 前端数据压缩与解压缩实践指南
tags: [ 前端开发, 数据压缩, 性能优化 ]
description: 详细介绍前端环境中使用CompressionStream API进行文本数据压缩和解压缩的完整方案，包括适用场景、代码实现、注意事项以及浏览器兼容性要求。
auth: misakamayako
slug: 66edd596bab7
pubDate: 2024/08/26
---
## 1. 适用范围
1. 压缩内容类型：
   - 适用于文本内容文件，如JSON、XML、HTML、CSS、JavaScript等text/*类型的文件。这类文件通常可以通过压缩显著减小体积，从而提升网络传输效率。
   - 对于图片、音频、视频等已经高度优化和压缩的媒体文件，gzip等常见压缩算法通常无法进一步有效压缩，甚至可能导致文件体积增大，因此不建议对这些文件进行压缩。
2. 应用场景：
   - 网络传输：在网络请求或响应中，通过压缩文本文件可以显著减小数据包大小，从而降低网络带宽消耗，缩短传输时间，提升用户体验。
   - 本地存储优化：对于某些需要长期存储的大量文本数据，通过压缩可以有效节省存储空间。
   - 客户端与服务器间的数据交换：在前后端之间传输大量数据时，通过压缩可以加快数据传输速度，尤其是在网络条件不佳或数据量较大时。
3. 技术要求：
   - 浏览器环境：需要较新版本的浏览器支持 CompressionStream 和 DecompressionStream API。以Google Chrome为例，需要80+，具体浏览器支持情况可以在MDN或Can i use 上查找。
   - Node.js 环境：建议使用 Node.js v17 及以上版本，确保对这些新 API 的良好支持。一些早期版本可能需要从`stream/web`包中导入。

## 2.压缩部分代码实现与解释
```typescript
async function gzipFile(file: File):Blob {
    // 创建CompressionStream对象, 使用gizp压缩模式
    const compressionStream = new CompressionStream('gzip');

    // 将文件流通过管道传递到CompressionStream
    const compressedStream = file.stream().pipeThrough(compressionStream);

    // 读取压缩后的数据
    const compressedArray = [];
    const reader = compressedStream.getReader();
    let done:boolean;
    let value:ArrayBuffer;

    // 读取并收集压缩后的数据
    while ({ done, value } = await reader.read(), !done) {
        compressedArray.push(value);
    }

    // 将 ArrayBuffer 合并成一个 Blob 对象，并返回 
    return new Blob(compressedArray, { type: 'application/gzip' });
}
```
## 3. 解压缩代码实现与解释
```typescript
async function unGzipFile(arrayBuffer: ArrayBuffer): string {
    // 创建一个可读流，用于处理输入的ArrayBuffer
    const readableStream = new ReadableStream({
        start(controller) {
            // 将ArrayBuffer转换为Uint8Array并加入流中
            controller.enqueue(
                new Uint8Array(arrayBuffer),
            );
            // 关闭流的输入
            controller.close();
        },
    });

    // 创建一个解压缩流，指定解压缩算法为gzip
    const decompressionStream = new DecompressionStream("gzip");

    // 将可读流通过解压缩流进行解压缩
    const decompressStream = readableStream.pipeThrough(decompressionStream);

    // 创建一个文本解码流，将解压缩后的数据转换为文本
    const textDecoderStream = new TextDecoderStream();

    // 将解压缩后的流通过文本解码流进行解码
    const decodedStream = decompressStream.pipeThrough(textDecoderStream);

    // 获取解码后的流的读取器
    const reader = decodedStream.getReader();

    // 用于存储读取的结果
    let done: boolean;
    let value: string | undefined;
    let result = "";

    // 循环读取流中的数据，直到读取完成
    while ((({ done, value } = await reader.read()), !done)) {
        result += value; // 累加读取到的文本数据
    }

    // 返回解压缩并解码后的字符串结果
    return result;
}
```

## 4. 注意
1. 如果将压缩后的Blob作为文件使用，需要将文件名命名为`xx.<原扩展名>.gz`，例如，`test.xml` 压缩后的文件名应为 `test.xml.gz`，这样可以确保用户以及其它系统能正确识别文件类型和扩展名；
2. 大文件的压缩与解压缩通常耗时较长，应当创建一个worker子线程，将任务移动到子线程执行，不要阻塞主线程，特别是在浏览器环境中，因为UI是运行在主线程的。