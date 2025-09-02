---
auth: misakamayako
title: JDK 22 FFM API 与传统 JNI 的对比
slug: 88fe8af400de
pubDate: 2025/08/01
description: 本文全面对比了 JDK 22 引入的 Foreign Function & Memory API（FFM API）与传统 Java Native Interface（JNI）在架构设计、性能、安全性、可维护性、跨平台兼容性等方面的异同与优劣。并深入探讨了 C/C++ 代码在两种调用方式下是否需要不同实现，以及在实际项目中如何选择更合适的本地互操作技术。
tags: [Kotlin,FFM API,JNI,跨语言互操作,性能优化,内存管理,系统编程]
---

JDK 22 引入了**外部函数和内存 API（FFM API）**，提供了一种全新的 Java 与本地代码互操作方案。与传统的 JNI 相比，FFM API 采用纯 Java 的编程模型，通过 `Linker`、`MethodHandle`、`MemorySegment` 等类直接调用 C 函数和管理本地内存，无需编写 JNI Glue 代码或生成头文件。下面从架构设计、性能、安全、可维护性、易用性、跨平台兼容性等维度详细对比两者的差异与优劣，并讨论 C/C++ 代码实现和适用场景。

## 架构设计与调用方式

* **JNI**：Java 侧通过 `native` 关键字声明本地方法（无方法体），并使用 `System.loadLibrary` 加载本地库。对应的 C/C++ 代码必须使用 JNI 规范的函数签名，形式如 `Java_包名_类名_方法名(JNIEnv *env, jclass/jobject, 参数…)`。调用时，Java 与本地代码之间通过 `JNIEnv` 结构体指针进行交互：Java 值需要转换为 JNI 类型（如 `jintArray`、`jstring` 等），C 代码通过 `(*env)->GetXXX` 系列函数访问数据或调用 Java 方法。整个调用模型偏向“Native 优先”，需要手动处理数组/字符串拷贝、引用管理和异常检查。

  例如，使用 JNI 调用 C 函数并返回整数的示例：

```kotlin
external fun add(a: Int, b: Int): Int

fun main() {
    System.loadLibrary("native")  // 直接在main里加载
    println(add(3, 4))            // 调用native方法
}
```

  对应的 C/C++ 实现：

```c
#include <jni.h>
JNIEXPORT jint JNICALL Java_MainKt_add(JNIEnv *env, jclass cls, jint a, jint b) {
    return a + b;
}
```

* **FFM API**：Java 侧使用 `java.lang.foreign` 包提供的类。通过 `Linker` 查找并绑定本地函数地址，然后使用 `MethodHandle` 调用“下溢调用”（downcall）。同时使用 `MemorySegment`（和 `Arena`）分配并管理本地内存。整个调用过程纯粹在 Java 中完成，无需任何 JNI C 代码。FFM 的设计目标是“**Java 优先**”，即在 Java 代码中直接描述调用签名和内存布局，再由底层自动进行参数拷贝和内存管理。如下示例通过 FFM API 调用 C 库中的 `add`：

```kotlin
fun main() = Arena.ofConfined().use { arena ->
  val linker = Linker.nativeLinker()
  val os = System.getProperty("os.name").lowercase()
  // 加载动态库
  val libPath = when {
    os.contains("win") -> "native.dll"
    os.contains("mac") -> "libnative.dylib"
    else -> "libnative.so" // Linux/BSD
 }
  val symbolLookup = SymbolLookup.libraryLookup(libPath, arena)

  // 查找 add 函数符号
  val addHandle: MethodHandle = linker.downcallHandle(
      symbolLookup.find("add").orElseThrow(),
      FunctionDescriptor.of(ValueLayout.JAVA_INT, ValueLayout.JAVA_INT, ValueLayout.JAVA_INT)
  )

  val result = addHandle.invoke(3, 5) as Int
  println("3 + 5 = $result")
}
```
  对应的 C/C++ 实现：

```c
  int add(int a, int b) {
    return a + b;
  }
```

