import { Question, IClosedQuestion, IOpenQuestion } from '../types/Question';

const API_BASE_URL = 'http://localhost:3005/api';

export class QuestionService {
    // Get all questions with optional filters
    static async getAllQuestions(filters?: {
        status?: string;
        subject?: string;
        difficulty?: string;
        tags?: string[];
    }): Promise<Question[]> {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.status) params.append('status', filters.status);
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.difficulty) params.append('difficulty', filters.difficulty);
            if (filters.tags) {
                filters.tags.forEach(tag => params.append('tags', tag));
            }
        }

        const url = `${API_BASE_URL}/questions${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch questions');
        }
        
        return response.json();
    }

    // Get question by ID
    static async getQuestionById(id: string): Promise<Question> {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch question');
        }
        
        return response.json();
    }

    // Get question by code
    static async getQuestionByCode(code: string): Promise<Question> {
        const response = await fetch(`${API_BASE_URL}/questions/code/${code}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch question');
        }
        
        return response.json();
    }

    // Create a new question
    static async createQuestion(question: IClosedQuestion | IOpenQuestion): Promise<{
        question: Question;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(question),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create question');
        }
        
        return response.json();
    }

    // Update a question
    static async updateQuestion(id: string, updates: Partial<Question>): Promise<{
        question: Question;
        message: string;
        impactedExams?: number;
    }> {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update question');
        }
        
        return response.json();
    }

    // Delete a question
    static async deleteQuestion(id: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete question');
        }
    }

    // Search questions by text
    static async searchQuestions(searchText: string): Promise<Question[]> {
        const response = await fetch(`${API_BASE_URL}/questions/search/${encodeURIComponent(searchText)}`);
        
        if (!response.ok) {
            throw new Error('Failed to search questions');
        }
        
        return response.json();
    }
}

export default QuestionService;
