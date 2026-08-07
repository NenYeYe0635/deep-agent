/**
 * Tavily搜索工具
 * 适合 在 Agent 中使用
 */

export interface SearchResult {
    title: string
    url: string
    content: string // 搜索结果
    score: string // 相关性分数
}

export class TavilySearch {
    private apiKey: string
    private baseUrl = 'https://api.tavily.com/search'

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    // 执行搜索
    async search(query: string, maxResult = 5): Promise<SearchResult[]> {
        console.log(`[TavilySearch] 搜索：”${query}“ ， 最大结果数：${maxResult}`)
        try {
            const res = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    "query": query,
                    "max_results": maxResult,
                    "search_depth": "basic",
                    "include_answer": false,
                    "include_raw_content": false
                })
            })

            if (!res.ok) throw new Error(`Tavily搜索请求失败：${res.status} ${res.statusText}`)

            const data = await res.json()
            console.log(`[TavilySearch] 搜索完成，找到 ${data.results.length} 条结果`)
            return data.results.map((item: any)=> ({
                title: item.title,
                url: item.url,
                content: item.content.slice(0, 800),  // 截取前800字符 控制token数量
                score: item.score
            }))
        }catch (e) {
            console.error('搜索错误：', e)
            return []
        }
    }
}