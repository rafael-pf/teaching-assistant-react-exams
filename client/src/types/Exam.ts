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

export interface ExamGenerationCriteria {
    subject: string;
    difficulty: string;
    quantity: number;
}

export interface ExamGenerationConfig {
    title: string;
    applicationDate: string;
    maxScore: number;
    criteria: ExamGenerationCriteria[];
}
