import {createSandbox, type SandboxConfig, SandboxContent} from "./sandbox.js";
import {hitlCheckpoint, type HitlConfig} from "./hitl.js";
import { type Skill, loadSkills, buildSkillsPrompt } from './skills-loader.js'

import OpenAI from 'openai'

export interface AgentConfig {
    name: string // 智能体名称
    model?: string // 模型 默认deep seek 默认deepseek-chat
    apiKey?: string // deepseek api key
    temperature?: number // 温度
    skillsDir?: string // skill目录路径
    sandbox?: SandboxConfig //  沙箱配置
    hitl?: HitlConfig // HITL配置
    systemPrompt: string // 系统提示词 （追加到默认提示词后面）
    maxTokens: number // 最大token数 默认 4096
}


// 输出内容
export interface AgentMessage {
    role: 'user' | 'assistant'  // 角色 分为 用户 或 ai助手
    content: string
}

// 输出
export interface AgentResult {
    content: string
    message: AgentMessage[]
    filesWritten: string[]
}

export class ZAgent {
    private clinet: OpenAI
    private config: Required<AgentConfig> // 将 AgentConfig 中的可选全部改为必选 （去掉?）
    private skills: Skill[] = []
    private sandbox: SandboxContent | null = null
    private conversationHistory: AgentMessage[] = [] // 历史对话

    constructor (config: AgentConfig) {
        this.config = {
            name: config.name,
            model: config.model ?? (process.env.DEEPSEEK_MODEL || 'deepseek-chat'),
            apiKey: config.apiKey ?? process.env.DEEPSEEK_API_KEY ?? '',
            temperature: config.temperature ?? Number(process.env.DEEPSEEK_TEMPERATURE ?? 0.7),
            skillsDir: config.skillsDir ?? './dw/skills',
            sandbox: config.sandbox ?? { workspacePath: process.cwd(), outputDir: 'output', verbose: true},
            hitl: config.hitl ?? { enabled: true, autoApprove: false},
            systemPrompt: config.systemPrompt ?? '',
            maxTokens: config.maxTokens ?? 4096
        }

        if (!this.config.apiKey) throw new Error(`缺少 DEEPSEEK_API_KEY ，请在 .env文件 中配置，确保有余额`) // 抛出异常

        // Deepseek 兼容 OpenAI 接口， 换模型只需要替换 baseURL
        this.clinet = new OpenAI({
            apiKey: this.config.apiKey,
            baseURL: 'https://api.deepseek.com/v1'
        })
    }

    // 初始化 智能体
    // 加载skills文件 初始化沙箱

    async init():Promise<void> {
        console.log(`\n ${'='.repeat(50)}`)
        console.log(`${this.config.name} 启动中`)
        console.log(`\n ${'='.repeat(50)}`)

        // 1. 加载skills文件
        console.log(`\n [Agent] 正在加载Skill文件...`)
        this.skills = loadSkills(this.config.skillsDir)
        console.log(`\n [Agent] 共加载 ${this.skills.length} 个 Skill`)

        // 2. 初始化沙箱
        console.log(`\n [Agent] 正在初始化沙箱...`)
        this.sandbox = createSandbox(this.config.sandbox)

        // 3. 初始化完成
        console.log(`\n [Agent] 初始化完成，模型：${this.config.model}`)
        console.log(`\n ${'='.repeat(50)}`)
    }

    // 构建完整的 System Prompt
    private buildSystemPrompt ():string  {
        const skillSection = buildSkillsPrompt(this.skills);
        const sandboxSection = this.sandbox ? `\n## 工作区信息\n当前工作路径：${this.sandbox.outputDir}\n所有文件操作都写入此目录。` : ''

        return ` 你是 ${this.config.name} ，一个基于 Deepseek的通用型 AI 智能体。
        ## 核心能力
        - 理解用户的自然语言目标，自动规划执行步骤
        - 调用相应的 Skill 技能处理专项任务
        - 将结果写入本地文件系统
        ${skillSection}
        ${sandboxSection}
        
        ## 行为准则
        - 每次回复说明你正在做什么（Planning → 执行 → 输出）
        - 需要写文件时，使用以下格式：
        \`\`\`filename:文件名.md
        文件内容
        \`\`\`
        - 如果任务超出能力范围，直接说明
        - 使用中文回复
        ${ this.config.systemPrompt }`
    }


