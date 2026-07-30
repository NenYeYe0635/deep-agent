/**
 * 沙箱模块
 * 管理智能体的工作区，实现文件路径映射 安全的隔离
 */

import fs from 'fs'
import path from 'path'

export interface SandboxConfig {
    workspacePath: string // 工作区根目录 真实路径

    outputDir?: string // 输出目录 相对工作区

    verbose?: boolean // 是否开启操作日志
}

export interface SandboxContent {
    workspacePath?: string // 工作区真实路径

    outputDir?: string // 输出真实路径

    writeFile: (fileName: string,content: string) => string // 写文件（在沙箱内）

    readFile: (fileName: string) => string | null // 读文件（在沙箱内）

    listFiles: () => string[] // 列出文件

    isPathSafe: (targetPath: string) => boolean // 路径是否在沙箱内 安全校验
}

// 创建沙箱上下文 所有文件操作 都限制在 workspacePath 目录下
export function createSandbox(config: SandboxConfig): SandboxContent{

    const workspacePath = path.resolve(config.workspacePath)
    const outputDir = config.outputDir || 'output'
    const outputPath = path.join(workspacePath, outputDir)
    const verbose = config.verbose ?? true

    // 确保输出目录存在
    if(!fs.existsSync(outputPath)){
        fs.mkdirSync(outputPath, {recursive: true}) // 递归创建
    }

    if(verbose){
        console.log(`[Sandbox] 工作区初始化完成`)
        console.log(`[Sandbox]    真实路径：${workspacePath}`)
        console.log(`[Sandbox]    输出目录：${outputPath}`)
    }

    // 安全验证：目标路径必须在工作区内
    function isPathSafe(targetPath: string):boolean {
        const resolved = path.resolve(outputPath, targetPath)
        return resolved.startsWith(outputPath)
    }

    // 写文件到输出目录
    function writeFile (fileName: string,content: string):string {
        if(!isPathSafe(fileName)){
            throw new Error(`[Sandbox] 安全拦截，路径越界 ${fileName}`)
        }

        const targetPath = path.join(outputPath, fileName)

        // 确保子目录存在
        const dir = path.dirname(targetPath)
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir, {recursive: true})
        }

        fs.writeFileSync(targetPath,content,'utf-8')

        if(verbose){
            console.log(`[Sandbox] 文件已写入： ${path.resolve(workspacePath, outputPath)}`)
        }

        return targetPath;
    }

    // 读取目录中的文件
    function readFile(fileName: string):string|null {
        if(!isPathSafe(fileName)){
            throw new Error(`[Sandbox] 安全拦截，路径越界 ${fileName}`)
        }

        const targetPath = path.join(outputPath, fileName)
        if(!fs.existsSync(targetPath)){
            return null
        }

        return fs.readFileSync(targetPath, 'utf-8')
    }

    // 列出 输出目录中的所有文件
    /**
     * output/index.html
     *       /css/style.css
     *
     *       方法 listFiles 输出  ['index.html','css/style.css']
     */
    function listFiles(): string[] {
        if(!fs.existsSync(outputPath)){
            return []
        }

        const walk = (dir:string):string[]=> {
            const entries = fs.readdirSync(dir, {withFileTypes: true})
            return entries.flatMap(entry=>{
                const fullPath = path.join(dir,entry.name)
                if(entry.isDirectory()) return walk(fullPath)
                return [path.relative(outputPath, fullPath)]
            })
        }

        return  walk(outputPath)
    }


    return {
        workspacePath,

        outputDir,

        writeFile,

        readFile,

        listFiles,

        isPathSafe,
    }
}