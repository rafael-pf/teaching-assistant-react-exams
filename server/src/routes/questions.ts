import { Router, Request, Response } from 'express';
import { questionBank, examService } from '../services/dataService';

const router = Router();

// GET /api/questions - Get all questions with optional filters
router.get('/questions', (req: Request, res: Response) => {
    try {
        const { status, subject, difficulty, tags } = req.query;
        
        const filters: any = {};
        if (status) filters.status = status;
        if (subject) filters.subject = subject;
        if (difficulty) filters.difficulty = difficulty;
        if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

        const questions = Object.keys(filters).length > 0 
            ? questionBank.getQuestions(filters)
            : questionBank.getAllQuestions();

        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// GET /api/questions/:id - Get question by ID
router.get('/questions/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const question = questionBank.getQuestionById(id);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        res.json(question);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

// GET /api/questions/code/:code - Get question by code
router.get('/questions/code/:code', (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const question = questionBank.getQuestionByCode(code);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        res.json(question);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

// POST /api/questions - Create a new question
router.post('/questions', (req: Request, res: Response) => {
    try {
        const questionData = req.body;

        if (!questionData.text) {
            return res.status(400).json({ error: 'Question text is required' });
        }

        const question = questionBank.addQuestion(questionData);
        res.status(201).json({
            question: question.toJSON(),
            message: 'Question successfully registered'
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// PUT /api/questions/:id - Update a question
router.put('/questions/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Get affected exams
        const affectedExams = examService.getExamsUsingQuestion(id);
        
        const result = questionBank.updateQuestion(id, updates, affectedExams);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        const message = result.impactedExams 
            ? `Question successfully updated. ${result.impactedExams} exam(s) were impacted.`
            : 'Question successfully updated';

        res.json({
            question: questionBank.getQuestionById(id),
            message,
            impactedExams: result.impactedExams
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// DELETE /api/questions/:id - Delete a question
router.delete('/questions/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if question is used in any exams
        const affectedExams = examService.getExamsUsingQuestion(id);
        if (affectedExams.length > 0) {
            return res.status(400).json({ 
                error: `Cannot delete question. It is used in ${affectedExams.length} exam(s)` 
            });
        }

        const success = questionBank.deleteQuestion(id);
        if (!success) {
            return res.status(404).json({ error: 'Question not found' });
        }

        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// GET /api/questions/search/:text - Search questions by text
router.get('/questions/search/:text', (req: Request, res: Response) => {
    try {
        const { text } = req.params;
        const questions = questionBank.searchQuestions(text);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search questions' });
    }
});

export default router;
