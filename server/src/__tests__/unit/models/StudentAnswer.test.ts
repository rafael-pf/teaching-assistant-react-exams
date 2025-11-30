import { StudentAnswer } from '../../../models/StudentAnswer';

describe('StudentAnswer', () => {
  describe('setScore', () => {
    let studentAnswer: StudentAnswer;

    beforeEach(() => {
      studentAnswer = new StudentAnswer(1, 'Resposta do aluno', 0);
    });

    describe('quando recebe score válido no range 0-100', () => {
      it('deve definir score 0 corretamente', () => {
        studentAnswer.setScore(0);
        expect(studentAnswer.getScore()).toBe(0);
      });

      it('deve definir score 50 corretamente', () => {
        studentAnswer.setScore(50);
        expect(studentAnswer.getScore()).toBe(50);
      });

      it('deve definir score 100 corretamente', () => {
        studentAnswer.setScore(100);
        expect(studentAnswer.getScore()).toBe(100);
      });

      it('deve definir score decimal corretamente', () => {
        studentAnswer.setScore(75.5);
        expect(studentAnswer.getScore()).toBe(75.5);
      });
    });

    describe('quando recebe score menor que 0', () => {
      it('deve limitar score negativo a 0', () => {
        studentAnswer.setScore(-10);
        expect(studentAnswer.getScore()).toBe(0);
      });

      it('deve limitar score muito negativo a 0', () => {
        studentAnswer.setScore(-100);
        expect(studentAnswer.getScore()).toBe(0);
      });
    });

    describe('quando recebe score maior que 100', () => {
      it('deve limitar score acima de 100 a 100', () => {
        studentAnswer.setScore(150);
        expect(studentAnswer.getScore()).toBe(100);
      });

      it('deve limitar score muito alto a 100', () => {
        studentAnswer.setScore(1000);
        expect(studentAnswer.getScore()).toBe(100);
      });
    });

    describe('quando usado na correção de questões abertas com IA', () => {
      it('deve aceitar score convertido de 0-10 para 0-100', () => {
        // Simula conversão: score 7.5 de 0-10 vira 75 de 0-100
        const scoreDaIA = 7.5;
        const scoreConvertido = (scoreDaIA / 10) * 100; // 75
        studentAnswer.setScore(scoreConvertido);
        expect(studentAnswer.getScore()).toBe(75);
      });

      it('deve aceitar score máximo convertido (10 -> 100)', () => {
        const scoreDaIA = 10;
        const scoreConvertido = (scoreDaIA / 10) * 100; // 100
        studentAnswer.setScore(scoreConvertido);
        expect(studentAnswer.getScore()).toBe(100);
      });

      it('deve aceitar score mínimo convertido (0 -> 0)', () => {
        const scoreDaIA = 0;
        const scoreConvertido = (scoreDaIA / 10) * 100; // 0
        studentAnswer.setScore(scoreConvertido);
        expect(studentAnswer.getScore()).toBe(0);
      });
    });
  });
});

