---
title: Object.seal 和 Object.freeze 的区别
description: 本文深入讲解 JavaScript 中 Object.seal() 和 Object.freeze() 的使用方式与区别，涵盖属性的可修改性、添加/删除限制，以及它们的浅冻结特性等内容。
tags: [JavaScript, 对象操作, 前端开发]
slug: 33d0f9bc90ea
auth: misakamayako
pubDate: 2024/05/23
---

`Object.seal()` 和 `Object.freeze()` 方法都可以用来限制对象的修改，但它们之间还是有一些区别的。

`Object.seal()` 方法限制对象的修改，使得无法添加新的属性、删除已有的属性或修改属性的特性（如 configurable、enumerable 和 writable）。但是，已有的属性的值可以被修改。如果在严格模式下尝试修改被封闭的对象，则会抛出错误。

例如：

```javascript
const obj = { a: 1, b: 2 };
Object.seal(obj);
obj.a = 3;
delete obj.b;
obj.c = 4;
console.log(obj); // { a: 3, b: 2 }
```

在上面的例子中，`Object.seal(obj)` 限制了 `obj` 对象的修改，但是仍然可以修改已有的属性的值。`delete obj.b` 语句无效，因为无法删除已有的属性。`obj.c = 4` 语句也无效，因为无法添加新的属性。

`Object.freeze()` 方法则更加严格，它可以冻结对象，使得无法添加新的属性、删除已有的属性或修改已有属性的值和特性。如果在严格模式下尝试修改被冻结的对象，则会抛出错误。

例如：

```javascript
const obj = { a: 1, b: 2 };
Object.freeze(obj);
obj.a = 3;
delete obj.b;
obj.c = 4;
console.log(obj); // { a: 1, b: 2 }
```

在上面的例子中，`Object.freeze(obj)` 冻结了 `obj` 对象，使得无法修改已有属性的值或特性，也无法添加新的属性或删除已有的属性。`obj.a = 3` 和 `delete obj.b` 语句都无效，因为无法修改或删除已有的属性。`obj.c = 4` 语句同样也无效，因为无法添加新的属性。

需要注意的是，`Object.seal()` 和 `Object.freeze()` 方法只适用于浅冻结或浅封闭对象。也就是说，如果对象的某个属性是一个对象，那么该属性所对应的对象仍然可以修改。如果要冻结或封闭整个对象，需要对每个属性进行递归操作。

例如：

```javascript
const obj = { a: { b: 1 } };
Object.freeze(obj);
obj.a.b = 2;
console.log(obj); // { a: { b: 2 } }
```

在上面的例子中，`Object.freeze(obj)` 冻结了 `obj` 对象，但是 `obj.a.b` 仍然可以被修改，因为 `obj.a` 对象没有被冻结。

综上，`Object.seal()` 和 `Object.freeze()` 方法都可以用来限制对象的修改，但是它们之间还是有一些区别的。一般来说，如果只需要限制对象的修改，可以使用 `Object.seal()` 方法；如果需要冻结对象，可以使用 `Object.freeze()` 方法。需要注意的是，这两种方法只适用于浅冻结或浅封闭对象，如果要冻结或封闭整个对象，需要对每个属性进行递归操作。
