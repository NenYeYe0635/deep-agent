import OpenAI from "openai";
import {calculate} from "./calculate.js";
import {getWeather} from "./getWeather.js";
import {readFile} from "./readFile.js";

type ToolDef = {
    name: string
    description: string
    parameters: Record<string, any>
    handler: (args: any) => Promise<string> | string
}

// 定义工具数组
const toolDefs: ToolDef[] = [
    {
        name: "get_weather",
        description: "获取指定城市的天气信息",
        parameters: {
            type: "object",
            properties: {
                city: { type: "string", description: "城市名称，例如：杭州" },
                unit: { type: "string", enum: ["celsius", "fahrenheit"], description: "温度单位" }, // 只能从给定列表里取值
            },
            required: ["city"],
        },
        handler: (args) => getWeather(args.city, args.unit)
    },
    {
        name: "calculate",
        description: "执行数学计算",
        parameters: {
            type: "object",
            properties: {
                expression: { type: "string", description: "数学表达式，例如：2+3*4" },
            },
            required: ["expression"],
        },
        handler: (args) => calculate(args.expression)
    },
    {
        name: "readFile",
        description: "读取文件内容",
        parameters: {
            type: "object",
            properties: {
                filePath: { type: 'string',  description: '需要被读取的文件的路径，例如：‘"D:\\win-zxwt\\desktop\\Setup.exe"’'}
            }
        },
        handler: async (args) => readFile(args.filePath)
    }
];

// 自动生成执行侧映射
export const toolMap: Record<string, ToolDef['handler']> = Object.fromEntries(
    toolDefs.map(t => [t.name, t.handler])
)

// 自动生成传给模型的 tools 数组
export const tools = toolDefs.map(t => ({
    type: 'function' as const,
    function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
    },
}))


// export  function callingFunc(funcName: string, args : any): string {
//     let result: string
//     switch (funcName) {
//         case "get_weather":
//             result =  getWeather(args.city, args.unit);
//             break;
//         case "calculate":
//             result = calculate(args.expression); // 仅作示例，生产环境请勿使用 eval
//             break;
//         default:
//             result = JSON.stringify({ error: "未知工具" });
//     }
//
//     return `
//         此次执行工具："${funcName}"
//         此次咨询结果："${result}"
//     `
// }