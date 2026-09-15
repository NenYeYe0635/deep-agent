import fs from "fs";

export async function readFile(filePath: string):Promise<string> {
    console.log(`\n[Agent]执行 读取文件 工具`)

    if (!fs.existsSync(filePath)) {
        return '文件不存在'
    }
    return fs.readFileSync(filePath, 'utf-8')
}