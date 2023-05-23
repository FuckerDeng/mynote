- 来源：https://javaforall.cn/161263.html
Java volatile的性能分析「建议收藏」volatile通过内存屏障来实现禁止重排序，通过Lock执行来实现线程可见性，如果我们的程序中需要让其他线程及时的对我们的更改可见可以使用volatile关键字来修饰，比如AQS中的state所以在一个线程写，多个线程读的情况下，或者是对volatile修饰的变量进行原子操作时，是可以实现共享变量的同步的，但是i++不行，因为i++又三个操作组成，先读出值，然后再对值进行+1，接着讲结果写入，这个过程，如果中间有其他线程对该变量进行了修改，那么这个值就无法得到正确的结果。今天我们讨论的重

大家好，又见面了，我是你们的朋友全栈君。

volatile通过内存屏障来实现禁止重排序，通过Lock执行来实现线程可见性，如果我们的程序中需要让其他线程及时的对我们的更改可见可以使用volatile关键字来修饰，比如AQS中的state

![[Pasted image 20230326201713.png]]

所以在一个线程写，多个线程读的情况下，或者是对volatile修饰的变量进行原子操作时，是可以实现共享变量的同步的，但是i++ 不行，因为i++ 又三个操作组成，先读出值，然后再对值进行+1 ，接着讲结果写入，这个过程，如果中间有其他线程对该变量进行了修改，那么这个值就无法得到正确的结果。

今天我们讨论的重点不是他的功能，而是他的性能问题，首先我们可以看下我们对非volatile变量进行操作，循环+1，多个线程操作多个变量(这里不存在并发，至于为什么要多个线程跑，后面就知道了)

首先定义一个Data，内容是四个long类型的变量，我们将会使用四个线程分别对他们进行递增计算操作：

```java
class Data {
	public  long value1 ;
    public  long value2;
    public  long value3;
    public  long value4;
}
```

运行类：

```java
public class SyncTest extends Thread{
    public static void main(String args[]) throws InterruptedException{
        Data data = new Data();
        ExecutorService es = Executors.newFixedThreadPool(4);
        long start = System.currentTimeMillis();
        int loopcont = 1000000000;
        Thread t[] = new Thread[4];
        t[0] = new Thread(()-> {
            for(int i=0;i<loopcont;i++){
                data.value1 = data.value1+i;
            }
        } );
        t[1] = new Thread( () -> {
            for(int i=0;i<loopcont;i++){
                data.value2 = data.value2+i;
            }
        } );
        t[2] = new Thread( () -> {
            for(int i=0;i<loopcont;i++){
                data.value3 = data.value3+i;
            }
        } );
        t[3] = new Thread( () -> {
            for(int i=0;i<loopcont;i++){
                data.value4 = data.value4+i;
            }
        } );
        for(Thread item:t){
            es.submit(item);
        }
        for(Thread item:t){
            item.join();
        }
        es.shutdown();
        es.awaitTermination(9999999, TimeUnit.SECONDS);
        long end = System.currentTimeMillis();
        System.out.println(end-start);  
    }
    
}
```

这样的结果是:608ms

接着我们用volatile修饰long：

```java
class Data {
	public volatile long value1 ;
    public volatile long value2;
    public volatile long value3;
    public volatile long value4;
}
```

运行结果为：66274

可以看出是100倍左右，使用volatile的性能为什么会这么差呢，原因是因为，因为volatile的读和写都是要经过主存的，读会废弃高速缓存的地址，从缓存读，写也会及时刷新到主存

那么我们用一个线程操作一个变量试试呢：结果是：5362

是要好很多，为什么多线程情况下差距这么大呢，我们并没有进行并发操作，并没有锁，那是因为发生了伪共享，CPU的高速缓存的最小单位是缓存行，一般是64 byte，这个CPU核心私有的，当我们的cpu核心1 跑线程0 ， 核心2跑线程1的时候，因为局部性原理，core1的L1缓存将value1加载到缓存，也会将后面的几个一并加载进来，core2也一样，也就是说，core1和core2的缓存差不多都把四个值保存了，而缓存行中如果一个值发生变化，cpu会吧整个缓存行重新加载，那么可以理解下，因为内存的一致性，就会导致各个核心不停的从主存加载和刷新，这就导致了性能的问题。

怎么解决呢：

1.将值拷贝至线程内部操作，完成后进行赋值操作，也就是Data中的值依然使用volatile修饰，线程的执行逻辑改为：

```java
t[0] = new Thread(()-> {
        	long value = data.value1 ;
            for(int i=0;i<loopcont;i++){
            	value ++ ;
            }
            data.value1 = value ;
        } );
        t[1] = new Thread( () -> {
        	long value = data.value1 ;
            for(int i=0;i<loopcont;i++){
                value++;
            }
            data.value2 = value ;
        } );
        t[2] = new Thread( () -> {
        	long value = data.value1 ;
            for(int i=0;i<loopcont;i++){
            	value ++;
            }
            data.value3 = value ;
        } );
        t[3] = new Thread( () -> {
        	long value = data.value1 ;
            for(int i=0;i<loopcont;i++){
            	value ++;
            }
            data.value4 = value ;
        } );
```

这个结果是多少呢：76ms，可以看到这个比不用volatile修饰还要快很多，那是因为线程私有的可以直接在线程内部栈内存操作，时间就是cpu消耗的时间，并不会发生内存耗时

2使用缓存行填充

这里我们把Data里面的long修饰一下：

```java
public class VolatileLongPadding {
    public volatile long p1, p2, p3, p4, p5, p6; // 注释  
}
 
package com.demo.rsa;
public class VolatileLong extends VolatileLongPadding {
    public volatile long value = 0L;  
}
 
class Data {
    public VolatileLong value1 = new VolatileLong();
    public VolatileLong value2= new VolatileLong();
    public VolatileLong value3= new VolatileLong();
    public VolatileLong value4= new VolatileLong();
}
```

这里的VolatileLong 通过volatile修饰，并填充了6个无用的long占空间，加上对象头，刚好64字节

逻辑不变，依然是线程直接操作value，而不是拷贝到内部：

```java
Thread t[] = new Thread[4];
        t[0] = new Thread(()-> {
            for(int i=0;i<loopcont;i++){
                data.value1.value = data.value1.value+i;
            }
        } );
        t[1] = new Thread( () -> {
            for(int i=0;i<loopcont;i++){
                data.value2.value = data.value2.value+i;
            }
        } );
        t[2] = new Thread( () -> {
            for(int i=0;i<loopcont;i++){
                data.value3.value = data.value3.value+i;
            }
        } );
        t[3] = new Thread( () -> {
            for(int i=0;i<loopcont;i++){
                data.value4.value = data.value4.value+i;
            }
        } );
```

这个结果是：44ms,比在线程内部操作还要快。