// 获取指定城市的天气信息
export function getWeather(city: string, unit: 'celsius' |'fahrenheit'):string {
    console.log(`\n[Agent]执行 查询温度 工具`)

    if (unit === 'celsius')
        return `${city}的温度是26摄氏度。`
    else
        return `${city}的温度是78华氏度。`
}