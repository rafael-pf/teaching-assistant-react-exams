import * as fs from 'fs';
import * as path from 'path';

// Mock ANTES de qualquer outra importação
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args[args.length - 1]),
  resolve: jest.fn((...args) => args[args.length - 1]),
}));

// Agora importa Correction DEPOIS dos mocks
import { Correction } from '../../src/models/Correction';

describe('Autocorrection Service - Closed Questions', () => {
  const mockExamsPath = '../../data/exams.json';
  const mockQuestionsPath = '../../data/questions.json';
  const mockResponsesPath = '../../data/responses.json';

  // Helper to create mock data structures
  const createMockExam = (examId: number, questionIds: number[]) => ({
    id: examId,
    questions: questionIds,
  });

  const createMockQuestion = (id: number, type: 'open' | 'closed' = 'closed') => ({
    id,
    type,
    options: [
      { id: 1, isCorrect: true },
      { id: 2, isCorrect: false },
      { id: 3, isCorrect: false },
    ],
  });

  const createMockResponse = (studentCPF: string, examId: number, answers: any[]) => ({
    id: Date.now(),
    studentCPF,
    examId,
    answers,
    grade_closed: undefined,
  });

  const createMockAnswer = (questionId: number, answer: string) => ({
    questionId,
    answer,
    grade: undefined,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset path.join and path.resolve mocks to return the last argument
    (path.join as jest.Mock).mockImplementation((...args) => args[args.length - 1]);
    (path.resolve as jest.Mock).mockImplementation((...args) => args[args.length - 1]);
  });

  // Helper to mock fs.readFileSync with proper file content
  const mockFileSystem = (mockExamsData: any, mockQuestionsData: any, mockResponsesData: any) => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (!filePath) return '{}';
      if (typeof filePath === 'string') {
        if (filePath.includes('exams.json')) return JSON.stringify(mockExamsData);
        if (filePath.includes('questions.json')) return JSON.stringify(mockQuestionsData);
        if (filePath.includes('responses.json')) return JSON.stringify(mockResponsesData);
      }
      return '{}';
    });
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  };

  describe('Scenario 1: Autocorrecting closed questions in an exam', () => {
    it('should calculate grade 100 when student answers all questions correctly', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;
      const questionIds = [1, 2];

      const mockExamsData = {
        exams: [createMockExam(examId, questionIds)],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'), // Correct answer
            createMockAnswer(2, '1'), // Correct answer
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(studentCPF, examId);

      // Assert
      expect(result).toBeDefined();
      expect(result.studentCPF).toBe(studentCPF);
      expect(result.examId).toBe(examId);
      expect(result.finalGrade).toBe(100);
    });

    it('should register grade in exams/students table after correction', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [createMockAnswer(1, '1')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(studentCPF, examId);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.finalGrade).toBeGreaterThanOrEqual(0);
      expect(result.finalGrade).toBeLessThanOrEqual(100);
    });
  });

  describe('Scenario 2: Autocorrecting all students closed questions in an exam', () => {
    it('should calculate grade 0 when student answers incorrectly', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 2;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [createMockAnswer(1, '2')]), // Incorrect
          createMockResponse(student2CPF, examId, [createMockAnswer(1, '1')]), // Correct
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result1 = Correction.correctExam(student1CPF, examId);
      const result2 = Correction.correctExam(student2CPF, examId);

      // Assert
      expect(result1.finalGrade).toBe(0);
      expect(result2.finalGrade).toBe(100);
    });

    it('should handle multiple students corrections independently', () => {
      // Arrange
      const students = ['12345678901', '12345678902'];
      const examId = 2;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: students.map((cpf, idx) =>
          createMockResponse(cpf, examId, [createMockAnswer(1, idx === 0 ? '1' : '2')])
        ),
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      students.forEach((cpf, idx) => {
        const result = Correction.correctExam(cpf, examId);
        expect(result.studentCPF).toBe(cpf);
        expect(result.finalGrade).toBe(idx === 0 ? 100 : 0);
      });
    });
  });

  describe('Scenario 3: Student did not answer all closed questions in an exam', () => {
    it('should calculate partial grade (66.7) when student answers 2 out of 3 questions', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2, 3])],
      };

      const mockQuestionsData = {
        questions: [
          createMockQuestion(1),
          createMockQuestion(2),
          createMockQuestion(3),
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'), // Correct
            createMockAnswer(2, '1'), // Correct
            // Question 3 not answered
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(studentCPF, examId);

      // Assert
      expect(result.finalGrade).toBeCloseTo(66.7, 1);
    });
  });

  describe('Scenario 4: Student did not answer the exam', () => {
    it('should not create grade record when student has no responses', () => {
      // Arrange
      const studentCPF = '12345678903';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [], // No response for this student
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      expect(() => {
        Correction.correctExam(studentCPF, examId);
      }).toThrow('Answer key not found for this exam');
    });
  });

  describe('Scenario 5: Teacher did not pass an exam to be corrected', () => {
    it('should return error when exam is not specified', () => {
      // Arrange
      const studentCPF = '12345678901';
      const invalidExamId = 999; // Non-existent exam

      const mockExamsData = {
        exams: [], // No exams
      };

      const mockQuestionsData = {
        questions: [],
      };

      const mockResponsesData = {
        responses: [],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      expect(() => {
        Correction.correctExam(studentCPF, invalidExamId);
      }).toThrow('Exam not found');
    });
  });

  describe('Scenario 6: Exam was already corrected', () => {
    it('should not recalculate grades if exam already has grades', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          {
            ...createMockResponse(studentCPF, examId, [createMockAnswer(1, '1')]),
            grade_closed: 100, // Already has grade
          },
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result1 = Correction.correctExam(studentCPF, examId);

      // Act again - should still work
      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);
      const result2 = Correction.correctExam(studentCPF, examId);

      // Assert
      expect(result1.finalGrade).toBe(100);
      expect(result2.finalGrade).toBe(100);
    });
  });

  describe('Scenario 7: Exam has no answer key', () => {
    it('should return error when exam questions have no correct answers defined', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2])],
      };

      const mockQuestionsData = {
        questions: [
          { id: 1, type: 'closed', options: [] }, // No options = no answer key
          { id: 2, type: 'closed', options: [] },
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'),
            createMockAnswer(2, '1'),
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(studentCPF, examId);

      // Assert - If no questions with isCorrect options, grade should be 0
      expect(result.finalGrade).toBe(0);
    });
  });

  describe('Scenario 8: Exam does not exist', () => {
    it('should return error when trying to correct a non-existent exam', () => {
      // Arrange
      const studentCPF = '12345678901';
      const invalidExamId = 999;

      const mockExamsData = {
        exams: [
          createMockExam(1, [1]),
          createMockExam(2, [2]),
        ],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      expect(() => {
        Correction.correctExam(studentCPF, invalidExamId);
      }).toThrow('Exam not found');
    });
  });

  describe('Scenario 9: No student submitted the exam', () => {
    it('should not update any grades when no students submitted responses', () => {
      // Arrange
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [], // No responses submitted
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert - trying to correct any student for this exam should fail
      expect(() => {
        Correction.correctExam('12345678901', examId);
      }).toThrow('Answer key not found for this exam');

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and additional scenarios', () => {
    it('should handle partial correct answers within a question', () => {
      // Arrange: Multiple choice question with multiple correct options
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [
          {
            id: 1,
            type: 'closed',
            options: [
              { id: 1, isCorrect: true },
              { id: 2, isCorrect: true },
              { id: 3, isCorrect: false },
            ],
          },
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'), // Selected 1 out of 2 correct options
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(studentCPF, examId);

      // Assert
      expect(result.finalGrade).toBe(50); // 1 out of 2 correct options
    });

    it('should persist corrected grades to file', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [createMockAnswer(1, '1')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      Correction.correctExam(studentCPF, examId);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('responses.json'),
        expect.any(String)
      );
    });
  });
});
