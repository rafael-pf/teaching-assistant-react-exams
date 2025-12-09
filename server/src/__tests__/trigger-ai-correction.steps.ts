import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { Response } from 'supertest';
import express, { Express } from 'express';
import { createTestApp } from './helpers/test-app';
import { examsManager, questionsManager } from '../services/dataService';
import { ExamRecord, StudentExamRecord } from '../models/Exams';
import { CreateQuestionInput } from '../models/Questions';
import { AIModel } from '../types/AIModel';
import * as qstashServiceModule from '../services/qstashService';

// Mock do QStash Service
jest.mock('../services/qstashService', () => ({
  qstashService: {
    isConfigured: jest.fn(),
    publishBatch: jest.fn(),
  },
}));

const feature = loadFeature('./src/__tests__/features/trigger-ai-correction.feature');

defineFeature(feature, (test) => {
  let app: Express;
  let response: Response;
  const mockedQStashService = qstashServiceModule.qstashService as jest.Mocked<typeof qstashServiceModule.qstashService>;

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

    // Configura mock padrão do QStash
    mockedQStashService.isConfigured.mockReturnValue(true);
    mockedQStashService.publishBatch.mockImplementation(async (messages) => {
      return messages.map((_, index) => `msg-id-${index + 1}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Iniciar correção AI com sucesso', ({ given, when, then, and }) => {
    given(/^existe uma classe com id "(.*)"$/, (classId: string) => {
      // Classe existe implicitamente quando há exames
    });

    and(/^existem exames de estudantes para a classe "(.*)"$/, (classId: string) => {
      // Cria questões
      const question1: CreateQuestionInput = {
        question: 'Explique arquitetura de software',
        topic: 'Arquitetura',
        type: 'open',
        answer: 'Arquitetura é...'
      };
      const question2: CreateQuestionInput = {
        question: 'Descreva SOLID',
        topic: 'Princípios',
        type: 'open',
        answer: 'SOLID são...'
      };
      const q1 = questionsManager.addQuestion(question1);
      const q2 = questionsManager.addQuestion(question2);
      
      // Override IDs para manter consistência
      (q1 as any).id = 1;
      (q2 as any).id = 2;

      // Cria exame
      const exam: ExamRecord = {
        id: 1,
        classId: classId,
        title: 'Prova de Arquitetura',
        isValid: true,
        openQuestions: 2,
        closedQuestions: 0,
        questions: [1, 2]
      };
      examsManager.addExam(exam);

      // Cria StudentExam
      const studentExam: StudentExamRecord = {
        id: 1,
        studentCPF: '12345678900',
        examId: 1,
        answers: [
          { questionId: 1, answer: 'Arquitetura define estrutura' },
          { questionId: 2, answer: 'SOLID são princípios' }
        ]
      };
      examsManager.addStudentExam(studentExam);
    });

    and(/^os exames possuem questões abertas com respostas dos estudantes$/, () => {
      // Já configurado no step anterior
    });

    and(/^o QStash está configurado corretamente$/, () => {
      mockedQStashService.isConfigured.mockReturnValue(true);
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo classId "(.*)" e model "(.*)"$/, 
      async (method: string, endpoint: string, classId: string, model: string) => {
        response = await request(app)
          .post(endpoint)
          .send({ classId, model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter message "(.*)"$/, (expectedMessage: string) => {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe(expectedMessage);
    });

    and(/^o JSON da resposta deve conter estimatedTime$/, () => {
      expect(response.body).toHaveProperty('estimatedTime');
      expect(typeof response.body.estimatedTime).toBe('string');
    });

    and(/^o JSON da resposta deve conter totalStudentExams maior que 0$/, () => {
      expect(response.body).toHaveProperty('totalStudentExams');
      expect(response.body.totalStudentExams).toBeGreaterThan(0);
    });

    and(/^o JSON da resposta deve conter totalOpenQuestions maior que 0$/, () => {
      expect(response.body).toHaveProperty('totalOpenQuestions');
      expect(response.body.totalOpenQuestions).toBeGreaterThan(0);
    });

    and(/^o JSON da resposta deve conter queuedMessages maior que 0$/, () => {
      expect(response.body).toHaveProperty('queuedMessages');
      expect(response.body.queuedMessages).toBeGreaterThan(0);
    });
  });

  test('Falhar ao iniciar correção quando classId não é fornecido', ({ when, then, and }) => {
    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo apenas model "(.*)"$/, 
      async (method: string, endpoint: string, model: string) => {
        const body = { model };
        response = await request(app)
          .post(endpoint)
          .send(body)
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando model não é fornecido', ({ when, then, and }) => {
    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo apenas classId "(.*)"$/, 
      async (method: string, endpoint: string, classId: string) => {
        const body = { classId };
        response = await request(app)
          .post(endpoint)
          .send(body)
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando model é inválido', ({ given, when, then, and }) => {
    given(/^existe uma classe com id "(.*)"$/, (classId: string) => {
      // Classe existe implicitamente
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo classId "(.*)" e model "(.*)"$/, 
      async (method: string, endpoint: string, classId: string, model: string) => {
        response = await request(app)
          .post(endpoint)
          .send({ classId, model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando não existem exames de estudantes para a classe', ({ given, and, when, then }) => {
    given(/^existe uma classe com id "(.*)"$/, (classId: string) => {
      // Classe existe mas sem exames
    });

    and(/^não existem exames de estudantes para a classe "(.*)"$/, (classId: string) => {
      // Não cria nenhum exame ou studentExam
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo classId "(.*)" e model "(.*)"$/, 
      async (method: string, endpoint: string, classId: string, model: string) => {
        response = await request(app)
          .post(endpoint)
          .send({ classId, model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando QStash não está configurado', ({ given, and, when, then }) => {
    given(/^existe uma classe com id "(.*)"$/, (classId: string) => {
      // Classe existe
    });

    and(/^existem exames de estudantes para a classe "(.*)"$/, (classId: string) => {
      const question1: CreateQuestionInput = {
        question: 'Questão 1',
        topic: 'Tópico 1',
        type: 'open',
        answer: 'Resposta 1'
      };
      const q1 = questionsManager.addQuestion(question1);
      (q1 as any).id = 10;
      
      const exam: ExamRecord = {
        id: 10,
        classId: classId,
        title: 'Prova Teste',
        isValid: true,
        openQuestions: 1,
        closedQuestions: 0,
        questions: [10]
      };
      examsManager.addExam(exam);
      
      const studentExam: StudentExamRecord = {
        id: 10,
        studentCPF: '11111111111',
        examId: 10,
        answers: [
          { questionId: 10, answer: 'Resposta aluno' }
        ]
      };
      examsManager.addStudentExam(studentExam);
    });

    and(/^os exames possuem questões abertas com respostas dos estudantes$/, () => {
      // Já configurado
    });

    and(/^o QStash não está configurado$/, () => {
      mockedQStashService.isConfigured.mockReturnValue(false);
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo classId "(.*)" e model "(.*)"$/, 
      async (method: string, endpoint: string, classId: string, model: string) => {
        response = await request(app)
          .post(endpoint)
          .send({ classId, model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando não existem questões abertas', ({ given, and, when, then }) => {
    given(/^existe uma classe com id "(.*)"$/, (classId: string) => {
      // Classe existe
    });

    and(/^existem exames de estudantes para a classe "(.*)"$/, (classId: string) => {
      // Cria exame mas sem questões abertas ou sem respostas
      const exam: ExamRecord = {
        id: 20,
        classId: classId,
        title: 'Prova Sem Questões Abertas',
        isValid: true,
        openQuestions: 0,
        closedQuestions: 0,
        questions: []
      };
      examsManager.addExam(exam);
      
      const studentExam: StudentExamRecord = {
        id: 20,
        studentCPF: '22222222222',
        examId: 20,
        answers: []
      };
      examsManager.addStudentExam(studentExam);
    });

    and(/^os exames não possuem questões abertas ou as questões abertas não possuem respostas dos estudantes$/, () => {
      // Já configurado - exame sem questões abertas
    });

    and(/^o QStash está configurado corretamente$/, () => {
      mockedQStashService.isConfigured.mockReturnValue(true);
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo classId "(.*)" e model "(.*)"$/, 
      async (method: string, endpoint: string, classId: string, model: string) => {
        response = await request(app)
          .post(endpoint)
          .send({ classId, model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando ocorre erro ao enviar mensagens para QStash', ({ given, and, when, then }) => {
    let consoleErrorSpy: jest.SpyInstance;

    given(/^existe uma classe com id "(.*)"$/, (classId: string) => {
      // Classe existe
    });

    and(/^existem exames de estudantes para a classe "(.*)"$/, (classId: string) => {
      const question1: CreateQuestionInput = {
        question: 'Questão 1',
        topic: 'Tópico 1',
        type: 'open',
        answer: 'Resposta 1'
      };
      const q1 = questionsManager.addQuestion(question1);
      (q1 as any).id = 30;
      
      const exam: ExamRecord = {
        id: 30,
        classId: classId,
        title: 'Prova Teste',
        isValid: true,
        openQuestions: 1,
        closedQuestions: 0,
        questions: [30]
      };
      examsManager.addExam(exam);
      
      const studentExam: StudentExamRecord = {
        id: 30,
        studentCPF: '33333333333',
        examId: 30,
        answers: [
          { questionId: 30, answer: 'Resposta aluno' }
        ]
      };
      examsManager.addStudentExam(studentExam);
    });

    and(/^os exames possuem questões abertas com respostas dos estudantes$/, () => {
      // Já configurado
    });

    and(/^o QStash está configurado corretamente$/, () => {
      mockedQStashService.isConfigured.mockReturnValue(true);
    });

    and(/^o QStash falha ao processar publishBatch$/, () => {
      // Suprime console.error antes de configurar o erro
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedQStashService.publishBatch.mockRejectedValue(new Error('Erro ao publicar no QStash'));
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo classId "(.*)" e model "(.*)"$/, 
      async (method: string, endpoint: string, classId: string, model: string) => {
        response = await request(app)
          .post(endpoint)
          .send({ classId, model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });

    and(/^o JSON da resposta deve conter details$/, () => {
      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.details).toBe('string');
      // Restaura console.error após o teste
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
