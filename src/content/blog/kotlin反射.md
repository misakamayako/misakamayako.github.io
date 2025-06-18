---
title: 通过 Kotlin 反射获取属性注解并进行校验
description: 本文介绍了如何使用 Kotlin 反射机制获取类属性上的自定义注解，并结合实际值进行校验处理，适用于构建统一的注解驱动校验逻辑。
tags: [Kotlin, 反射, 注解]
slug: 3a01f54a22b0
auth: misakamayako
pubDate: 2023/01/04
---
编写代码的过程中可能需要自定义注解，并通过统一的方法来对注解注释的属性进行一些判断或者操作，这时就需要用到反射，和反射相关的操作。
```kotlin
import kotlin.reflect.KProperty1
import kotlin.reflect.full.declaredMemberProperties
import kotlin.reflect.full.findAnnotation


@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class NotBlank(val message: String = "属性为必填项")

class Test(
    @NotBlank val value: String,
)


fun <T : Any> check(value: T) {
    /**
     * kotlin中普通属性用declaredMemberProperties获取，
     * declaredMembers虽然也可以，但是是获取的全量数据，在这个使用场景下没有必要
     **/
    value::class.declaredMemberProperties.forEach {
        /**
         * 先通过KProperty1.findAnnotation判断当前属性有没有指定的注解
         */
        val notBlank = it.findAnnotation<NotBlank>()
        if (notBlank != null) {
            val v = (it as KProperty1<T, Any?>).get(value)
            if (v is String?) {//这个地方可以根据需求换成所需要的类型
                if (v == null || v.length == 0) {
                    throw Error("字段:${it.name}不能为空")
                }
            }
        }
    }
}

fun main() {
    val test1 = Test("1234")
    val test2 = Test("")
    check(test)
    check(test2)//这个会验证失败
}
```
