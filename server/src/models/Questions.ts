export interface IBaseQuestion {
    id?: string;
    tags: string[];
    text: string;
}

export interface IClosedQuestion extends IBaseQuestion {
    options: string[];
    // changed: allow multiple correct answers
    correctIndices: number[];
}
    
export interface IOpenQuestion extends IBaseQuestion {
    answer?: string; 
}

export type IQuestion = IClosedQuestion | IOpenQuestion;

export abstract class Question implements IBaseQuestion {
    id?: string;
    tags: string[];
    text: string;

    constructor(input: IBaseQuestion) {
        this.id = input.id;
        this.tags = Array.isArray(input.tags) ? input.tags.slice() : [];
        this.text = String(input.text ?? '');
    }

    toJSON(): IBaseQuestion {
        return {
            id: this.id,
            tags: this.tags.slice(),
            text: this.text,
        };
    }


    static fromObject(obj: Partial<IQuestion>): Question {
        const type = (obj as any).type as string | undefined;
        if (type === 'open') {
            return OpenQuestion.fromObject(obj as Partial<IOpenQuestion>);
        }
        if (type === 'closed') {
            return ClosedQuestion.fromObject(obj as Partial<IClosedQuestion>);
        }

        // fallback: presence of options -> closed, otherwise open
        if (Array.isArray((obj as Partial<IClosedQuestion>).options)) {
            return ClosedQuestion.fromObject(obj as Partial<IClosedQuestion>);
        }
        return OpenQuestion.fromObject(obj as Partial<IOpenQuestion>);
    }
}

export class ClosedQuestion extends Question implements IClosedQuestion {
    options: string[];
    // changed from correctIndex: number to correctIndices: number[]
    correctIndices: number[];

    constructor(input: IClosedQuestion) {
        super(input);
        if (!Array.isArray(input.options) || input.options.length < 2) {
            throw new Error('ClosedQuestion must have at least 2 options.');
        }
        this.options = input.options.map((o) => String(o));

        // validate correctIndices
        if (!Array.isArray(input.correctIndices) || input.correctIndices.length < 1) {
            throw new Error('ClosedQuestion must have at least one correct index.');
        }
        // ensure integers, within bounds, unique
        const normalized = input.correctIndices.map((n) => Number(n));
        for (const n of normalized) {
            if (!Number.isInteger(n) || n < 0 || n >= this.options.length) {
                throw new Error(`Each correct index must be an integer between 0 and ${this.options.length - 1}.`);
            }
        }
        // make unique and preserve order
        this.correctIndices = Array.from(new Set(normalized));
    }

    // returns all correct option texts
    getCorrectOptions(): string[] {
        return this.correctIndices.map(i => this.options[i]);
    }

    // keep single-option getter for compatibility (returns first correct option)
    getCorrectOption(): string {
        return this.getCorrectOptions()[0];
    }

    isCorrect(index: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index >= this.options.length) return false;
        return this.correctIndices.includes(index);
    }

    isCorrectByOption(optionText: string): boolean {
        return this.getCorrectOptions().includes(optionText);
    }

    toJSON(): IClosedQuestion & { type: 'closed'; correctIndex?: number } {
        // include correctIndices, and for compatibility include correctIndex when there's exactly one
        const base = {
            ...super.toJSON(),
            options: this.options.slice(),
            correctIndices: this.correctIndices.slice(),
            type: 'closed' as const,
        } as any;
        if (this.correctIndices.length === 1) {
            base.correctIndex = this.correctIndices[0];
        }
        return base;
    }

    static fromObject(obj: Partial<IClosedQuestion & { correctIndex?: number }>): ClosedQuestion {
        const opts = Array.isArray(obj.options) && obj.options.length >= 2
            ? obj.options.map((o) => String(o))
            : ['', ''];

        // support legacy single correctIndex or new correctIndices array
        let indices: number[] = [];
        if (Array.isArray((obj as any).correctIndices)) {
            indices = (obj as any).correctIndices.map((n: any) => Number(n));
        } else if ((obj as any).correctIndex !== undefined && Number.isInteger((obj as any).correctIndex)) {
            indices = [Number((obj as any).correctIndex)];
        } else {
            indices = [0];
        }

        const input: IClosedQuestion = {
            id: obj.id,
            tags: Array.isArray(obj.tags) ? obj.tags : [],
            text: String(obj.text ?? ''),
            options: opts,
            correctIndices: indices,
        };
        return new ClosedQuestion(input);
    }
}

export class OpenQuestion extends Question implements IOpenQuestion {
    answer?: string;

    constructor(input: IOpenQuestion) {
        super(input);
        this.answer = input.answer !== undefined ? String(input.answer) : undefined;
    }

    toJSON(): IOpenQuestion & { type: 'open' } {
        return {
            ...super.toJSON(),
            answer: this.answer,
            type: 'open',
        };
    }

    static fromObject(obj: Partial<IOpenQuestion>): OpenQuestion {
        const input: IOpenQuestion = {
            id: obj.id,
            tags: Array.isArray(obj.tags) ? obj.tags : [],
            text: String(obj.text ?? ''),
            answer: obj.answer !== undefined ? String(obj.answer) : undefined,
        };
        return new OpenQuestion(input);
    }
}

// default export kept as ClosedQuestion for backward compatibility with existing code that expects a Question class representing closed/multiple-choice.
export default Question;