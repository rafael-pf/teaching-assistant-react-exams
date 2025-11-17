import { IQuestion, Question } from '../models/Questions';
import { IExam, Exam } from '../models/Exam';

export class QuestionBankService {
    private questions: Map<string, Question> = new Map();
    private codeCounter: number = 1;

    // Add a question to the bank
    addQuestion(question: IQuestion): Question {
        const questionObj = Question.fromObject(question);
        
       
        // Generate ID if not provided
        if (!questionObj.id) {
            questionObj.id = this.generateId();
        }

        // Set default status if not provided
        if (!questionObj.status) {
            questionObj.status = 'Active';
        }

        // Set timestamps
        questionObj.createdAt = questionObj.createdAt || new Date().toISOString();
        questionObj.updatedAt = new Date().toISOString();

        this.questions.set(questionObj.id, questionObj);
        return questionObj;
    }

    // Get all questions
    getAllQuestions(): IQuestion[] {
        return Array.from(this.questions.values()).map(q => q.toJSON());
    }

    // Get questions with filters
    getQuestions(filters?: {
        status?: string;
        subject?: string;
        difficulty?: string;
        tags?: string[];
    }): IQuestion[] {
        let questions = Array.from(this.questions.values());

        if (filters) {
            if (filters.status) {
                questions = questions.filter(q => q.status === filters.status);
            }
            if (filters.subject) {
                questions = questions.filter(q => q.subject === filters.subject);
            }
            if (filters.difficulty) {
                questions = questions.filter(q => q.difficulty === filters.difficulty);
            }
            if (filters.tags && filters.tags.length > 0) {
                questions = questions.filter(q => 
                    filters.tags!.some(tag => q.tags.includes(tag))
                );
            }
        }

        return questions.map(q => q.toJSON());
    }

    // Get question by ID
    getQuestionById(id: string): IQuestion | undefined {
        const question = this.questions.get(id);
        return question ? question.toJSON() : undefined;
    }

    // Get question by code
    getQuestionByID(id: string): IQuestion | undefined {
        const question = Array.from(this.questions.values()).find(q => q.id === id);
        return question ? question.toJSON() : undefined;
    }

    // Update question
    updateQuestion(id: string, updates: Partial<IQuestion>, exams?: Exam[]): { 
        success: boolean; 
        error?: string; 
        impactedExams?: number 
    } {
        const question = this.questions.get(id);
        if (!question) {
            return { success: false, error: 'Question not found' };
        }

        // Check if correctIndices are being changed
        const correctIndicesChanged = updates.hasOwnProperty('correctIndices');
        let impactedExamsCount = 0;

        if (correctIndicesChanged && exams) {
            // Find exams that use this question
            const affectedExams = exams.filter(exam => 
                exam.questions.some(q => q.questionId === id) &&
                (exam.status === 'Active' || exam.status === 'Applied' || exam.status === 'Published')
            );
            impactedExamsCount = affectedExams.length;
        }

        // Merge updates
        const merged = { ...question.toJSON(), ...updates, id, updatedAt: new Date().toISOString() };
        
        try {
            const updatedQuestion = Question.fromObject(merged);
            this.questions.set(id, updatedQuestion);
            
            return { 
                success: true, 
                impactedExams: impactedExamsCount > 0 ? impactedExamsCount : undefined 
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    // Delete question
    deleteQuestion(id: string): boolean {
        return this.questions.delete(id);
    }

    // Search questions by text
    searchQuestions(searchText: string): IQuestion[] {
        const lowerSearch = searchText.toLowerCase();
        return Array.from(this.questions.values())
            .filter(q => 
                q.text.toLowerCase().includes(lowerSearch) ||
                q.code?.toLowerCase().includes(lowerSearch)
            )
            .map(q => q.toJSON());
    }

    // Count questions by filters (for exam generation validation)
    countQuestions(filters: {
        subject?: string;
        difficulty?: string;
        status?: string;
    }): number {
        let questions = Array.from(this.questions.values());

        if (filters.status) {
            questions = questions.filter(q => q.status === filters.status);
        }
        if (filters.subject) {
            questions = questions.filter(q => q.subject === filters.subject);
        }
        if (filters.difficulty) {
            questions = questions.filter(q => q.difficulty === filters.difficulty);
        }

        return questions.length;
    }

    // Get random questions for exam generation
    getRandomQuestions(criteria: Array<{
        subject: string;
        difficulty: string;
        quantity: number;
    }>): { questions: IQuestion[]; errors?: string[] } {
        const selectedQuestions: IQuestion[] = [];
        const errors: string[] = [];

        for (const criterion of criteria) {
            const available = Array.from(this.questions.values()).filter(q =>
                q.subject === criterion.subject &&
                q.difficulty === criterion.difficulty &&
                q.status === 'Active' &&
                !selectedQuestions.find(sq => sq.id === q.id)
            );

            if (available.length < criterion.quantity) {
                const missing = criterion.quantity - available.length;
                errors.push(
                    `There are not enough questions to generate the exam. ${missing} ${criterion.subject} (${criterion.difficulty} Difficulty) questions are missing.`
                );
            }
            
            // Randomly select questions
            const shuffled = available.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, criterion.quantity);
            selectedQuestions.push(...selected.map(q => q.toJSON()));
        }

        if (errors.length > 0) {
            return { questions: [], errors };
        }

        return { questions: selectedQuestions };
    }

    // Load questions from JSON
    loadQuestions(questions: IQuestion[]): void {
        questions.forEach(q => {
            try {
                const questionObj = Question.fromObject(q);
                if (questionObj.id) {
                    this.questions.set(questionObj.id, questionObj);
                    
                    // Update code counter
                    if (questionObj.id && questionObj.id.startsWith('QST')) {
                        const codeNum = parseInt(questionObj.id.substring(3));
                        if (!isNaN(codeNum) && codeNum >= this.codeCounter) {
                            this.codeCounter = codeNum + 1;
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading question:', error);
            }
        });
    }

    // Clear all questions
    clear(): void {
        this.questions.clear();
        this.codeCounter = 1;
    }

    private generateId(): string {
        return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }
}
