import { Router, Request, Response } from 'express';
import { AIModel } from '../types/AIModel';
import { examsManager, questionsManager, getStudentExamsByClassId, getOpenQuestionsForExam } from '../services/dataService';
import { qstashService } from '../services/qstashService';

const router = Router();

/**
 * POST /api/trigger-ai-correction
 * Trigger AI correction for all student exams in a class
 */
router.post('/trigger-ai-correction', async (req: Request, res: Response) => {
  try {
    const { classId, model } = req.body;

    if (!classId || !model) {
      return res.status(400).json({ error: 'Class ID and model are required' });
    }

    if (model !== AIModel.GEMINI_2_5_FLASH) {
      return res.status(400).json({ error: 'Invalid model. Only Gemini 2.5 Flash is supported' });
    }

    // Buscar StudentExams por classId
    const studentExams = getStudentExamsByClassId(classId);

    if (studentExams.length === 0) {
      return res.status(404).json({ error: 'No student exams found for this class' });
    }

    // Calcular tempo estimado de conclusão
    // Cada correção leva aproximadamente: 2 segundos de processamento + 60 segundos de timeout = 62 segundos
    const totalOpenQuestions = studentExams.reduce((total, se) => {
      const exam = examsManager.getExamById(se.examId);
      if (!exam) return total;
      return total + exam.openQuestions;
    }, 0);
    
    // Tempo por questão: ~2 segundos de processamento + 60 segundos de timeout = 62 segundos
    const secondsPerQuestion = 62;
    const estimatedSeconds = totalOpenQuestions * secondsPerQuestion;
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    
    // Formata o tempo estimado
    let estimatedTime: string;
    if (estimatedMinutes < 1) {
      estimatedTime = 'menos de 1 minuto';
    } else if (estimatedMinutes === 1) {
      estimatedTime = '1 minuto';
    } else {
      estimatedTime = `${estimatedMinutes} minutos`;
    }

    // Loop pelos StudentExams e envia correções para QStash
    const messagesToQueue: Array<{
      studentExamId: number;
      questionId: number;
      questionText: string;
      studentAnswer: string;
      correctAnswer: string;
      model: string;
      questionType: 'open' | 'closed';
    }> = [];

    for (const studentExam of studentExams) {
      const exam = examsManager.getExamById(studentExam.examId);
      if (!exam) continue;

      // Get open questions for this exam
      const openQuestions = getOpenQuestionsForExam(exam.id);
      
      for (const question of openQuestions) {
        // Find student's answer for this question
        const studentAnswer = studentExam.answers.find(a => a.questionId === question.id);
        if (!studentAnswer) continue;

        // Get correct answer
        const correctAnswer = question.type === 'open' 
          ? (question.answer || '')
          : (question.options?.find(opt => opt.isCorrect)?.option || '');

        messagesToQueue.push({
          studentExamId: studentExam.id,
          questionId: question.id,
          questionText: question.question,
          studentAnswer: studentAnswer.answer,
          correctAnswer: correctAnswer,
          model: model,
          questionType: question.type
        });
      }
    }

    // Valida se QStash está configurado
    if (!qstashService.isConfigured()) {
      return res.status(500).json({ 
        error: 'QStash não está configurado. Configure o QSTASH_TOKEN no arquivo .env' 
      });
    }

    // Valida se há mensagens para enfileirar
    if (messagesToQueue.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhuma questão aberta encontrada para correção' 
      });
    }

    // Envia mensagens para QStash
    let queuedMessages = 0;
    let qstashErrors: string[] = [];

    try {
      const messageIds = await qstashService.publishBatch(messagesToQueue);
      queuedMessages = messageIds.length;
      
      if (messageIds.length < messagesToQueue.length) {
        qstashErrors.push(`${messagesToQueue.length - messageIds.length} mensagens falharam ao serem enfileiradas`);
      }
    } catch (error) {
      console.error('Error publishing to QStash:', error);
      return res.status(500).json({ 
        error: 'Erro ao enviar mensagens para QStash',
        details: (error as Error).message
      });
    }

    // Retorna que a correção foi iniciada e o tempo estimado de conclusão
    res.json({
      message: 'Correção iniciada com sucesso',
      estimatedTime: estimatedTime,
      totalStudentExams: studentExams.length,
      totalOpenQuestions: totalOpenQuestions,
      queuedMessages: queuedMessages,
      errors: qstashErrors.length > 0 ? qstashErrors : undefined
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

