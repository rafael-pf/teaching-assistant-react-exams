import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import app from '../../server/src/server'; 
import * as dataService from '../../server/src/services/dataService';

const feature = loadFeature('./tests/features/exams.feature');

jest.mock('../../server/src/services/dataService');

defineFeature(feature, (test) => {
  let response: request.Response;

  const mockQuestions = [
    { id: 1, question: 'Q1', type: 'open', topic: 'Test' },
    { id: 2, question: 'Q2', type: 'closed', topic: 'Test', options: [{id: 1, option: 'A', isCorrect: true}] }
  ];

  test('Gerar ZIP de provas com sucesso', ({ given, when, then, and }) => {
    
    given(/^o DataService possui uma prova "(.*)" vinculada à turma "(.*)"$/, (examName, classId) => {
      (dataService.getExamsForClass as jest.Mock).mockReturnValue([
        {
          id: 100,
          title: examName,
          classId: classId,
          openQuestions: 1,
          closedQuestions: 1,
          questions: [1, 2]
        }
      ]);
      Object.defineProperty(dataService, 'questions', { get: () => mockQuestions, configurable: true });
      
      (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
    });

    when(/^uma requisição "(.*)" for enviada para "(.*)" com query params:$/, async (method, url, table) => {
      const queryParams: Record<string, any> = {};
      table.forEach((row: any) => {
        if (row.classId) queryParams['classId'] = row.classId;
        if (row.turma) queryParams['classId'] = row.turma; 
        if (row.quantity) queryParams['quantity'] = row.quantity;
      });

      const finalQuery = { 
          classId: queryParams['classId'] || 'turma-123', 
          quantity: queryParams['quantity'] || 5 
      };

      if (method === 'GET') {
        response = await request(app)
          .get(url)
          .query(finalQuery); 
      }
    });

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode) => {
      expect(response.status).toBe(parseInt(statusCode));
    });

    and(/^o header "(.*)" deve ser "(.*)"$/, (headerName, headerValue) => {
      expect(response.header[headerName.toLowerCase()]).toContain(headerValue);
    });
  });
});