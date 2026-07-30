/**
 * HITL (human in the loop) 认为参与机制
 * 当智能体执行到 高危操作时 主动中断 等待人工确认
 */

import readline from "readline";  // 读取命令行输入内容

// 高风险的操作关键词
const HIGH_RISK_KEYWORDS = [
    // Shell 危险命令
    'rm -rf',
    'chmod 777',
    'sudo',
    'dd if=',

    // SQL 危险操作
    'drop table',
    'drop database',
    'delete from',
    'truncate table',

    // 中文危险指令
    '删除所有',
    '清空数据库',
    '格式化',
    '删库',
    '强制删除',
    '生成文件'
]

export interface HitlConfig {
    enabled?: boolean  // 是否开启 HITL 默认true
    extraKeywords?: string[] // 自定义高风险关键词
    autoApprove?: boolean // 自动同意 用户自动化测试 生产环境不要开
}

// 检测操作内容 是否包含 高风险关键词
export function isHighRiskOperation(content: string, extraKeywords: string[] = []):boolean{
    const keywords = [...HIGH_RISK_KEYWORDS, ...extraKeywords]
    const lower = content.toLowerCase()  // 全部转小写
    return keywords.some(kw => lower.includes(kw.toLowerCase()))  // 只要内容包含 高危关键字 就返回true
}

// 等待用户在终端输入确认
async function waitForConfirmation(prompt: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise(resolve => {
        rl.question(prompt,answer => {
            rl.close();
            resolve(answer.trim().toLowerCase()==='y' || answer.trim().toLowerCase()==='yes')
        })
    })
}

//
export async function hitlCheckpoint(operationDesc: string, config: HitlConfig = {}):Promise<boolean> {
    const { enabled = true, extraKeywords = [], autoApprove = false} = config

    if(!enabled) return true // 没开启HITL 直接允许执行

    if(!isHighRiskOperation(operationDesc, extraKeywords)) return true // 不含高危操作 直接允许执行

    // 高危操作  触发人工审核

    console.log('\n' + '='.repeat(50)) // 换行后打印50个=
    console.log('⚠  [HITL] 检测到高风险操作，需要人工确认')
    console.log('='.repeat(50)) // 打印50个=
    console.log(`操作描述：${operationDesc}`)
    console.log('='.repeat(50)) // 打印50个=

    if(autoApprove){
        console.log('[HITL] 自动同意模式，继续执行...\n')
        return true
    }

    const approve = await waitForConfirmation('\n请确认是否继续执行？（y/n）: ')

    if(approve){
        console.log('[HITL] 已确认，继续执行...\n')
    }else {
        console.log('[HITL] 已拒绝，操作终止...\n')
    }

    return approve
}