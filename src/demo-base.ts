
import 'dotenv/config'
import { createZAgent } from './agent.js'

async function main () {
    const agent = await createZAgent({
        name: 'ZAgent(deepseek) 基础版本 加载skills调用',
        skillsDir: '.dw/skills',
        sandbox: {workspacePath: process.cwd(), outputDir: 'output', verbose: true},
        hitl: {enabled: false},
        systemPrompt: '这是个有趣的AI助手，擅长处理古诗词和技术问题。',
    })

    console.log('===已加载的Skills：')
    agent.getSkills().forEach(skill => {
        console.log(`- ${skill.name}`)
    })

    console.log('\n测试1：诗词笑话生成\n')
    const results1 = await agent.invoke('飞流直下三千尺，疑是银河落九天')
    console.log('\nAI回复：')
    console.log(results1.content)

    console.log('\n测试2：另一首诗\n')
    const results2 = await agent.invoke('床前明月光，疑是地上霜')
    console.log('\nAI回复：')
    console.log(results2.content)

}

main().catch(console.error)