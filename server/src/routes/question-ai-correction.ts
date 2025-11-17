import { Router, Request, Response } from 'express';
import { AICorrectionRequest, AIModel } from '../types/AIModel';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { IAIService } from '../services/ai/IAIService';
import { studentExamSet } from '../services/dataService';
import { triggerSaveStudentsExams } from '../services/dataService';
import { geminiConfig } from '../config';

const router = Router();

/**
 * POST /api/question-ai-correction
 * Question AI correction - corrige uma questão específica de um exame de estudante
 * Esta rota pode ser chamada diretamente ou via webhook do QStash
 */
router.post('/question-ai-correction', async (req: Request, res: Response) => {
  try {
    const { id: studentExamId, model, questionId, questionText, studentAnswer, correctAnswer } = req.body;
  
    if (!studentExamId || !model || !questionId || !questionText || !studentAnswer || !correctAnswer) {
      return res.status(400).json({ 
        error: 'Student exam ID, model, question ID, question text, student answer and correct answer are required' 
      });
    }

    // Valida modelo
    if (model !== AIModel.GEMINI_2_5_FLASH) {
      return res.status(400).json({ error: 'Invalid model. Only Gemini 2.5 Flash is supported' });
    }

    // Busca o StudentExam
    const studentExam = studentExamSet.findStudentExamById(studentExamId);
    if (!studentExam) {
      return res.status(404).json({ error: 'Student exam not found' });
    }
    
    // Cria o serviço de IA
    const aiService: IAIService = AIServiceFactory.create({
      model: AIModel.GEMINI_2_5_FLASH,
      apiKey: geminiConfig.apiKey,
      timeout: geminiConfig.timeout,
      maxRetries: geminiConfig.maxRetries
    });

    // Valida configuração
    const isValid = await aiService.validateConfiguration();
    if (!isValid) {
      return res.status(500).json({ error: 'AI service configuration is invalid' });
    }

    // Prepara requisição de correção
    const aiCorrectionRequest: AICorrectionRequest = {
      questionId: questionId,
      questionText: questionText,
      questionType: 'open',
      studentAnswer: studentAnswer,
      correctAnswer: correctAnswer,
      context: 'Você é um professor corrigindo uma prova. Seja justo e preciso na avaliação.'
    };

    // Executa correção
    const aiCorrectionResponse = await aiService.correctAnswer(aiCorrectionRequest);
    
    // Converte score de 0-10 para 0-100 (porcentagem)
    const percentageScore = (aiCorrectionResponse.score / 10) * 100;

    // Atualiza o StudentExam com a pontuação (0% - 100%) que o aluno obteve na questão
    const updated = studentExam.setAnswerScore(questionId, percentageScore);
    
    if (!updated) {
      // Se a resposta não existe, cria uma nova
      studentExam.addOrUpdateAnswer(questionId, studentAnswer, percentageScore);
    }

    // Salva as alterações
    triggerSaveStudentsExams();

    // Timeout de 1 minuto antes de retornar a resposta
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 segundos = 1 minuto

    // Retorna a resposta da API de correção
    res.json({
      message: 'Question AI correction completed successfully',
      studentExamId: studentExamId,
      questionId: questionId,
      score: percentageScore,
      isCorrect: aiCorrectionResponse.isCorrect,
      feedback: aiCorrectionResponse.feedback,
      confidence: aiCorrectionResponse.confidence
    });
  } catch (error) {
    console.error('Error in question AI correction:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

