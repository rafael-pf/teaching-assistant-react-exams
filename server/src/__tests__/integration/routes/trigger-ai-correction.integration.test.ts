import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../../helpers/test-app';
import { examsManager, questionsManager } from '../../../services/dataService';
import { ExamRecord, StudentExamRecord } from '../../../models/Exams';
import { CreateQuestionInput } from '../../../models/Questions';
import { AIModel } from '../../../types/AIModel';
import * as qstashServiceModule from '../../../services/qstashService';

// Mock do QStash Service
jest.mock('../../../services/qstashService', () => ({
  qstashService: {
    isConfigured: jest.fn(),
    publishBatch: jest.fn(),
  },
}));

describe('POST /api/trigger-ai-correction - Teste de Integração', () => {
  let app: Express;
  const mockedQStashService = qstashServiceModule.qstashService as jest.Mocked<typeof qstashServiceModule.qstashService>;
  const classId = 'Engenharia de Software e Sistemas-2025-1';
  const model = AIModel.GEMINI_2_5_FLASH;

  beforeEach(() => {
    app = createTestApp();
    
    // Limpa dados de teste
    examsManager.replaceAll([]);
    questionsManager.replaceAll([]);
    // Limpa student exams também
    const allStudentExams = examsManager.getAllStudentExams();
    allStudentExams.forEach(se => {
      const exam = examsManager.getExamById(se.examId);
      if (exam) {
        examsManager.deleteExam(exam.id);
      }
    });

    // Configura mock do QStash
    mockedQStashService.isConfigured.mockReturnValue(true);
    mockedQStashService.publishBatch.mockImplementation(async (messages) => {
      // Retorna um ID para cada mensagem enviada
      return messages.map((_, index) => `msg-id-${index + 1}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('quando todos os componentes estão integrados corretamente', () => {
    it('deve buscar exames, studentExams e questões e enviar para QStash', async () => {
      // Arrange: Cria dados de teste integrando múltiplos componentes
      // 1. Cria questões abertas
      const question1: CreateQuestionInput = {
        question: 'Explique o conceito de arquitetura de software',
        topic: 'Arquitetura',
        type: 'open',
        answer: 'Arquitetura de software é a estrutura fundamental de um sistema...'
      };
      const question2: CreateQuestionInput = {
        question: 'Descreva os princípios SOLID',
        topic: 'Princípios',
        type: 'open',
        answer: 'SOLID são cinco princípios de design orientado a objetos...'
      };
      const q1 = questionsManager.addQuestion(question1);
      const q2 = questionsManager.addQuestion(question2);
      (q1 as any).id = 1;
      (q2 as any).id = 2;

      // 2. Cria exame para a classe
      const exam: ExamRecord = {
        id: 1,
        classId: classId,
        title: 'Prova de Arquitetura de Software',
        isValid: true,
        openQuestions: 2,
        closedQuestions: 0,
        questions: [1, 2]
      };
      examsManager.addExam(exam);

      // 3. Cria StudentExam com respostas dos alunos
      const studentExam: StudentExamRecord = {
        id: 1,
        studentCPF: '12345678900',
        examId: 1,
        answers: [
          { questionId: 1, answer: 'Arquitetura de software define a estrutura e organização de um sistema' },
          { questionId: 2, answer: 'SOLID são princípios que ajudam no design de código' }
        ]
      };
      examsManager.addStudentExam(studentExam);

      // Act: Faz requisição ao endpoint
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        })
        .set('Content-Type', 'application/json');

      // Assert: Verifica integração entre componentes
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Correção iniciada com sucesso');
      expect(response.body.totalStudentExams).toBe(1);
      expect(response.body.totalOpenQuestions).toBe(2);
      expect(response.body.queuedMessages).toBe(2);

      // Verifica que QStash foi chamado com dados corretos
      expect(mockedQStashService.publishBatch).toHaveBeenCalledTimes(1);
      const messagesSent = mockedQStashService.publishBatch.mock.calls[0][0];
      
      expect(messagesSent).toHaveLength(2);
      expect(messagesSent[0]).toMatchObject({
        studentExamId: 1,
        questionId: 1,
        questionText: 'Explique o conceito de arquitetura de software',
        studentAnswer: 'Arquitetura de software define a estrutura e organização de um sistema',
        correctAnswer: 'Arquitetura de software é a estrutura fundamental de um sistema...',
        model: model,
        questionType: 'open',
      });
    });

    it('deve calcular tempo estimado corretamente integrando examSet e studentExamSet', async () => {
      // Arrange: Cria múltiplos estudantes e questões
      const question1: CreateQuestionInput = {
        question: 'O que é REST?',
        topic: 'APIs',
        type: 'open',
        answer: 'REST é um estilo arquitetural para sistemas distribuídos'
      };
      const question2: CreateQuestionInput = {
        question: 'Explique o padrão MVC',
        topic: 'Padrões',
        type: 'open',
        answer: 'MVC separa a aplicação em Model, View e Controller'
      };
      const q1 = questionsManager.addQuestion(question1);
      const q2 = questionsManager.addQuestion(question2);
      (q1 as any).id = 10;
      (q2 as any).id = 11;

      const exam: ExamRecord = {
        id: 2,
        classId: classId,
        title: 'Prova de Padrões de Projeto',
        isValid: true,
        openQuestions: 2,
        closedQuestions: 0,
        questions: [10, 11]
      };
      examsManager.addExam(exam);

      // Cria dois exames de estudantes diferentes
      const studentExam1: StudentExamRecord = {
        id: 2,
        studentCPF: '11111111111',
        examId: 2,
        answers: [
          { questionId: 10, answer: 'REST é um protocolo de comunicação' },
          { questionId: 11, answer: 'MVC é um padrão de arquitetura' }
        ]
      };
      const studentExam2: StudentExamRecord = {
        id: 3,
        studentCPF: '22222222222',
        examId: 2,
        answers: [
          { questionId: 10, answer: 'RESTful API' },
          { questionId: 11, answer: 'Model View Controller' }
        ]
      };
      examsManager.addStudentExam(studentExam1);
      examsManager.addStudentExam(studentExam2);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica cálculo integrado
      // 2 questões abertas × 2 estudantes = 4 questões
      // 4 questões × 62 segundos = 248 segundos = ~5 minutos
      expect(response.status).toBe(200);
      expect(response.body.totalOpenQuestions).toBe(4);
      expect(response.body.totalStudentExams).toBe(2);
      expect(response.body.estimatedTime).toMatch(/minutos/);
      expect(response.body.queuedMessages).toBe(4);
    });

    it('deve filtrar apenas questões abertas integrando questionSet e examSet', async () => {
      // Arrange: Cria questões abertas e fechadas
      const openQuestion: CreateQuestionInput = {
        question: 'Explique testes de integração',
        topic: 'Testes',
        type: 'open',
        answer: 'Testes de integração verificam a interação entre componentes'
      };
      const closedQuestion: CreateQuestionInput = {
        question: 'Qual é a melhor prática para versionamento de API?',
        topic: 'APIs',
        type: 'closed',
        options: [
          { option: 'Versionamento por URL', isCorrect: true },
          { option: 'Sem versionamento', isCorrect: false }
        ]
      };
      const q1 = questionsManager.addQuestion(openQuestion);
      const q2 = questionsManager.addQuestion(closedQuestion);
      (q1 as any).id = 20;
      (q2 as any).id = 21;

      const exam: ExamRecord = {
        id: 3,
        classId: classId,
        title: 'Prova Mista',
        isValid: true,
        openQuestions: 1,
        closedQuestions: 1,
        questions: [20, 21]
      };
      examsManager.addExam(exam);

      const studentExam: StudentExamRecord = {
        id: 4,
        studentCPF: '33333333333',
        examId: 3,
        answers: [
          { questionId: 20, answer: 'Testes que verificam múltiplos componentes juntos' },
          { questionId: 21, answer: 'Versionamento por URL' }
        ]
      };
      examsManager.addStudentExam(studentExam);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica que apenas questões abertas foram enviadas
      expect(response.status).toBe(200);
      expect(response.body.totalOpenQuestions).toBe(1);
      
      const messagesSent = mockedQStashService.publishBatch.mock.calls[0][0];
      expect(messagesSent).toHaveLength(1);
      expect(messagesSent[0].questionId).toBe(20); // Apenas questão aberta
      expect(messagesSent[0].questionType).toBe('open');
    });

    it('deve retornar erro quando QStash não está configurado', async () => {
      // Arrange
      mockedQStashService.isConfigured.mockReturnValue(false);

      const exam: ExamRecord = {
        id: 99,
        classId: classId,
        title: 'Prova Teste',
        isValid: true,
        openQuestions: 1,
        closedQuestions: 0,
        questions: []
      };
      examsManager.addExam(exam);

      const studentExam: StudentExamRecord = {
        id: 99,
        studentCPF: '99999999999',
        examId: 99,
        answers: []
      };
      examsManager.addStudentExam(studentExam);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica integração com QStash
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('QStash não está configurado');
      expect(mockedQStashService.publishBatch).not.toHaveBeenCalled();
    });

    it('deve processar múltiplos exames da mesma classe corretamente', async () => {
      // Arrange: Cria dois exames diferentes para a mesma classe
      const question1: CreateQuestionInput = {
        question: 'Questão 1',
        topic: 'Tópico 1',
        type: 'open',
        answer: 'Resposta 1'
      };
      const question2: CreateQuestionInput = {
        question: 'Questão 2',
        topic: 'Tópico 2',
        type: 'open',
        answer: 'Resposta 2'
      };
      const q1 = questionsManager.addQuestion(question1);
      const q2 = questionsManager.addQuestion(question2);
      (q1 as any).id = 30;
      (q2 as any).id = 31;

      const exam1: ExamRecord = {
        id: 10,
        classId: classId,
        title: 'Prova Parcial 1',
        isValid: true,
        openQuestions: 1,
        closedQuestions: 0,
        questions: [30]
      };
      const exam2: ExamRecord = {
        id: 11,
        classId: classId,
        title: 'Prova Parcial 2',
        isValid: true,
        openQuestions: 1,
        closedQuestions: 0,
        questions: [31]
      };
      examsManager.addExam(exam1);
      examsManager.addExam(exam2);

      const studentExam1: StudentExamRecord = {
        id: 10,
        studentCPF: '11111111111',
        examId: 10,
        answers: [
          { questionId: 30, answer: 'Resposta aluno 1' }
        ]
      };
      const studentExam2: StudentExamRecord = {
        id: 11,
        studentCPF: '11111111111',
        examId: 11,
        answers: [
          { questionId: 31, answer: 'Resposta aluno 2' }
        ]
      };
      examsManager.addStudentExam(studentExam1);
      examsManager.addStudentExam(studentExam2);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica que processou ambos os exames
      expect(response.status).toBe(200);
      expect(response.body.totalStudentExams).toBe(2);
      expect(response.body.totalOpenQuestions).toBe(2);
      expect(response.body.queuedMessages).toBe(2);
    });
  });
});
