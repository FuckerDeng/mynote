import path from 'path'
import fs from "fs"

// [
//     {
//       text: '后端',
//       collapsed:true, 
//       items: [
//         //显示结果：base+'/note/bakend/并发编程/index.html'
//         //以/结尾，则显示对应文件夹下的index.md，否则显示对应名字的md文件
//         { text: 'java日志体系', link: '/note/后端/Java日志体系/' },
//         { text: 'java语言基础', link: '/note/后端/java语言基础/' },
//         { text: '并发编程', link: '/note/后端/并发编程/' },
//         { 
//           text: '框架',
//           collapsed:true,
//           items: [
//             { text: 'spring', link: '/note/后端/框架/spring/' },
//             { text: 'netty', link: '/note/后端/框架/netty/' },
//             { text: 'spring-cloud', link: '/note/后端/框架/spring-cloud/' },
//             { text: 'mybatis-plus', link: '/note/后端/框架/mybatis-plus/' },
//           ]
//         },
//       ]
//     }
//   ]
export default function getSideBar():any{
    //D:\MyProject\front\typescript\vitepress_note\docs\note
    let notePath = path.resolve(__dirname,"../docs/note")
    let sideBars = [
        { text: '首页', link: '/' }
    ]
    let result =  subWork(notePath)
    if(sideBars.length>0){
        sideBars = sideBars.concat(result)

    }
    
    fs.writeFileSync(__dirname+path.sep+"log.log",JSON.stringify(result))
    return sideBars
}

function subWork(notePath:string){
    let dirs = fs.readdirSync(notePath)
    console.log(notePath);
    let sep = path.sep
    let result:any = []
    let indexMds = dirs.filter(dir=>{
        // console.log(dir);
        
        let info = fs.statSync(notePath+path.sep+dir)
        if(info.isFile() && dir.endsWith("index.md")){
            return true
        }
        return false
    })
    if(indexMds.length>0){
        let index = notePath.lastIndexOf(sep)
        let text = notePath.substring(index+1,notePath.length)
        console.log(text);
        notePath = notePath.split(sep).join("/")
        let temp = notePath.split("/note/")
        let path = temp[1]
        return {
            text:text,
            link:"/note/"+path+"/"
        }
    }
    dirs.forEach((dir,index)=>{
        
        let info = fs.statSync(notePath+path.sep+dir)
        if(info.isDirectory()){
            let dirResult = subWork(notePath+path.sep+dir)
            if(dirResult instanceof Array){
                if(dirResult.length>0){     
                    
                    result.push({
                        text:dir,
                        collapsed:true,
                        items:dirResult
                    })
                }

            }else{
                result.push(dirResult)
            }
        }
    })

    return result
}