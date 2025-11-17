export interface IBaseQuestion {
    id?: string;
    code?: string;
    tags: string[];
    text: string;
    subject?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    status?: 'Active' | 'Inactive' | 'Archived';
    createdAt?: string;
    updatedAt?: string;
}

export interface IClosedQuestion extends IBaseQuestion {
    type: 'closed';
    options: string[];
    correctIndices: number[];
    correctIndex?: number; // For backward compatibility
}

export interface IOpenQuestion extends IBaseQuestion {
    type: 'open';
    answer?: string;
}

export type Question = IClosedQuestion | IOpenQuestion;
