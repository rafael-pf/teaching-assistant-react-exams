export interface IExamQuestion {
    questionId: string;
    score: number;
}

export interface IExam {
    id?: string;
    title: string;
    applicationDate: string;
    maxScore: number;
    status: 'In Editing' | 'Published' | 'Active' | 'Applied' | 'Completed';
    classId?: string;
    questions: IExamQuestion[];
    createdAt?: string;
    updatedAt?: string;
}

export class Exam {
    id?: string;
    title: string;
    applicationDate: string;
    maxScore: number;
    status: 'In Editing' | 'Published' | 'Active' | 'Applied' | 'Completed';
    classId?: string;
    questions: IExamQuestion[];
    createdAt?: string;
    updatedAt?: string;

    constructor(input: IExam) {
        this.id = input.id || this.generateId();
        this.title = input.title;
        this.applicationDate = input.applicationDate;
        this.maxScore = input.maxScore;
        this.status = input.status || 'In Editing';
        this.classId = input.classId;
        this.questions = input.questions || [];
        this.createdAt = input.createdAt || new Date().toISOString();
        this.updatedAt = input.updatedAt || new Date().toISOString();
    }

    addQuestion(questionId: string, score: number): { success: boolean; error?: string } {
        // Check if question already exists
        if (this.questions.find(q => q.questionId === questionId)) {
            return { success: false, error: 'Question already added to this exam' };
        }

        // Check if adding this score would exceed max score
        const currentTotal = this.getCurrentScore();
        if (currentTotal + score > this.maxScore) {
            return { 
                success: false, 
                error: `Total score would exceed the exam's maximum value (${this.maxScore} points)` 
            };
        }

        this.questions.push({ questionId, score });
        this.updatedAt = new Date().toISOString();
        return { success: true };
    }

    removeQuestion(questionId: string): boolean {
        const index = this.questions.findIndex(q => q.questionId === questionId);
        if (index === -1) return false;
        
        this.questions.splice(index, 1);
        this.updatedAt = new Date().toISOString();
        return true;
    }

    updateQuestionScore(questionId: string, newScore: number): { success: boolean; error?: string } {
        const questionIndex = this.questions.findIndex(q => q.questionId === questionId);
        if (questionIndex === -1) {
            return { success: false, error: 'Question not found in exam' };
        }

        // Calculate total without this question
        const otherQuestionsTotal = this.questions
            .filter((_, idx) => idx !== questionIndex)
            .reduce((sum, q) => sum + q.score, 0);

        if (otherQuestionsTotal + newScore > this.maxScore) {
            return { 
                success: false, 
                error: `Total score would exceed the exam's maximum value (${this.maxScore} points)` 
            };
        }

        this.questions[questionIndex].score = newScore;
        this.updatedAt = new Date().toISOString();
        return { success: true };
    }

    getCurrentScore(): number {
        return this.questions.reduce((sum, q) => sum + q.score, 0);
    }

    canEdit(): boolean {
        return this.status === 'In Editing';
    }

    publish(classId: string): { success: boolean; error?: string } {
        if (this.questions.length === 0) {
            return { success: false, error: 'Cannot publish exam with no questions' };
        }

        if (this.status !== 'In Editing') {
            return { success: false, error: 'Only exams in editing status can be published' };
        }

        this.status = 'Published';
        this.classId = classId;
        this.updatedAt = new Date().toISOString();
        return { success: true };
    }

    toJSON(): IExam {
        return {
            id: this.id,
            title: this.title,
            applicationDate: this.applicationDate,
            maxScore: this.maxScore,
            status: this.status,
            classId: this.classId,
            questions: this.questions.map(q => ({ ...q })),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    static fromJSON(data: IExam): Exam {
        return new Exam(data);
    }

    private generateId(): string {
        return `exam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }
}

export default Exam;
