---
title: 基于Kotlin协程的高效异步文件上传服务设计与实现
description: 本文介绍如何使用Kotlin协程设计一个高效、可靠的异步文件上传服务，解决背压带来的资源瓶颈问题，并详细讲解协程管理、任务状态追踪、安全关闭等关键实现。
tags: [Kotlin,Kotlin 协程, 文件上传, OSS, 异步编程, 后端设计]
slug: 2b6de1fc1e65
auth: misakamayako
pubDate: 2024/07/03
---

## 背景

在传统服务中，当服务器接收到文件上传任务时，会直接在当前线程或新开线程中执行任务，但是如果背压过高，有可能由于服务器带宽和oss上传限制等原因导致每个进程被分配的资源过少导致任务时间过长。  
本文将介绍如何使用Kotlin协程实现一个高效、可靠的文件上传服务
> 背压是指消费速度跟不上产生数据的速度，从而造成数据积压和资源耗尽

## 解决思路
核心思路是构建一个可扩展的异步服务，该服务能统一处理系统中的任务，并且能够安全地启动和关闭。
### 1. 基于协程的异步服务构建  
考虑到上传任务主要消耗在I/O网络操作上，而且OSSClient是线程安全的，因此将上传服务设计为单例模式，并在单一协程中处理任务，以优化资源利用。
### 2. 协程(Coroutine)管理  
服务作为单例运行，需对协程生命周期进行管理，确保任务处理的安全性。因此使用`Dispatchers.IO`+`Job`的组合，控制它的执行和生命周期。
### 3. 任务处理  
当新任务被创建时，会创建一个`CompletableDeferred<~>`对象，用于保存任务执行结构和告知外部任务状态，然后将任务提交到`Channel`中，等待资源空闲之后执行任务。
### 4. 安全关闭资源  
当服务将关闭时，我们期望以提交的任务都能完成并且资源能够被正确释放。因此我们需要手动的处理关闭部分。

## 下面先看一个完整的代码示例
```kotlin
@Service
class OSSService {
   private val logger: Logger = LoggerFactory.getLogger(this::class.java)

   // 应用配置，用于获取AccessKey等敏感信息
   @Autowired
   private lateinit var applicationConfig: ApplicationConfig

   // AES加解密服务，用于处理敏感信息
   @Autowired
   private lateinit var aesEncrypto: AesEncrypto

   // OSS客户端实例
   private lateinit var ossClient: OSS

   // 协程作业和作用域
   private val job = Job()
   private val scope = CoroutineScope(Dispatchers.IO + job)

   // 初始化OSS客户端
   @PostConstruct
   private fun initOSS() {
      val accessKeyId = aesEncrypto.decrypt(applicationConfig.accessKeyId)
      val accessKeySecret = aesEncrypto.decrypt(applicationConfig.accessKeySecret)
      val endpoint = applicationConfig.endpoint
      val config = ClientBuilderConfiguration().apply {
         protocol = Protocol.HTTPS
         userAgent = "aliyun-sdk-kotlin"
      }
      ossClient = OSSClientBuilder().build("https://$endpoint", accessKeyId, accessKeySecret, config)

      // 启动处理请求的协程
      scope.launch {
         processRequests()
      }
   }

   // 创建一个有25大小缓冲区的Channel
   private val requestChannel = Channel<suspend () -> Unit>(capacity = 25)

   // 提交上传任务到Channel中
   private suspend fun submit(request: suspend () -> Unit) {
      requestChannel.send(request)
   }

   // 处理上传请求
   private suspend fun processRequests() {
      for (request in requestChannel) {
         try {
            // oss内部有超时报错机制，这里不需要再加 withTimeout 了
            request()
         } catch (e: Exception) {
            logger.error(e.message)
         }
      }
   }

   // 服务关闭时的资源释放
   @PreDestroy
   private fun closeGracefully() {
      runBlocking {
         logger.info("Shutting down OSSService, waiting for pending tasks to complete.")
         requestChannel.close()
         job.cancelAndJoin()
         ossClient.shutdown()
         logger.info("OSSService shutdown complete.")
      }
   }

   // 上传对象方法，其它的方法请自行实现
   suspend fun putObject(bucketName: String, key: String, input: InputStream): Deferred<PutObjectResult> {
      logger.info("Putting object: $bucketName:$key")
      val result = CompletableDeferred<PutObjectResult>()
      submit {
         try {
            val putResult = ossClient.putObject(bucketName, key, input)
            result.complete(putResult)
         } catch (e: Exception) {
            result.completeExceptionally(e)
            logger.error(e.message)
         }
      }
      return result
   }
}

```

## 关键点分析
### 1. 任务处理机制
- CompletableDeferred：每当有新任务时，创建CompletableDeferred对象来存储执行结果，允许外部监控任务状态。
- Channel机制：任务通过Channel提交，这是一个具有有限缓冲区的通道，用于传递任务执行单元，防止背压问题。
### 2. 资源安全关闭：
- 任务都是基于协程创建，所以使用`runBlocking`阻塞当前线程直到操作完成
- 首先关闭了`requestChannel`，这是一个存放待处理上传请求的通道。关闭通道后，不会再接受新的请求，但已发送到通道中的请求将继续被处理。
- 取消`job`，这是与`CoroutineScope`关联的`Job`实例。`cancel`会尝试取消所有在这个`Job`下运行的协程，而`join`则会阻塞当前线程，直到所有协程完成。这一步确保了所有上传任务被完成或适当地取消。
- 最后关闭OSS客户端，释放了所有与OSS客户端相关的资源，比如网络连接和线程池等。
### 3. 任务状态跟踪：
- 任务状态的跟踪主要通过`CompletableDeferred`对象来实现。`CompletableDeferred`是Kotlin协程库中用于表示异步计算结果的类型，它可以被用来构建异步工作流，支持异步任务的启动、暂停和完成。
- 当一个新任务被创建时，代码中会创建一个`CompletableDeferred`实例，这个实例用于保存任务的执行结果以及告知外部任务的状态。`CompletableDeferred`对象会在任务成功完成时通过`complete`方法来设置结果，如果任务执行过程中遇到异常，则通过`completeExceptionally`方法来记录异常。
### 4. 选择使用Channel而不是BlockingQueue
- 更好的协程支持：Channel是Kotlin协程库的一部分，专为协程设计，能够无缝集成协程的挂起和恢复机制。
使用Channel可以避免将阻塞操作引入协程代码中，从而保持协程的非阻塞特性。
- 简化的API：Channel提供了一组简洁而强大的API，可以轻松实现不同类型的通道，如BufferedChannel、RendezvousChannel等。
Channel的API设计与协程的其他部分一致，使得代码更具一致性和可读性。
- 更好的性能：Channel在设计上针对协程的并发模型进行了优化，通常在协程的高并发场景下表现更好。
Channel通过非阻塞的方式实现生产者-消费者模式，减少了上下文切换和线程切换的开销。
- 灵活性：Channel支持多种类型的通道，如无缓冲通道、缓冲通道、单元素通道等，可以根据需求选择合适的通道类型。
Channel还支持各种关闭和取消操作，使得资源管理和清理变得更加灵活和方便。
- 扩展性：由于Channel是Kotlin协程库的一部分，能够与其他协程特性和库（如Flow、CoroutineScope等）无缝集成，提供更多的扩展性和功能。