    // 普通调用 （非流式）
    async invoke (userMassage: string): Promise<AgentResult> {
        const approved = await hitlCheckpoint(userMassage, this.config.hitl)

        if( !approved ) return {content: '操作已被用户取消。', message: this.conversationHistory, filesWritten: []}

        this.conversationHistory.push({role: 'user', content: userMassage})
        console.log(`\n[Agent] 收到任务：${userMassage.slice(0,80)} ${userMassage.length>80?'...':''}`)
        console.log(`[Agent] 正在思考...\n`)

        const res = await this.clinet.chat.completions.create({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            messages: [
                {role: 'system', content: this.buildSystemPrompt()},
                // ...this.conversationHistory
                ...this.conversationHistory.map(m=>({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                }))
            ]
        })

        const assistantContent = res.choices[0]?.message?.content ?? ''   // 模型回答结果
        this.conversationHistory.push({role: 'assistant', content: assistantContent}) // 将模型回答存入 历史对话

        const filesWritten = await this.processFileOperations(assistantContent)

        console.log(`\n ${'='.repeat(50)}`)
        console.log('[Agent] 执行完成')
        if(filesWritten.length>0) console.log(`[Agent] 写入文件：${filesWritten.join(', ')}`)

        return  {content: assistantContent, message: this.conversationHistory, filesWritten}

    }

    // 流式调用（边生成边输出）
    async invokeStream (userMassage: string): Promise<AgentResult> {
        const approved = await hitlCheckpoint(userMassage, this.config.hitl)

        if( !approved ) return {content: '操作已被用户取消。', message: this.conversationHistory, filesWritten: []}

        this.conversationHistory.push({role: 'user', content: userMassage})
        console.log(`\n[Agent] 收到任务：${userMassage.slice(0,80)} ${userMassage.length>80?'...':''}`)
        console.log(`[Agent] 开始流式输出：\n`)
        console.log(`\n ${'-'.repeat(50)}`)

        let fullContent = ''

        const stream = await this.clinet.chat.completions.create({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            stream: true,
            messages: [
                {role: 'system', content: this.buildSystemPrompt()},
                // ...this.conversationHistory
                ...this.conversationHistory.map(m=>({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                }))
            ]
        })

        for await (const chunk of stream) {
            const delta = chunk.choices[0].delta?.content ?? ''
            if (delta) {
                process.stdout.write(delta)  // 控制台打印输出
                fullContent += delta
            }
        }

        console.log(`\n ${'-'.repeat(50)}`)

        // const assistantContent = res.choices[0]?.message?.content ?? ''   // 模型回答结果
        this.conversationHistory.push({role: 'assistant', content: fullContent}) // 将模型回答存入 历史对话

        const filesWritten = await this.processFileOperations(fullContent)

        console.log(`\n ${'='.repeat(50)}`)
        console.log('\n [Agent] 流式执行完成')
        if(filesWritten.length>0) console.log(`[Agent] 写入文件：${filesWritten.join(', ')}`)

        return  {content: fullContent, message: this.conversationHistory, filesWritten}

    }


    // 解析 AI 回复中的文件写入指令
    private async processFileOperations(content: string):Promise<string[]> {
        if(!this.sandbox) return  []

        const filesWritten: string[] =[]
        // 匹配  ```filename:xxx.md 或 file:xxx```  格式
        const fileBlockRegex = /```(?:filename:|file:)([^\n]+)\n([\s\S]*?)```/g
        let match
        while ((match = fileBlockRegex.exec(content)) !== null) {  // 每次匹配成功 返回一个数组
            const fileName = match[1].trim() // 文件名称
            const fileContent = match[2].trim() // 文件内容

            try{
                const approved = await hitlCheckpoint(`写入文件：${fileName}`, this.config.hitl)
                if(approved) {
                    const writtentPath = this.sandbox.writeFile(fileName, fileContent)
                    filesWritten.push(fileName)
                    console.log(`[Agent] 已写入：${writtentPath}`)
                }
            }catch (e) {
                console.error(`[Agent] 写入失败 ${fileName}`,e)
            }
        }
        return filesWritten
    }


    // 手动写入文件
    writeFile(fileName: string, content: string): string {
        if (!this.sandbox) throw new Error('沙箱未初始化')
        return this.sandbox.writeFile(fileName, content)
    }

    // 获取沙箱信息
    getSendBox(): SandboxContent | null {
        return this.sandbox
    }

    // 清除历史对话
    clearHistory(): void{
        this.conversationHistory = []
        console.log(`[Agent] 对话历史清空`)
    }

    // 获取所有的skills
    getSkills(): Skill[] {
        return this.skills
    }
}


// 工厂函数 快速创建并初始化 Agent
export async function createZAgent(config: AgentConfig): Promise<ZAgent> {
    const agent = new ZAgent(config)
    await agent.init()
    return agent
}