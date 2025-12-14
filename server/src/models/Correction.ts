import fs from "fs";
import path from "path";
import { studentSet } from "../services/dataService";

type QuestionType = "open" | "closed";

type Options = {
  id: number;
  isCorrect: boolean;
};

type Question = {
  id: number;
  type: QuestionType;
  grade?: number;
  options?: Options[];
};

type Exam = {
  id: number;
  questions: number[];
};

type Answer = {
  questionId: number;
  answer: string;
  grade?: number;
};

type ResponseItem = {
  id: number;
  studentCPF: string;
  examId: number;
  grade_closed?: number;
  answers: Answer[];
};

type Result = {
  studentCPF: string;
  examId: number;
  finalGrade: number;
};

export class Correction {
  private static readonly EXAMS_PATH = path.join(__dirname, "../../data/exams.json");
  private static readonly QUESTIONS_PATH = path.join(__dirname, "../../data/questions.json");
  private static readonly RESPONSES_PATH = path.join(__dirname, "../../data/responses.json");

  private static loadJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private static saveJson(filePath: string, data: unknown): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  private static findExam(exams: { exams: Exam[] }, examId: number): Exam {
    const exam = exams.exams.find(e => e.id === examId);
    if (!exam) throw new Error("Exam not found");
    return exam;
  }

  private static getClosedQuestionIds(exam: Exam, questions: { questions: Question[] }): number[] {
    return exam.questions.filter(qid => {
      const question = questions.questions.find(q => q.id === qid);
      return question?.type === "closed";
    });
  }

  private static calculateQuestionGrade(
    question: Question,
    answer?: Answer
  ): number {
    if (!question.options || question.options.length === 0) return 0;

    const correctOptions = question.options.filter(o => o.isCorrect);
    if (correctOptions.length === 0) return 0;

    const correctCount = correctOptions.filter(
      o => answer && o.id.toString() === String(answer.answer)
    ).length;

    return (correctCount / correctOptions.length) * 100;
  }

  private static correctStudentResponse(
    response: ResponseItem,
    exam: Exam,
    questionsData: { questions: Question[] }
  ): number {
    const closedQuestionIds = this.getClosedQuestionIds(exam, questionsData);

    let gradeSum = 0;

    closedQuestionIds.forEach(questionId => {
      const question = questionsData.questions.find(
        q => q.id === questionId && q.type === "closed"
      );
      if (!question) return;

      const studentAnswer = response.answers.find(a => a.questionId === questionId);
      const questionGrade = this.calculateQuestionGrade(question, studentAnswer);

      if (studentAnswer) studentAnswer.grade = questionGrade;
      gradeSum += questionGrade;
    });

    return closedQuestionIds.length > 0
      ? gradeSum / closedQuestionIds.length
      : 0;
  }

  static correctExam(examId: number) {
    const examsData = this.loadJson<{ exams: Exam[] }>(this.EXAMS_PATH);
    const questionsData = this.loadJson<{ questions: Question[] }>(this.QUESTIONS_PATH);
    const responsesData = this.loadJson<{ responses: ResponseItem[] }>(this.RESPONSES_PATH);

    const exam = this.findExam(examsData, examId);

    const studentResponses = responsesData.responses.filter(
      r => r.examId === examId
    );

    if (studentResponses.length === 0) {
      throw new Error("No responses found for this exam");
    }

    const results: Result[] = studentResponses.map(response => {
      const finalGrade = this.correctStudentResponse(
        response,
        exam,
        questionsData
      );

      response.grade_closed = finalGrade;

      return {
        studentCPF: response.studentCPF,
        examId,
        finalGrade
      };
    });

    this.saveJson(this.RESPONSES_PATH, responsesData);

    return {
      examId,
      correctedCount: results.length,
      results
    };
  }

  static getGrade(studentCPF: string, examId: number): number | null {
    const responsesData = this.loadJson<{ responses: ResponseItem[] }>(this.RESPONSES_PATH);

    const response = responsesData.responses.find(
      r => r.examId === examId && r.studentCPF === studentCPF
    );

    return response?.grade_closed ?? null;
  }

  static getAnswersForExam(examId: number) {
    const responsesData = this.loadJson<{ responses: ResponseItem[] }>(this.RESPONSES_PATH);

    return responsesData.responses
      .filter(r => r.examId === examId)
      .map(r => ({
        studentCPF: r.studentCPF,
        name: studentSet.findStudentByCPF(r.studentCPF)?.name ?? "Aluno não registrado",
        answers: r.answers.map(a => ({
          questionId: a.questionId,
          grade: a.grade ?? null
        }))
      }));
  }
}
