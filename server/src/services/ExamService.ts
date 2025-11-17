import { IExam, Exam } from '../models/Exam';
import { QuestionBankService } from './QuestionBankService';

export class ExamService {
    private exams: Map<string, Exam> = new Map();
    private questionBank: QuestionBankService;

    constructor(questionBank: QuestionBankService) {
        this.questionBank = questionBank;
    }

    // Create a new exam
    createExam(examData: IExam): Exam {
        const exam = new Exam(examData);
        this.exams.set(exam.id!, exam);
        return exam;
    }

    // Get all exams
    getAllExams(): IExam[] {
        return Array.from(this.exams.values()).map(e => e.toJSON());
    }

    // Get exam by ID
    getExamById(id: string): IExam | undefined {
        const exam = this.exams.get(id);
        return exam ? exam.toJSON() : undefined;
    }

    // Get exams by class
    getExamsByClass(classId: string): IExam[] {
        return Array.from(this.exams.values())
            .filter(e => e.classId === classId)
            .map(e => e.toJSON());
    }

    // Update exam
    updateExam(id: string, updates: Partial<IExam>): { success: boolean; error?: string } {
        const exam = this.exams.get(id);
        if (!exam) {
            return { success: false, error: 'Exam not found' };
        }

        // Prevent editing published exams' questions
        if (!exam.canEdit() && updates.questions) {
            return { success: false, error: 'Cannot edit questions of a published exam' };
        }

        try {
            // Apply updates
            Object.assign(exam, updates);
            exam.updatedAt = new Date().toISOString();
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    // Delete exam
    deleteExam(id: string): boolean {
        return this.exams.delete(id);
    }

    // Add question to exam
    addQuestionToExam(examId: string, questionId: string, score: number): { 
        success: boolean; 
        error?: string;
        currentScore?: number;
    } {
        const exam = this.exams.get(examId);
        if (!exam) {
            return { success: false, error: 'Exam not found' };
        }

        if (!exam.canEdit()) {
            return { success: false, error: 'Cannot add questions to a published exam' };
        }

        // Verify question exists
        const question = this.questionBank.getQuestionById(questionId);
        if (!question) {
            return { success: false, error: 'Question not found' };
        }

        // Check if question is active
        if (question.status !== 'Active') {
            return { success: false, error: 'Only active questions can be added to exams' };
        }

        const result = exam.addQuestion(questionId, score);
        if (result.success) {
            return { success: true, currentScore: exam.getCurrentScore() };
        }
        return result;
    }

    // Remove question from exam
    removeQuestionFromExam(examId: string, questionId: string): { success: boolean; error?: string } {
        const exam = this.exams.get(examId);
        if (!exam) {
            return { success: false, error: 'Exam not found' };
        }

        if (!exam.canEdit()) {
            return { success: false, error: 'Cannot remove questions from a published exam' };
        }

        const success = exam.removeQuestion(questionId);
        return { success, error: success ? undefined : 'Question not found in exam' };
    }

    // Update question score in exam
    updateQuestionScore(examId: string, questionId: string, newScore: number): { 
        success: boolean; 
        error?: string 
    } {
        const exam = this.exams.get(examId);
        if (!exam) {
            return { success: false, error: 'Exam not found' };
        }

        if (!exam.canEdit()) {
            return { success: false, error: 'Cannot update scores in a published exam' };
        }

        return exam.updateQuestionScore(questionId, newScore);
    }

    // Generate exam automatically
    generateExam(config: {
        title: string;
        applicationDate: string;
        maxScore: number;
        criteria: Array<{
            subject: string;
            difficulty: string;
            quantity: number;
        }>;
    }): { success: boolean; exam?: IExam; error?: string } {
        // Get random questions based on criteria
        const result = this.questionBank.getRandomQuestions(config.criteria);
        
        if (result.errors && result.errors.length > 0) {
            return { success: false, error: result.errors[0] };
        }

        // Create exam
        const exam = new Exam({
            title: config.title,
            applicationDate: config.applicationDate,
            maxScore: config.maxScore,
            status: 'In Editing',
            questions: []
        });

        // Calculate score per question (distribute evenly)
        const totalQuestions = result.questions.length;
        const scorePerQuestion = config.maxScore / totalQuestions;

        // Add questions to exam
        result.questions.forEach(q => {
            if (q.id) {
                exam.addQuestion(q.id, scorePerQuestion);
            }
        });

        this.exams.set(exam.id!, exam);
        return { success: true, exam: exam.toJSON() };
    }

    // Publish exam
    publishExam(examId: string, classId: string): { success: boolean; error?: string } {
        const exam = this.exams.get(examId);
        if (!exam) {
            return { success: false, error: 'Exam not found' };
        }

        const result = exam.publish(classId);
        return result;
    }

    // Get exams that use a specific question
    getExamsUsingQuestion(questionId: string): Exam[] {
        return Array.from(this.exams.values()).filter(exam =>
            exam.questions.some(q => q.questionId === questionId)
        );
    }

    // Load exams from JSON
    loadExams(exams: IExam[]): void {
        exams.forEach(e => {
            try {
                const exam = Exam.fromJSON(e);
                if (exam.id) {
                    this.exams.set(exam.id, exam);
                }
            } catch (error) {
                console.error('Error loading exam:', error);
            }
        });
    }

    // Clear all exams
    clear(): void {
        this.exams.clear();
    }
}
