
export interface IQuestion {
    id?: string;
    tags: string[];
    text: string;
    // allow any number of options (at least 2)
    options: string[];
    correctIndex: number; // 0..options.length-1
}

export default class Question implements IQuestion {
    id?: string;
    tags: string[];
    text: string;
    options: string[];
    correctIndex: number;

    constructor(input: IQuestion) {
        this.id = input.id;
        this.tags = Array.isArray(input.tags) ? input.tags.slice() : [];
        this.text = String(input.text || '');

        if (!Array.isArray(input.options) || input.options.length < 2) {
            throw new Error('Question must have at least 2 options.');
        }

        // normalize options to strings
        this.options = input.options.map((o) => String(o));

        if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex >= this.options.length) {
            throw new Error(`correctIndex must be an integer between 0 and ${this.options.length - 1}.`);
        }

        this.correctIndex = input.correctIndex;
    }

    // retorna a alternativa correta
    getCorrectOption(): string {
        return this.options[this.correctIndex];
    }

    // verifica se o índice passado é a alternativa correta
    isCorrect(index: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index >= this.options.length) return false;
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
            options: this.options.slice(),
            correctIndex: this.correctIndex,
        };
    }

    // cria uma instância a partir de um objeto plain (e.g. vindo do DB)
    static fromObject(obj: Partial<IQuestion>): Question {
        const opts = Array.isArray(obj.options) && obj.options.length >= 2
            ? obj.options.map((o) => String(o))
            : ['', ''];

        const input: IQuestion = {
            id: obj.id,
            tags: Array.isArray(obj.tags) ? obj.tags : [],
            text: String(obj.text ?? ''),
            options: opts,
            correctIndex: Number.isInteger(obj.correctIndex as number) ? (obj.correctIndex as number) : 0,
        };

        return new Question(input);
    }
}