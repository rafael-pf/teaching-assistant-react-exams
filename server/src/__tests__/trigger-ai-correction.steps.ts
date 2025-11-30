import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { Response } from 'supertest';
import express, { Express } from 'express';
import { createTestApp } from './helpers/test-app';
import { examSet, studentExamSet, questionSet } from '../services/dataService';
import { Exam } from '../models/Exam';
import { StudentExam } from '../models/StudentExam';
import { Question } from '../models/Question';
import { StudentAnswer } from '../models/StudentAnswer';
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
    examSet.getAllExams().forEach(exam => examSet.removeExam(exam.getId()));
    studentExamSet.getAllStudentExams().forEach(se => studentExamSet.removeStudentExam(se.getId()));
    questionSet.getAllQuestions().forEach(q => questionSet.removeQuestion(q.getId()));

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
      const question1 = new Question(1, 'Explique arquitetura de software', 'Arquitetura', 'open', undefined, 'Arquitetura é...');
      const question2 = new Question(2, 'Descreva SOLID', 'Princípios', 'open', undefined, 'SOLID são...');
      questionSet.addQuestion(question1);
      questionSet.addQuestion(question2);

      // Cria exame
      const exam = new Exam(1, classId, 'Prova de Arquitetura', true, 2, 0, [1, 2]);
      examSet.addExam(exam);

      // Cria StudentExam
      const studentExam = new StudentExam(1, '12345678900', 1, [
        new StudentAnswer(1, 'Arquitetura define estrutura', 0),
        new StudentAnswer(2, 'SOLID são princípios', 0),
      ]);
      studentExamSet.addStudentExam(studentExam);
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
      const question1 = new Question(10, 'Questão 1', 'Tópico 1', 'open', undefined, 'Resposta 1');
      questionSet.addQuestion(question1);
      const exam = new Exam(10, classId, 'Prova Teste', true, 1, 0, [10]);
      examSet.addExam(exam);
      const studentExam = new StudentExam(10, '11111111111', 10, [
        new StudentAnswer(10, 'Resposta aluno', 0),
      ]);
      studentExamSet.addStudentExam(studentExam);
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
      const exam = new Exam(20, classId, 'Prova Sem Questões Abertas', true, 0, 0, []);
      examSet.addExam(exam);
      const studentExam = new StudentExam(20, '22222222222', 20, []);
      studentExamSet.addStudentExam(studentExam);
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
      const question1 = new Question(30, 'Questão 1', 'Tópico 1', 'open', undefined, 'Resposta 1');
      questionSet.addQuestion(question1);
      const exam = new Exam(30, classId, 'Prova Teste', true, 1, 0, [30]);
      examSet.addExam(exam);
      const studentExam = new StudentExam(30, '33333333333', 30, [
        new StudentAnswer(30, 'Resposta aluno', 0),
      ]);
      studentExamSet.addStudentExam(studentExam);
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
