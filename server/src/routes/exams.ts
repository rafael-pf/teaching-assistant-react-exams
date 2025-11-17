import { Router, Request, Response } from 'express';
import { examService, questionBank, triggerSave } from '../services/dataService';

const router = Router();

// GET /api/exams - Get all exams
router.get('/exams', (req: Request, res: Response) => {
    try {
        const { classId } = req.query;
        
        const exams = classId 
            ? examService.getExamsByClass(classId as string)
            : examService.getAllExams();

        res.json(exams);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exams' });
    }
});

// GET /api/exams/:id - Get exam by ID
router.get('/exams/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const exam = examService.getExamById(id);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        res.json(exam);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exam' });
    }
});

// GET /api/exams/:id/details - Get exam with question details
router.get('/exams/:id/details', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const exam = examService.getExamById(id);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Get full question details
        const questionsWithDetails = exam.questions.map((eq: { questionId: string; score: number }) => {
            const question = questionBank.getQuestionById(eq.questionId);
            return {
                ...eq,
                questionDetails: question
            };
        });

        res.json({
            ...exam,
            questions: questionsWithDetails
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exam details' });
    }
});

// POST /api/exams - Create a new exam
router.post('/exams', (req: Request, res: Response) => {
    try {
        const examData = req.body;

        if (!examData.title) {
            return res.status(400).json({ error: 'Exam title is required' });
        }

        if (!examData.applicationDate) {
            return res.status(400).json({ error: 'Application date is required' });
        }

        if (!examData.maxScore || examData.maxScore <= 0) {
            return res.status(400).json({ error: 'Valid maximum score is required' });
        }

        const exam = examService.createExam({
            ...examData,
            questions: []
        });

        triggerSave();
        res.status(201).json({
            exam: exam.toJSON(),
            message: 'Exam successfully created'
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// PUT /api/exams/:id - Update an exam
router.put('/exams/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const result = examService.updateExam(id, updates);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        triggerSave();
        res.json({
            exam: examService.getExamById(id),
            message: 'Exam successfully updated'
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// DELETE /api/exams/:id - Delete an exam
router.delete('/exams/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const success = examService.deleteExam(id);

        if (!success) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        triggerSave();
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /api/exams/:id/questions - Add a question to an exam
router.post('/exams/:id/questions', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { questionId, score } = req.body;

        if (!questionId) {
            return res.status(400).json({ error: 'Question ID is required' });
        }

        if (score === undefined || score <= 0) {
            return res.status(400).json({ error: 'Valid score is required' });
        }

        const result = examService.addQuestionToExam(id, questionId, score);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        triggerSave();
        res.json({
            exam: examService.getExamById(id),
            currentScore: result.currentScore,
            message: 'Question successfully added'
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// DELETE /api/exams/:id/questions/:questionId - Remove a question from an exam
router.delete('/exams/:id/questions/:questionId', (req: Request, res: Response) => {
    try {
        const { id, questionId } = req.params;
        const result = examService.removeQuestionFromExam(id, questionId);

        if (!result.success) {
            return res.status(404).json({ error: result.error });
        }

        triggerSave();
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// PUT /api/exams/:id/questions/:questionId - Update question score in an exam
router.put('/exams/:id/questions/:questionId', (req: Request, res: Response) => {
    try {
        const { id, questionId } = req.params;
        const { score } = req.body;

        if (score === undefined || score <= 0) {
            return res.status(400).json({ error: 'Valid score is required' });
        }

        const result = examService.updateQuestionScore(id, questionId, score);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        triggerSave();
        res.json({
            exam: examService.getExamById(id),
            message: 'Score successfully updated'
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /api/exams/generate - Generate exam automatically
router.post('/exams/generate', (req: Request, res: Response) => {
    try {
        const { title, applicationDate, maxScore, criteria } = req.body;

        if (!title || !applicationDate || !maxScore || !criteria) {
            return res.status(400).json({ 
                error: 'Title, application date, max score, and criteria are required' 
            });
        }

        const result = examService.generateExam({
            title,
            applicationDate,
            maxScore,
            criteria
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        triggerSave();
        res.status(201).json({
            exam: result.exam,
            message: 'Exam successfully generated! Review before finalizing.'
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /api/exams/:id/publish - Publish an exam
router.post('/exams/:id/publish', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { classId } = req.body;

        if (!classId) {
            return res.status(400).json({ error: 'Class ID is required' });
        }

        const result = examService.publishExam(id, classId);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        triggerSave();
        res.json({
            exam: examService.getExamById(id),
            message: `Exam successfully published for Class ${classId}`
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

export default router;
