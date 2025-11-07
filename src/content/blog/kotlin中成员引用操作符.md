---
title: Kotlin 引用操作符(::)的使用
description: 本文介绍了 Kotlin 中双冒号（::）引用操作符的基本语法和典型用法，包括函数引用、类成员函数引用与伴生对象函数引用等场景，帮助开发者编写更简洁高效的代码。
tags: [Kotlin, 语法特性]
slug: 18b5a9299ef3
auth: misakamayako
pubDate: 2024/08/09
---

在Kotlin中，引用操作符(::)可以将一个方法作为参数传递，从而更加方便地在函数中调用另一个函数。以下是一个基本的例子：

```kotlin
fun test(arg1:String):Int{
    return arg1.toInt()
}

fun main(){
    val list = listOf("1","2","3")
    val list2 = list.map(::test)
}
```

双冒号操作符也可以用于调用类的方法。当使用其他类的方法时，需要提供该类的实例或使用该类的伴生方法，并将其放在双冒号之前。如果是自身的方法，则可以省略“this”。

```kotlin
class A {
    fun plus(value: Int): Int {
        return value + 1
    }

    companion object {
        fun plus3(value: Int): Int {
            return value + 3
        }
    }
}

class B {
    fun plus2(value: Int): Int {
        return value + 2
    }

    fun test() {
        val a = A()
        val list= IntArray(5) { it }
        list.forEach(this::plus2)
        //this可以省略
        list.forEach(::plus2)
        list.forEach(a::plus)

        list.forEach(A::plus3)
    }
}
```

通过使用双冒号操作符，我们可以更加方便地调用其他函数或类的方法，使代码更加简洁和易读。同时，在使用双冒号操作符时，需要注意传递的参数类型和返回值类型，以避免出现不必要的错误。