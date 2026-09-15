/**
 * 简易计算器：支持 + - * / ( ) 和数字，返回计算结果字符串
 */
export function calculate(expression: string): string {
    console.log(`\n[Agent]执行 计算器 工具`)
    try {
        const result = new Parser(expression).parse();
        if (!isFinite(result)) throw new Error("结果不是有限数");
        return `${expression} 的运算结果为 ${String(result)}`;
    } catch (err) {
        return `计算错误: ${(err as Error).message}`;
    }
}

class Parser {
    private pos = 0;

    constructor(private input: string) {}

    // 入口：解析整个表达式
    parse(): number {
        const value = this.parseExpression();
        this.skipSpaces();
        if (this.pos < this.input.length) {
            throw new Error(`无法解析的字符: '${this.input[this.pos]}'`);
        }
        return value;
    }

    // 加减（最低优先级）
    private parseExpression(): number {
        let value = this.parseTerm();
        while (true) {
            this.skipSpaces();
            const op = this.input[this.pos];
            if (op === "+" || op === "-") {
                this.pos++;
                const right = this.parseTerm();
                value = op === "+" ? value + right : value - right;
            } else {
                return value;
            }
        }
    }

    // 乘除
    private parseTerm(): number {
        let value = this.parseFactor();
        while (true) {
            this.skipSpaces();
            const op = this.input[this.pos];
            if (op === "*" || op === "/") {
                this.pos++;
                const right = this.parseFactor();
                if (op === "/" && right === 0) throw new Error("除数不能为 0");
                value = op === "*" ? value * right : value / right;
            } else {
                return value;
            }
        }
    }

    // 括号和数字（最高优先级）
    private parseFactor(): number {
        this.skipSpaces();
        const ch = this.input[this.pos];

        // 一元负号，如 -3、-(2+1)
        if (ch === "-") {
            this.pos++;
            return -this.parseFactor();
        }
        if (ch === "+") {
            this.pos++;
            return this.parseFactor();
        }

        // 括号
        if (ch === "(") {
            this.pos++;
            const value = this.parseExpression();
            this.skipSpaces();
            if (this.input[this.pos] !== ")") throw new Error("缺少右括号");
            this.pos++;
            return value;
        }

        // 数字
        return this.parseNumber();
    }

    private parseNumber(): number {
        this.skipSpaces();
        const start = this.pos;
        while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) {
            this.pos++;
        }
        if (start === this.pos) {
            throw new Error(`期望数字，但遇到 '${this.input[this.pos] ?? "结尾"}'`);
        }
        const num = Number(this.input.slice(start, this.pos));
        if (isNaN(num)) throw new Error(`非法数字: '${this.input.slice(start, this.pos)}'`);
        return num;
    }

    private skipSpaces(): void {
        while (this.pos < this.input.length && this.input[this.pos] === " ") {
            this.pos++;
        }
    }
}