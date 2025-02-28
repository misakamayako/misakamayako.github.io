---
layout: ../../layouts/markdownLayout.astro
title: '浏览器端异步流数据资源管理'
auth: misaka maiyako
pubDate: 2022-07-01
description: 该代码实现了一个基于 Promise 的数据源管理类，通过异步操作封装、任务队列和锁机制保证数据访问的线程安全性与稳定性。
tags: [
   "JavaScript",
   "异步编程",
   "Promise",
   "任务队列",
   "锁机制",
   "错误重试",
   "IndexedDB",
   "数据源管理",
   "并发控制",
   "离线缓存"
]
---

## 概述
本文介绍了在JavaScript中常见的异步编程模式，探讨了如何通过Promise、任务队列和本地存储等技术实现高效的大型数据的获取和存储管理。
### 基本思想
1. Promise 和异步操作：
    - Promise对象是JavaScript中用来处理异步操作的一种封装机制，它代表了一个异步操作的最终完成或失败，并且可以将其结果传递给等待的代码块。
    - 异步操作管理：通过Promise对象可以以更加清晰和可维护的方式处理异步操作，避免了传统回调地狱的问题，提高了代码的可读性和可维护性。
2. 任务队列和锁机制：
    - 任务队列用于存储等待执行的任务函数，确保异步任务按照正确的顺序执行。
    - 锁机制用来避免重复执行和并发访问问题，例如在多个地方同时请求同一资源时，通过锁来控制只有一个请求可以进行，避免资源冲突和数据不一致性。
### 实现
```javascript
import localforage from "localforage"; // 使用localforage作为本地存储的解决方案，也可以使用其它你喜欢的模式

class DataSource {
   // 加锁，防止由于多处访问导致并发问题，如果在worker中使用，锁需要换成Atomics操作支持的类型
   #lock = false

   // 初始状态下活跃数据源为null，并且设置为私有属性防止外部直接访问
   #activeDataStore = null

   // 数据加载状态
   #loaded = false

   // 存放任务队列
   #taskQueue = []

   // 通过getter/setter控制数据读写，并且使用structuredClone使各个使用的数据相对独立
   get #dataSource() {
      return structuredClone(this.#activeDataStore)
   }

   set #dataSource(value) {
      this.#activeDataStore = value
   }

   // 公开的获取数据源方法
   get dataSource() {
      if (this.#loaded) {
         // 如果数据已经获取，则直接返回，并且为了结构一致性，以promise形式返回数据
         return Promise.resolve(this.#dataSource)
      }
      // 如果没有数据，创建一个promise并加入任务队列中等待
      let res, rej
      const promise = new Promise((resolve, reject) => (res = resolve, rej = reject))
      this.#taskQueue.push({resolve: res, reject: rej})

      // 如果当前块已被锁定，说明已有任务在执行中，返回promise并等待即可
      if (this.#lock) {
         return promise
      }
      this.#lock = true
      this.#tryLoadData()
      return promise
   }

   #retryCount = 5

   #tryLoadData() {
      try {
         // 先尝试从本地存储获取数据
         localforage.getItem("data").then(localData => {
            if (localData) {
               this.#dataSource = localData
               this.#success()
            } else {
               // 如果本地存储没有数据，从API获取数据
               someApi().then((remoteData) => {
                  localforage.setItem("data", remoteData)
                  this.#dataSource = remoteData
                  this.#success()
               }).catch(error => {
                  this.#retryOrHandleError(error)
               })
            }
         }).catch(e => {
            this.#retryOrHandleError(e)
         })
      } catch (e) {
         this.#retryOrHandleError(e)
      }
   }

   // 成功加载数据后的处理
   #success() {
      while (this.#taskQueue.length > 0) {
         this.#taskQueue.shift().resolve(this.#dataSource)
      }
      // 重置锁定状态和加载状态
      this.#lock = false
      this.#loaded = true
      this.#retryCount = 5
   }

   // 处理错误的逻辑
   #retryOrHandleError(error) {
      if (this.#retryCount > 0) {
         this.#retryCount--
         this.#tryLoadData()
      } else {
         // 如果重试次数用完，依次处理任务队列中的任务，返回错误
         while (this.#taskQueue.length > 0) {
            this.#taskQueue.shift().reject(error)
         }
         // 重置锁定状态和加载状态
         this.#lock = false
         this.#loaded = false
         this.#retryCount = 5
      }
   }
}

// 设置localforage的驱动为INDEXEDDB
localforage.setDriver(localforage.INDEXEDDB)

// 使用单例模式导出，保证数据源的唯一性
export default new DataSource()
```