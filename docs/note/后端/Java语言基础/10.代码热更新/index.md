# 代码热更新
## 常见热更新方式
- 动态编译+实例替换
- javaagent+instrument远程attach进行虚拟机中的字节码更改

## 动态编译+实例替换
> 大致原理：
    有新改变时，创建新的加载器进行加载，先自己加载，没有的才用父加载器加载

> 开发阶段：
我们要替换的对象一般是被容器管理，且有实现固定接口，替换的是容器中的实例
指定要监听的目录，定时检测这个目录的文件是否变化（比较文件的改变时间戳），有改变
则进行源代码进行编译，编译后获取字节码对象，创建实例，替换容器中的对象

> 因为要动态编译代码，因此要依赖Java提供的工具类JavaCompiler，在jdk安装目录lib下的tools.jar，项目要依赖此Java

代码案例如下：

目录如下：
![目录](./.assets/20230523-115113.jpg)

测试类：
```java
/**
 * 开发阶段热更新（每隔几秒检测一次文件夹下文件变更[脚本变更]，动态编译Java文件）
 * 已上线热更新（Javaagent,classloader）
 * 远程调试
 */
public class App {
    public static void main(String[] args) throws Exception {
        ScriptManager.instance().loadScripts();

        ScriptDevListener.instance().listenerStart();
        while (true){
            IScript script = ScriptManager.instance().getScript(DemoScript.class.getName());
            script.excute();
            Thread.sleep(3000);
        }

    }
}
```

脚本接口(所有需要热更新的类都继承此接口，方便容器管理)：
```java
package com.df.hotfix.scripts;

public interface IScript {
    void excute();
}

```
脚本管理器：
```java
package com.df.hotfix;

import com.df.hotfix.loader.InputFileJavaFileObject;
import com.df.hotfix.loader.MyJavaFileManager;
import com.df.hotfix.scripts.IScript;
import com.df.hotfix.scripts.ScriptDevListener;
import com.df.hotfix.scripts.ScriptManager;
import com.df.hotfix.scripts.impl.DemoScript;

import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * 开发阶段热更新（每隔几秒检测一次文件夹下文件变更[脚本变更]，动态编译Java文件）
 * 已上线热更新（Javaagent,classloader）
 * 远程调试
 */
public class App {
    public static void main(String[] args) throws Exception {
        ScriptManager.instance().loadScripts();

        ScriptDevListener.instance().listenerStart();
        while (true){
            IScript script = ScriptManager.instance().getScript(DemoScript.class.getName());
            script.excute();
            Thread.sleep(3000);
        }

    }

    public static void compileTest() throws IOException {
        String path = "D:\\MyProject\\bakend\\java\\my_test\\hotfix\\src\\main\\java\\com\\df\\hotfix\\scripts\\impl\\DemoScript.java";
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
// 自定义 JavaFileManager 方便自定义输入和输出
        MyJavaFileManager myJavaFileManager = new MyJavaFileManager(compiler.getStandardFileManager(null, null, StandardCharsets.UTF_8));
        JavaCompiler.CompilationTask task = compiler
                .getTask(null, myJavaFileManager, null, null, null,
                        Arrays.asList(new InputFileJavaFileObject(new File(path), "com.df.hotfix.scripts.impl.DemoScript")));
        // 同步调用
        task.call();
        myJavaFileManager.getByteArrayJavaFileObjects().forEach(b1->{
            try {
                ByteArrayOutputStream o= (ByteArrayOutputStream) b1.openOutputStream();
                // 获取字节码
                byte[] classByteArray = o.toByteArray();
                // 加载对象 ，这里是有问题的，我们应该 是在ClassLoader 中编译，并加载
                ClassLoader loader = new ClassLoader() {
                    @Override
                    protected Class<?> findClass(String name) throws ClassNotFoundException {
                        return defineClass(name, classByteArray, 0, classByteArray.length);
                    }
                };
                Class<?> clazz = loader.loadClass("com.df.hotfix.scripts.impl.DemoScript");
                if (IScript.class.isAssignableFrom(clazz)){
                    IScript instance = (IScript) clazz.newInstance();
                    instance.excute();
                }
            } catch (IOException e) {
                e.printStackTrace();
            } catch (ReflectiveOperationException e) {
                e.printStackTrace();
            }
        });
    }
}

```

脚本实现（本次为测试，只实现了一个）：
```java
package com.df.hotfix.scripts.impl;

import com.df.hotfix.scripts.IScript;

public class DemoScript implements IScript {
    private String str = "5";
    @Override
    public void excute() {
        System.out.println("我擦le :"+str);
    }

    @Override
    public String toString() {
        return "DemoScript{" +
                "str='" + str + '\'' +
                '}';
    }
}

```

