## log4j2中Appender/Logger/Root 关系
挂网：https://logging.apache.org/log4j/2.x/
本文来源：https://blog.csdn.net/HongZeng_CSDN/article/details/130094219

在Log4j2中，Appender和Logger是两个核心组件，它们在日志记录过程中扮演着不同的角色。

### 1.Appender（附加器）：
> Appender负责将日志输出到特定的目标。

例如，将日志记录输出到控制台、文件、数据库等。在Log4j2中，有许多预定义的Appender，如ConsoleAppender（控制台输出）、FileAppender（文件输出）、RollingFileAppender（滚动文件输出）、SocketAppender（网络输出）等。你可以根据需求选择相应的Appender，或者自定义实现Appender。

Appender的配置通常包括输出格式（如PatternLayout）、滚动策略、触发策略等。例如，在Log4j2的XML配置文件中，一个简单的FileAppender配置如下：
```xml
<appenders>
    <!--        name:appender的名字；tartget：SYSTEM_OUT或SYSTEM_ERR，通常设为SYSTEM_OUT；-->
    <!-- =======================================用来定义输出到控制台的配置======================================= -->
    <Console name="Console" target="SYSTEM_OUT">
        <!-- 设置控制台只输出level及以上级别的信息(onMatch),其他的直接拒绝(onMismatch)-->
        <ThresholdFilter level="${console_print_level}" onMatch="ACCEPT" onMismatch="DENY"/>
        <!-- 设置输出格式,不设置默认为:%m%n -->
        <PatternLayout pattern="${console_log_pattern}"/>
    </Console>
</appenders>
```
### 2.Logger（记录器）：
> Logger负责捕捉日志事件，并将它们传递给适当的Appender。
每个Logger都有一个日志级别（如DEBUG、INFO、WARN、ERROR和CRITICAL），只有当日志事件的级别大于或等于Logger的级别时，才会将事件传递给Appender。这样，我们可以控制不同级别的日志事件是否被记录。

Logger通常有一个名字，表示它与特定的类或包相关联。在Java代码中，我们通常根据当前类创建一个Logger实例，如：
```java
    private Logger log = LoggerFactory.getLogger(Sub1Log.class);
```
在Log4j2的配置文件中，我们可以为不同的Logger设置日志级别，以及关联的Appender。例如：
```xml
    <loggers>

        <logger name="com.df.spring_look.log.sub1.sub2" level="error" additivity="false">
            <appender-ref ref="Console"/>
        </logger>
        <logger name="com.df.spring_look.log.sub1" level="info" additivity="false">
            <appender-ref ref="Console"/>
        </logger>
        <logger name="com.df.spring_look.log" level="warn" additivity="false">
            <appender-ref ref="Console"/>
        </logger>

        <!-- 设置打印sql语句配置结束 -->

        <!--建立一个默认的root的logger-->
        <root level="DEBUG">
            <appender-ref ref="Console"/>

        </root>
    </loggers>
```

总结一下，Logger负责捕捉和筛选日志事件，而Appender负责将日志事件输出到特定目标。在Log4j2的配置中，我们需要定义Appender，然后将Appender关联到相应的Logger，从而实现灵活的日志记录策略。

普通logger 与 root的关系
在Log4j2中，Logger之间存在一种层次结构。普通Logger（也称为非Root Logger或自定义Logger）都是Root Logger的子Logger。Root Logger是Logger层次结构的顶层记录器，它是所有Logger的父类。

普通Logger根据名称和包路径进行组织。例如，一个名为com.example.MyClass的普通Logger与名为com.example的包相关联。这种层次结构允许我们为不同的包或类设置不同的日志级别和Appender。

Root Logger的主要作用是提供默认的日志级别和Appender设置。当一个普通Logger没有显式地设置级别或Appender时，它会继承Root Logger的设置。

这是一个简化的Logger层次结构示意图：
```
Root Logger
    |-- com.example(package)
    |   |-- com.example.MyClass1(class)
    |   |-- com.example.MyClass2(class)
    |   ┖-- ...
    |-- com.example.subpackage(package)
    |   |-- com.example.subpackage.MyClass3(class)
    |-- ┖-- ...
    ┖-- ...
```
    Properties：定义其他部分都会用到的功能属性
    appenders：定义日志的输出位置，内置了ConsoleAppender（控制台输出）、FileAppender（文件输出）、RollingFileAppender（滚动文件输出）、
        SocketAppender（网络输出）等，也可以自定义实现
    loggers：定义不同包下产生的日志分配给哪个appender处理
        一个类产生日志后，先通过输出时所在类路径到配置表查找能匹配的logger，没找到，则向上一个包路径名进行查找，直到
        找到匹配的logger或root logger
        比如：com.example.A.class产生的日志，先通过com.example.A.class查找名字匹配的logger，找不到，再通过com.example
        进行查找，依次向上查找，如果com都查不到，就使用root logger，通过root logger里定义的日志级别和appender进行日志
        分发处理
        根据此查找原理实现了日志的不同处理

总结一下，Log4j2是通过类路径（包路径）来查找和匹配Logger的。这样可以让我们针对不同的包和类设置不同的日志策略。