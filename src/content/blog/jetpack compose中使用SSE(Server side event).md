---
title: Jetpack Compose 中使用 Server-Sent Events（SSE）
description: 本文介绍了如何在 Jetpack Compose 中结合 Retrofit、Flow 与 Streaming 实现服务端事件流（SSE）机制，通过响应式方式实时更新视图，适用于需要流式响应的场景。
tags: [Jetpack Compose, SSE, Retrofit,Kotlin 协程]
auth: misakamayako
slug: 62d9809bf8c2
pubDate: 2024/07/04
---

### 1. 接口定义部分  
使用`retrofit2.http.Streaming`注解，将一个接口的返回数据定义为stream

```kotlin
 import okhttp3.ResponseBody
 import retrofit2.Response
 import retrofit2.http.Body
 import retrofit2.http.POST
 import retrofit2.http.Streaming
 
 interface API {
     @POST("/v1/api/createSomeThing")
     @Streaming
     /// 接口返回值类型定义必须为ResponseBody，而不是内容的类型
     suspend fun createCompletion(@Body formData: FormData): Response<ResponseBody>
 }
 ```

### 2. 接口使用  
因为需求在每次获取到数据时立刻更新视图，所以本次使用了[flow](https://kotlinlang.org/docs/flow.html),
如果没有在每次获取数据时立刻更新视图的需求，可以使用普通的`suspend fun`，并且在`emit`的部分组合你的数据,下面这是一个实现的例子：
```kotlin
// 加载必要的库
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import okio.IOException
import retrofit2.HttpException

// 从服务器端获取Response
fun getResponse(message: Message) = flow {
    coroutineScope {
        try {
            // 创建API实例
            val response = retrofit.create(API::class.java).createCompletion(message)
            if (response.isSuccessful) {
                // 获取请求的输入流
                val input = response.body()?.byteStream()?.bufferedReader() ?: throw Exception()
                try {
                    while (currentCoroutineContext().isActive) {
                        // 从服务器端接收每行数据
                        val line =
                            withContext(Dispatchers.IO) {
                                input.readLine()
                            } ?: continue
                        // 判断是否为空行，若是则跳过
                        if (line.startsWith("data:") && line != "data: [DONE]") {
                            try {
                                // 将每行数据转换为StreamChatCompletion
                                val streamChatCompletion =
                                    Json.decodeFromString<StreamChatCompletion>(
                                        line.substring(5).trim(),
                                    )
                                // 发送数据
                                emit(streamChatCompletion)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        } else if (line == "data: [DONE]") {
                            break
                        }
                    }
                } catch (e: IOException) {
                    throw Exception(e)
                } finally {
                    withContext(Dispatchers.IO) {
                        input.close()
                    }
                }
            } else {
                throw HttpException(response)
            }
        } catch (_: Throwable) {
            ToastService.toast("连接服务器失败")
            throw Error("服务器响应失败")
        }
    }
}
```
### 3. compose中的使用

将下面这个方法作为用户操作的处理函数，比如button的onclick事件中  
```kotlin
fun foo() {
   //在协程中执行以下代码
   scope.launch {
       //将loadingStatus设置为true
       loadingStatus = true
       //将lastMessage设置为userMessage
       val lastMessage = userMessage
       //将ChatMessage添加到messageList中
       messageList.add(
           ChatMessage(
               mutableStateOf(lastMessage), //消息内容为lastMessage
               false,
               System.currentTimeMillis()//消息时间戳为当前时间
           )
       )
       //定义一个名为flag的布尔变量并将其设置为false
       var flag = false
       //将userMessage设置为空字符串
       userMessage = ""
       try {
           val responseMessage = ChatMessage(
               mutableStateOf(""),//消息内容为空字符串
               true,
               System.currentTimeMillis() + 50L//消息时间戳为当前时间加50
           )
           //从ChatMainDataSource中获取的响应
           ChatMainDataSource.getResponse(lastMessage).collect { data ->
               //将的响应添加到responseMessage的消息内容中
               responseMessage.message.setValue(
                   responseMessage,//设置新的值
                   responseMessage::message,//使用的属性
                   (responseMessage.message.value + (data.choices[0].delta.content?:"").trim())//新的消息内容为原始内容与响应的内容的拼接
               )
               //如果flag为false，则将responseMessage添加到messageList中
               if (!flag) {
                   messageList.add(responseMessage)
               }
               //将flag设置为true
               flag = true
           }
       } catch (_: Throwable) {
           //如果出现异常，则将userMessage设置为lastMessage
           userMessage = lastMessage
           //然后将messageList中的最后一个元素移除
           messageList.removeLast()
           //如果flag为true，则再次将messageList中的最后一个元素移除
           if (flag) {
               messageList.removeLast()
           }
       } finally {
           //将loadingStatus设置为false
           loadingStatus = false
       }
   }
}
```
