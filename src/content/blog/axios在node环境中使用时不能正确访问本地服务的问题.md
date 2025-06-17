---
auth: misakamayako
title: axios在node环境中使用时不能正确访问本地服务的问题
slug: 7631b3f6f737
pubDate: 2023/01/10
description: 本文介绍了在 Node.js 环境中使用 Axios 请求本地服务时可能遇到 ECONNREFUSED ::1:80 错误的原因，并解释了为何需要显式指定 host 来避免请求失败的问题。
tags: [axios,nodejs,本地服务,网络请求,代理,nginx]
---
在nodejs开发中可能需要访问本地的其他服务的接口，但是如果按照前端开发中的惯用写法，很可能会定义成这样:
```javascript
const request = axios({
	baseURL:"/api",
    url:"/path"
})
```
但是这样使用会报`connect ECONNREFUSED ::1:80`错误信息，即使是使用了nginx等将服务代理到默认端口。  
因为axios在最后创建连接时会获取host，而在node环境中会获取到`host=[::1:80]`，这样，如上的请求最后会变成请求`http://[::1:80]/api/path`这样一个实际上不能访问的地址，所以在node环境中，使用axios必须给定host，即使是请求本地的服务。

