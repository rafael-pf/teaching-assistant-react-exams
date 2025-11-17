import { IExam, ExamGenerationConfig } from '../types/Exam';

const API_BASE_URL = 'http://localhost:3005/api';

export class ExamService {
    // Get all exams, optionally filtered by class
    static async getAllExams(classId?: string): Promise<IExam[]> {
        const url = classId 
            ? `${API_BASE_URL}/exams?classId=${classId}`
            : `${API_BASE_URL}/exams`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch exams');
        }
        
        return response.json();
    }

    // Get exam by ID
    static async getExamById(id: string): Promise<IExam> {
        const response = await fetch(`${API_BASE_URL}/exams/${id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch exam');
        }
        
        return response.json();
    }

    // Get exam with full question details
    static async getExamDetails(id: string): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/exams/${id}/details`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch exam details');
        }
        
        return response.json();
    }

    // Create a new exam
    static async createExam(exam: Omit<IExam, 'id' | 'questions' | 'createdAt' | 'updatedAt'>): Promise<{
        exam: IExam;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/exams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exam),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create exam');
        }
        
        return response.json();
    }

    // Update an exam
    static async updateExam(id: string, updates: Partial<IExam>): Promise<{
        exam: IExam;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/exams/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update exam');
        }
        
        return response.json();
    }

    // Delete an exam
    static async deleteExam(id: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/exams/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete exam');
        }
    }

    // Add a question to an exam
    static async addQuestionToExam(examId: string, questionId: string, score: number): Promise<{
        exam: IExam;
        currentScore: number;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ questionId, score }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add question to exam');
        }
        
        return response.json();
    }

    // Remove a question from an exam
    static async removeQuestionFromExam(examId: string, questionId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions/${questionId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove question from exam');
        }
    }

    // Update question score in an exam
    static async updateQuestionScore(examId: string, questionId: string, score: number): Promise<{
        exam: IExam;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update question score');
        }
        
        return response.json();
    }

    // Generate exam automatically
    static async generateExam(config: ExamGenerationConfig): Promise<{
        exam: IExam;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/exams/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate exam');
        }
        
        return response.json();
    }

    // Publish an exam
    static async publishExam(examId: string, classId: string): Promise<{
        exam: IExam;
        message: string;
    }> {
        const response = await fetch(`${API_BASE_URL}/exams/${examId}/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ classId }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to publish exam');
        }
        
        return response.json();
    }
}

export default ExamService;