在这个示例中，没有任何 JNI 头文件或 C 代码定义；所有绑定、签名和内存管理都在 Java 端完成。表明 FFM API 让“纯 Java 与本地代码对话”，不需要 JNI Glue 代码。这种设计简化了调用过程：Java 代码用 `FunctionDescriptor` 定义函数签名，用 `MemorySegment` 表示本地缓冲区，调用结束后 `Arena` 自动释放内存。

* **数据和内存传递**：JNI 原本只支持基本类型和 Java 对象作为参数（需要借助 `GetXXXArrayElements`、`GetStringUTFChars` 等方法处理数据），而 FFM API 提供了灵活的内存操作接口。Java 可通过 `MemorySegment` 对象直接映射任意结构体，使用 `MemoryLayout`/`VarHandle` 方便地读写本地数据结构。例如，可以直接定义 C 结构体布局，分配 `MemorySegment` 并读写字段，避免手动计算偏移。FFM 取代了 JNI 中难用的 `DirectByteBuffer` 方案，提供了更安全、更直观的方式来访问外部内存。

## 性能表现

* **调用开销**：JNI 每次调用都会发生 Java 与本地环境之间的上下文切换，通常开销较大。FFM 通过减少必要的转换步骤来降低开销，并利用底层优化（如 JIT inline）提升效率。

* **向量与并行**：FFM API 与新一代向量 API 结合紧密，可直接支持 SIMD 等硬件特性，实现高性能的向量计算。此外，FFM 允许用户自定义分配器并重复利用 `MemorySegment`，以进一步减少分配开销。相比之下，JNI 不支持此类优化，只能依赖手工管理的内存分配。

* **整体性能**：总体而言，FFM 旨在“通过减少开销来提升性能”。Oracle 开发者指出，FFM 在很多场景下性能已达到或超过 JNI 水平。比如借助 JIT 优化和向量化，FFM 下的本地调用可以与纯 C 代码媲美，而 JNI 由于层层封装往往速度稍低。随着 JDK 22 的发布，FFM 对字符串、数组等转换进行了大量优化，使其性能显著优于传统 JNI。

## 安全性

* **JNI 安全问题**：由于 JNI 允许编写任意 C/C++ 代码，开发者必须自行处理内存管理和类型转换。传统 JNI 易出现内存泄漏、缓冲区溢出、空指针访问等问题，一旦处理不当就可能导致程序崩溃甚至安全漏洞。例如，使用 `GetStringUTFChars` 需要手动释放， `NewGlobalRef` 需避免泄漏。JNI 本身对 Java 对象访问缺乏静态检查，容易出错。

* **FFM 安全机制**：FFM API 引入了多项内置安全措施。`MemorySegment` 在默认情况下会进行边界检查，防止越界访问；`Arena` 自动管理本地内存生命周期，出作用域即释放，减少泄漏风险。此外，FFM 的函数签名（`FunctionDescriptor`）在编译时可检查参数类型和数量是否匹配，降低调用错误率。阿里云社区指出，FFM 对类型检查和内存管理进行了全面升级，可以减少类型不匹配或内存泄漏导致的崩溃和安全问题。Java 团队也表示，相比 JNI 的“不安全”方法，FFM 的不安全操作易于从 Java 代码中调用，并且通过更多限制（例如 JEP 472 对JNI使用的限制）提高了整体安全性。

* **访问权限控制**：在更高版本的 JDK 中，Java 开始对本地访问施加严格控制。JEP 472 即建议在未来对 JNI 调用发出警告或错误。FFM API 同样受限于“本地访问”策略，但由于 FFM 不支持直接访问 Java 对象（只能操作原生数据），对 JVM 内部状态干扰较少。因此，开发者可以更安全地在 Java 代码中使用 FFM，从而减少产生 `--enable-native-access` 等安全风险。

## 可维护性与易用性

* **JNI 的复杂性**：传统 JNI 编程繁琐，需编写大量样板代码：生成头文件、实现 `JNIEXPORT` 函数、手动转换类型、管理引用等。这些步骤容易出错，调试也麻烦。例如，一个简单的本地调用就要涉及 Java 类、C 头文件、C 源文件、编译脚本等多个环节。任何 Java 类名或方法签名的微小变动都可能导致 JNI 链接失败。

