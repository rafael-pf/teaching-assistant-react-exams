import fs from "fs";
import path from "path";

type Question = {
  id: number;
  type: "open" | "closed";
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
  answers: Answer[];
};

type StudentExam = {
  id: number;
  studentCPF: string;
  examId: number;
  answers: Answer[]; // existing stored answers (do NOT overwrite whole array)
  grade?: number;
};

export class Correction {
  private static examsPath = path.join(__dirname, "../../data/exams.json");
  private static questionsPath = path.join(__dirname, "../../data/questions.json");
  private static responsesPath = path.join(__dirname, "../../data/response.json");
  private static studentsExamsPath = path.join(__dirname, "../../data/students-exams.json");

  private static loadJson(filePath: string) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private static saveJson(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  static correctExam(studentCPF: string, examId: number) {
  const examsData = this.loadJson(this.examsPath);
  const questionsData = this.loadJson(this.questionsPath);
  const responsesData = this.loadJson(this.responsesPath);
  const studentsExamsData = this.loadJson(this.studentsExamsPath);

  const exam: Exam = examsData.exams.find((e: Exam) => e.id === examId);
  if (!exam) throw new Error("Exam not found");

  const answerKey: ResponseItem = responsesData.responses
    .find((r: ResponseItem) => r.examId === examId && r.studentCPF === studentCPF);

  if (!answerKey) throw new Error("Answer key not found for this exam");

  const studentExam: StudentExam = studentsExamsData.studentsExams.find(
    (se: StudentExam) => se.studentCPF === studentCPF && se.examId === examId
  );

  if (!studentExam) throw new Error("Student exam not found");

  const closedStudentAnswers = studentExam.answers.filter((a) => {
    const question = questionsData.questions.find((q: Question) => q.id === a.questionId);
    return question && question.type === "closed";
  });

  const totalClosed = closedStudentAnswers.length;
  let correctCount = 0;

  closedStudentAnswers.forEach((answer) => {
    const studentAnswer = answer;

    const keyAnswer = answerKey.answers.find(
      (a) => a.questionId === answer.questionId
    );

    if (studentAnswer && keyAnswer &&
        studentAnswer.answer.trim() === keyAnswer.answer.trim()) {
      correctCount++;
    }
  });

  const finalGrade = totalClosed > 0 ? (correctCount / totalClosed) * 10 : 0;

  studentExam.grade = finalGrade;

  this.saveJson(this.studentsExamsPath, studentsExamsData);

  return {
    studentCPF,
    examId,
    correctCount,
    totalClosed,
    finalGrade,
  };
}


}
