export interface IQuestion {
    id?: string;
    tags: string[];
    text: string;
    options: [string, string, string, string, string];
    correctIndex: number; // 0..4
}

export default class Question implements IQuestion {
    id?: string;
    tags: string[];
    text: string;
    options: [string, string, string, string, string];
    correctIndex: number;

    constructor(input: IQuestion) {
        this.id = input.id;
        this.tags = Array.isArray(input.tags) ? input.tags.slice() : [];
        this.text = String(input.text || '');
        if (!Array.isArray(input.options) || input.options.length !== 5) {
            throw new Error('Question must have exactly 5 options.');
        }
        // ensure tuple type at runtime
        this.options = [
            String(input.options[0]),
            String(input.options[1]),
            String(input.options[2]),
            String(input.options[3]),
            String(input.options[4]),
        ];
        if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex > 4) {
            throw new Error('correctIndex must be an integer between 0 and 4.');
        }
        this.correctIndex = input.correctIndex;
    }

    // retorna a alternativa correta
    getCorrectOption(): string {
        return this.options[this.correctIndex];
    }

    // verifica se o índice passado é a alternativa correta
    isCorrect(index: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index > 4) return false;
        return index === this.correctIndex;
    }

    // verifica se o texto da alternativa passada é a correta
    isCorrectByOption(optionText: string): boolean {
        return this.getCorrectOption() === optionText;
    }

    // retorna uma cópia serializável
    toJSON(): IQuestion {
        return {
            id: this.id,
            tags: this.tags.slice(),
            text: this.text,
            options: [
                this.options[0],
                this.options[1],
                this.options[2],
                this.options[3],
                this.options[4],
            ],
            correctIndex: this.correctIndex,
        };
    }

    // cria uma instância a partir de um objeto plain (e.g. vindo do DB)
    static fromObject(obj: Partial<IQuestion>): Question {
        const input: IQuestion = {
            id: obj.id,
            tags: Array.isArray(obj.tags) ? obj.tags : [],
            text: String(obj.text ?? ''),
            options: (obj.options && obj.options.length === 5
                ? obj.options
                : ['', '', '', '', '']) as [string, string, string, string, string],
            correctIndex: Number.isInteger?.(obj.correctIndex as number) ? (obj.correctIndex as number) : 0,
        };
        return new Question(input);
    }
}