* **FFM 的简洁性**：FFM API 设计简洁，使用纯 Java 代码即可完成本地调用和数据访问。明确指出，“无需 JNI Glue 代码，无需本地编译麻烦，只需纯 Java 调用本地函数”。Java 开发者可以直接在 IDE 编写代码，无需外部工具（如 `javah`）和 C/C++ 编译环境。常用的数据布局和结构体可用 `MemoryLayout` 简单描述，访问字段使用 `VarHandle`，避免了手动计算偏移量。Oracle 称 FFM 大幅**减少样板代码**和所需的原生编程知识，提高了开发效率。

* **工具支持**：FFM 还配套了 `jextract` 工具，可以根据 C 头文件自动生成相应的 Java 绑定类。使用 `jextract`，开发者只需指向 `.h` 文件，便可得到完整的 Java 接口定义，进一步免除了手写包装。这样，FFM 不仅在语言层面易用，还拥有自动化工具生态，大幅降低了维护成本。

* **内存管理简化**：JNI 中的本地内存需要显式释放，不当使用容易引发泄漏和悬挂引用。而 FFM 的 `Arena` 在退出作用域时自动释放分配的 `MemorySegment`。这种 try-with-resources 的使用模式，大大简化了内存管理。Belief-driven-design 博客也总结：FFM 提供了更简单且更安全的内存管理抽象，减少了可能的内存泄漏。

## 跨平台兼容性

* **JNI 的限制**：虽然 JNI 规范本身跨平台，但每种操作系统/CPU 架构都需要提供编译后的本地库（.so、.dll 等），并确保正确加载。不同平台可能存在 ABI 差异或对齐规则不同，JNI 接口代码常常需要针对平台进行调整。正因如此，以前的 Java 版本存在多种原生接口规范（如 Netscape JRI、RNI）并存的情况。即使现在大多数 JVM 遵循 JNI，开发者仍需为每个平台维护编译流程。

* **FFM 的优势**：FFM API 采用标准的 C ABI（多数通过 libffi 实现），并内置对 Linux、macOS、Windows、AIX 等平台的支持。只要目标平台有相应的 C 库，Java 程序即可通过 FFM 调用，无需修改 Java 代码或重新生成 JNI 接口。Belief-driven-design 博客指出，FFM 有“更好的可移植性”，因为它不再依赖复杂而脆弱的 JNI 样板。在可移植性方面，FFM 让跨平台开发更加平滑：只需使用统一的 Java API，由 JVM 负责适配底层 ABI，从而避免了传统 JNI 在不同系统间反复编译的麻烦。

## C/C++ 代码实现差异

* **JNI 实现**：采用 JNI 时，C/C++ 侧必须使用 JNI 头文件并按照固定命名规则编写本地方法。例如，Java 类 `com.example.Foo` 中声明了 `public static native int bar(int x)`，对应的 C 函数签名必须为 `Java_com_example_Foo_bar(JNIEnv *env, jclass cls, jint x)`。函数体中通常通过 `env` 调用 API（如 `NewIntArray`、`SetByteArrayRegion` 等）实现与 Java 侧的数据互转。复杂结构体需要在 Java 侧写相应的 JNI 代码手动拆包。每新增或修改一个 native 方法，都需要重新生成头文件、编译并部署新的本地库。

* **FFM 实现**：使用 FFM 时，一般不需要编写任何新的 C 函数来适配 Java。Java 代码可以直接绑定现有的 C 库函数，只要这些函数遵循常规 C 签名即可。例如，如果 C 库中已有 `int add(int,int)`，只需在 Java 端调用 `Linker.downcallHandle` 绑定它，无需在 C 端专门实现带 `JNIEnv*` 的包装函数。也就是说，现有的 C/C++ 库往往可以原样使用，FFM 只是在 Java 侧做调用。对比而言，JNI 要求 C 端以特殊方式导出函数（使用 `JNIEXPORT JNICALL` 等），而 FFM 没有此要求。

