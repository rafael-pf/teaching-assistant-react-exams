import { Exam } from './Exam';

export class ExamSet {
  private exams: Exam[] = [];

  constructor() {
    // ExamSet is independent of persistence
  }

  public addExam(exam: Exam): Exam {
    if (this.findExamById(exam.getId())) {
      throw new Error('Exam with this ID already exists');
    }
    this.exams.push(exam);
    return exam;
  }

  public removeExam(id: number): boolean {
    const index = this.exams.findIndex(e => e.getId() === id);
    if (index === -1) {
      return false;
    }
    this.exams.splice(index, 1);
    return true;
  }

  public findExamById(id: number): Exam | undefined {
    return this.exams.find(e => e.getId() === id);
  }

  public findExamsByClassId(classId: string): Exam[] {
    return this.exams.filter(e => e.getClassId() === classId);
  }

  public getAllExams(): Exam[] {
    return [...this.exams];
  }

  public getCount(): number {
    return this.exams.length;
  }
}