自定义加载器：
```java
package com.df.hotfix.loader;

import com.df.hotfix.scripts.IScript;

import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class HotFixLoader extends ClassLoader {

    String checkPath = "D:\\MyProject\\bakend\\java\\my_test\\hotfix\\src\\main\\java";
    JavaCompiler compiler = null;
    MyJavaFileManager myJavaFileManager;

    public HotFixLoader() {
        compiler = ToolProvider.getSystemJavaCompiler();
        // 自定义 JavaFileManager 方便自定义输入和输出
        myJavaFileManager = new MyJavaFileManager(compiler.getStandardFileManager(null, null, StandardCharsets.UTF_8));
    }

    @Override
    public Class<?> loadClass(String name) throws ClassNotFoundException {
        if (name.startsWith("com.df.hotfix.scripts.impl")) {
            Class<?> aClass = this.findClass(name);
            if (aClass == null) {
                return this.getParent().loadClass(name);
            }
            return aClass;
        } else {
            return this.getParent().loadClass(name);
        }
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        String path = checkPath + File.separator + name.replace(".", "/") + ".java";
        JavaCompiler.CompilationTask task = null;
        try {
            task = compiler
                    .getTask(null, myJavaFileManager, null, null, null,
                            Arrays.asList(new InputFileJavaFileObject(new File(path), name)));
            // 同步调用
            task.call();
            OutputFileJavaFileObject outputFileJavaFileObject = myJavaFileManager.getByteArrayJavaFileObjects().stream().findAny().get();

            ByteArrayOutputStream o = (ByteArrayOutputStream) outputFileJavaFileObject.openOutputStream();
            // 获取字节码
            byte[] classByteArray = o.toByteArray();
            return defineClass(name, classByteArray, 0, classByteArray.length);
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }

    }
}

```
因为我们是将Java文件编译到内存，不写到本地文件，因此用到了文件管理器

java文件管理器（用于管理）：
```java
package com.df.hotfix.loader;

import javax.tools.FileObject;
import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

public class MyJavaFileManager extends ForwardingJavaFileManager<JavaFileManager> {
    // 就是一个装饰着模式  ForwardingJavaFileManager

    /**
     * Creates a new instance of ForwardingJavaFileManager.
     *
     * @param fileManager delegate to this file manager
     */
    public MyJavaFileManager(JavaFileManager fileManager) {
        super(fileManager);
    }

    private final Set<OutputFileJavaFileObject> byteArrayJavaFileObjects = new HashSet<>();

    public Set<OutputFileJavaFileObject> getByteArrayJavaFileObjects() {
        return byteArrayJavaFileObjects;
    }

    // 有字节码的输出的时候 我们自定义一个JavaFileObject 来接受输出了
    @Override
    public JavaFileObject getJavaFileForOutput(JavaFileManager.Location location, String className, JavaFileObject.Kind kind, FileObject sibling) throws IOException {
        if (JavaFileObject.Kind.CLASS == kind) {
            OutputFileJavaFileObject byteArrayJavaFileObject = new OutputFileJavaFileObject(className);
            byteArrayJavaFileObjects.add(byteArrayJavaFileObject);
            return byteArrayJavaFileObject;
        } else {
            return super.getJavaFileForOutput(location, className, kind, sibling);
        }
    }
}

```

输入文件对象实现：
```java
package com.df.hotfix.loader;

import javax.tools.SimpleJavaFileObject;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Paths;

public class InputFileJavaFileObject extends SimpleJavaFileObject {

    String fileContent = null;

    /**
     * Construct a SimpleJavaFileObject of the given kind and with the
     * given URI.
     *
     * @param file      Java源文件
     * @param className 文件类型
     */
    public InputFileJavaFileObject(File file, String className) throws IOException {
        super(URI.create("string:///" + className.replace(".", "/") + ".java"), Kind.SOURCE);
        byte[] bytes = Files.readAllBytes(Paths.get(file.getAbsolutePath()));
        this.fileContent = new String(bytes,"utf-8");
    }


    @Override
    public CharSequence getCharContent(boolean ignoreEncodingErrors) throws IOException {
        return this.fileContent;
    }
}

```

输出文件对象实现：
```java
package com.df.hotfix.loader;

import javax.tools.SimpleJavaFileObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;

public class OutputFileJavaFileObject extends SimpleJavaFileObject {
    /**
     * Construct a SimpleJavaFileObject of the given kind and with the
     * given URI.
     */
    private final ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

    public OutputFileJavaFileObject(String className) {
        super(URI.create("bytes:///" + className.replace(".", "/") + ".class"), Kind.CLASS);
    }

    @Override
    public OutputStream openOutputStream() throws IOException {
        return outputStream;
    }
}

```

测试结果：
![测试结果](./.assets/20230523-120430.jpg)

>生产阶段：
可以省去编译的环节，在本地修改好后编译成.class文件，上传到线上指定热更新目录，然后GM后台给线上服务器发送
热更新指令，线上服务器创建新的加载器实例进行指定目录class文件加载即可
或者直接GM后台传输包名和字节码（或源文件）到线上服，线上服进行加载（或编译后加载）替换
## Javaagent