* **数据结构处理**：在 JNI 中，Java 对象和数组需要转换为原生类型（如 `jobject`, `jarray`），不支持直接访问 C 结构体。FFM 允许在 Java 端用 `MemoryLayout.structLayout` 描述 C 结构体布局，然后通过 `MemorySegment` 进行读写。举例来说，C 语言中的 `struct Point { int x; int y; }`，在 FFM 中可用：

```kotlin
fun main(){
    val point: MemoryLayout = MemoryLayout.structLayout(
        ValueLayout.JAVA_INT.withName("x"),
        ValueLayout.JAVA_INT.withName("y")
    )
    val xH = point.varHandle(PathElement.groupElement("x"))
    val yH = point.varHandle(PathElement.groupElement("y"))
    Arena.ofConfined().use { arena ->
        val pt = arena.allocate(point)
        xH.set(pt, 0L, 10)
        yH.set(pt, 0L, 20)
    }
}
```

  而在 JNI 中，处理同样结构体要么通过字节缓冲区手动拼凑，要么写很多 `Get/Set` 调用，远不如 FFM 简洁直观。

* **回调（Upcall）**：目前 FFM API 主要支持 Java 调用原生函数（downcall）。如果需要从 C 代码回调 Java 方法（upcall），JNI 目前还更为成熟：JNI 可在 native 代码中通过 `(*env)->Call*Method` 等直接调用 Java 代码。而 FFM 对这类回调暂时支持有限（需使用 `Linker.upcallStub` 生成回调函数指针，流程较复杂）。因此，在需要频繁从本地代码调用 Java 的场景（如 Signal 处理、线程回调）时，JNI 仍具优势。

综上，**FFM 使得大部分情况下无需修改现有 C 代码**——只要 C 库已编译好，就可以直接在 Java 侧调用；而 JNI 则通常需要为每个方法写特定的 native 函数签名。这一点使得 FFM 迁移成本较低：只修改 Java 端调用方式，C 端实现可以不变。

## 适用场景

* **使用 FFM API 的情景**：

    * **新开发或迁移现有库**：如果需要调用已有的 C/C++ 库（如系统 API、第三方算法库、图形/AI 框架等），FFM 提供了更安全简洁的访问方式。对于新项目，推荐优先采用 FFM API 进行本地互操作。Java 文档也建议在适用的情况下优先使用 FFM 以取代 JNI。
    * **高性能需求**：在需要充分发挥现代硬件能力的场景（例如大数据处理、向量运算、视频/图形计算），FFM 可以利用底层优化（如 SIMD、内存对齐）获得接近原生的性能。
    * **安全与快速迭代**：如果项目对稳定性和安全性要求较高，需要减少低级内存错误，可选用 FFM 以获得自动内存管理和类型安全的好处。同时，由于无需编写 C 代码，可以用纯 Java 快速迭代、本地部署更方便。

* **使用 JNI 的情景**：

    * **遗留系统或特殊需求**：如果已有大量 JNI 代码、或者需要使用一些 FFM 目前不支持的功能（如直接操作 Java 对象、利用 JNI 注册回调 Java 方法、调用某些只提供 JNI 接口的库），可以继续使用 JNI。对于现有的 JNI 库，可以逐步评估迁移成本；有时直接调用 JNI 更快捷。
    * **Java 嵌入场景**：在使用 JNI 调用 Java 虚拟机（JNI Invocation API）将 JVM 嵌入到本地应用中时，需要依赖 JNI 接口。提到 JNI 在这种嵌入式使用下的优势。
    * **极端性能调优**：虽然 FFM 在大部分场景中性能已经优秀，但在极端苛刻的低延迟场合，经验丰富的 C/C++ 开发者可能仍会选择手动优化 JNI 调用路径（如缓存 `JNIEnv*` 指针、最小化 JNI 调用开销）。

总的来说，对于大多数新项目和常见用途（**调用本地库、处理本地数据**），FFM API 是更优的选择；而 JNI 主要适用于传统/特殊场景或过渡阶段。随着 JDK 23 及以后版本对 JNI 的使用越来越多限制（例如默认对 JNI 调用发出警告或抛出异常），Java 平台正逐步鼓励使用 FFM API。因此，开发者应在新功能开发时优先考虑 FFM，在必须时才使用 JNI，以保持代码现代性和安全性。

