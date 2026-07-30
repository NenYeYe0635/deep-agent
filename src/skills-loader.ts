/**
 *  skill 加载器
 *  扫描 .dw/skills 目录。 读取所有.skill.md文件并解析成结构化数据
 *  Agent 启动时调用他 把所有解析结果 合并到 System Prompt 中
 *
 */

import fs from 'fs'
import path from 'path'

// skill结构

export interface Skill {
    name:string // 技能名称 # 标题
    fileName:string // 文件名称 code-review.skill.md
    description:string // 出发条件 ## Description
    script:string // 执行步骤 ## Script
    examples?:string // 示例 ## Examples
    references?:string // 参考资料 ## References
    outputFormat?: string // 输出格式
    raw?:string // 完整原始文件内容
}


// 根据.skill.md中的文本内容 生成Skill类型对象
export function parseSkillFile(filePath: string){
    const raw = fs.readFileSync(filePath,'utf-8')
    const lines = raw.split('\n')

    // 提取技能名称 取第一个 # 标题
    const nameMath = lines.find(l => l.startsWith('# ')) // 寻找第一个# 开头的数组项
    const name =
        nameMath ?
            nameMath.replace('# ', '').trim() :
            path.basename(filePath,'.skill.md')   // 获取文件名称

    const section: Record<string, string>= {}
    let currentSection = ''
    let currentContent: string[] = []
    for(const line of lines){
        if(line.startsWith('## ')){
            if(currentSection){
                section[currentSection] = currentContent.join('\n').trim()
            }
            currentSection = line.replace('## ','').trim()
            currentContent = []
        }else if(!line.startsWith('# ')){
            currentContent.push(line)
        }
    }

    if(currentSection){
        section[currentSection] = currentContent.join('\n').trim()
    }


    return {
        name,
        fileName: path.basename(filePath,'.skill.md'),
        description: section['Description'] || '',
        script: section['Script'] || '',
        examples: section['Examples'] || '',
        references: section['References'] || '',
        outputFormat: section['Output Format'] || '',
        raw,
    }
}

// 加载指定目录下所有.skill.md文件
// 返回解析后的Skill数组

export function loadSkills(skillsDir: string):Skill[] {
    const resolveDir = path.resolve(skillsDir)

    if(!fs.existsSync(resolveDir)){
        console.warn(`[SkillLoader]目录不存在：${resolveDir}`)
        return []
    }

    const files = fs.readdirSync(resolveDir)
    const skillFiles = files.filter(f=>f.endsWith('.skill.md'))

    if(skillFiles.length===0){
        console.warn(`[SkillLoader]未找到.skill.md文件：${resolveDir}`)
        return []
    }

    return skillFiles.map(file => {
        const filePath = path.join(resolveDir, file)
        const skill: Skill = parseSkillFile(filePath)
        console.log(`[SkillLoader]已加载技能：${skill.name}(${file}) `)
        return skill
    })
}


// 将 skill 列表格式 转成 System Prompt 中的技能说明

export function buildSkillsPrompt(skills: Skill[]): string{

    if(skills.length===0) return ''

    const skillDescription = skills.map((skill,index)=>{
        let desc = `${index+1}. **${skill.name}**\n 触发条件：${skill.description}`
        if(skill.examples){
            const firstExample = skill.examples.split('\n').slice(0,2).join('\n')
            desc += `\n示例：${firstExample}`
        }

        return desc
    }).join('\n\n')

    return `
        ## 你具备以下转向技能（skill）
        ${skillDescription}
        当用户的输入符合某个技能的触发条件时， 请主动调用该技能的执行逻辑来处理任务。
    `
}