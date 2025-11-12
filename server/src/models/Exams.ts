// server/src/models/Exams.ts
import { IQuestion } from './Questions';
import Question from './Questions';


export class Exams {
    // store Question instances internally for validation and helpers
    private questions: Question[] = [];

    constructor(initialQuestions?: (Question | IQuestion)[]) {
        if (initialQuestions && Array.isArray(initialQuestions)) {
            // instantiate/copy to ensure validation and avoid external refs
            this.questions = initialQuestions.map((q) => {
                const inst = q instanceof Question ? q : Question.fromObject(q);
                // clone to decouple from caller
                return Question.fromObject(inst.toJSON());
            });
        }
    }

    // retorna cópia do array de questões
    // returns serializable plain objects (IQuestion)
    getQuestions(): IQuestion[] {
        return this.questions.map((q) => q.toJSON());
    }

    // número de questões
    count(): number {
        return this.questions.length;
    }

    // adiciona uma questão, gerando id se necessário, e retorna o id
    addQuestion(q: Question | IQuestion): string {
        // ensure we have a validated Question instance
        const inst = q instanceof Question ? q : Question.fromObject(q);
        if (!inst.id) {
            inst.id = this.generateId();
        }
        // store a copy
        this.questions.push(Question.fromObject(inst.toJSON()));
        return inst.id!;
    }

    // obtém uma questão por id (retorna cópia) ou undefined
    getQuestionById(id: string): IQuestion | undefined {
        const found = this.questions.find((q) => q.id === id);
        return found ? found.toJSON() : undefined;
    }

    // remove uma questão por id, retorna true se removida
    removeQuestionById(id: string): boolean {
        const idx = this.questions.findIndex((q) => q.id === id);
        if (idx === -1) return false;
        this.questions.splice(idx, 1);
        return true;
    }

    // atualiza parcialmente uma questão por id, retorna true se atualizada
    updateQuestionById(id: string, patch: Partial<IQuestion>): boolean {
        const idx = this.questions.findIndex((q) => q.id === id);
        if (idx === -1) return false;
        // merge into a plain object then revalidate via Question
        const merged: IQuestion = { ...this.questions[idx].toJSON(), ...patch, id: this.questions[idx].id };
        try {
            const inst = Question.fromObject(merged);
            this.questions[idx] = inst;
            return true;
        } catch (err) {
            // invalid patch
            return false;
        }
    }

    // remove todas as questões
    clear(): void {
        this.questions = [];
    }

    // serialização simples
    toJSON(): IQuestion[] {
        return this.getQuestions();
    }

    // helper para gerar ids simples
    private generateId(): string {
        return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }
}