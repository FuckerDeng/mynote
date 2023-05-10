import { defineConfig } from "vitepress"
import getSideBar from "../../script/generateSidebar"
export default defineConfig({
    title: '笔记整理',
    description: '来源于网络和自己的笔记，算法，数据结构，Java，JUC，JVM，数学',
    base:"/mynote/",//部署后网站的contextUrl路径，即docs下的路径前需要加/mynote/
    // outDir:"",//网站的构建完成后的输出位置，相对于项目根目录（如果你正在运行 VitePress 构建项目，则是docs文件夹）默认值：./.vitepress/dist
    appearance:true,//是否启用"暗黑模式"选项
    ignoreDeadLinks:false,//如果设置为true，那 VitePress 在构建时不会因为死链接而导致构建失败。
    lang:"zh-cn",//网站lang属性，在页面 HTML 中呈现为<html lang="en-US">标签。默认为en-US
    lastUpdated:true,//使用git commit来获取时间戳,默认false
    markdown:{//markdown相关的配置
      lineNumbers: true
    },
    themeConfig:{//主题相关的配置
      logo:"https://developer.mozilla.org/favicon-48x48.cbbd161b.png",//静态文件则放在public中，直接使用绝对路径即可，根目录相对docs
      //默认是应用配置中的title属性，这里设置了就用这里的，如果设置为false，则表示不用title
      //一般logo里有网站标题时才会设置为false
      siteTitle:"我的笔记整理",
      //页面顶部导航栏的链接配置
      nav:[

      ],
      //网页的左侧边栏，一般用于整个网站的导航
      sidebar:getSideBar()
    //   sidebar:[
    //     {
    //         "text":"后端",
    //         "collapsed":true,
    //         "items":[
    //             {
    //                 "text":"Java日志系统",
    //                 "link":"/note/后端/Java日志系统/"
    //             },
    //             {
    //                 "text":"并发编程",
    //                 "link":"/note/后端/并发编程/"
    //             }
    //         ]
    //     },
    //     {
    //         "text":"数学",
    //         "collapsed":true,
    //         "items":[
    //             {
    //                 "text":"\线性代数",
    //                 "link":"/note/数学/线性代数/"
    //             }
    //         ]
    //     }
    // ]
    }
  })