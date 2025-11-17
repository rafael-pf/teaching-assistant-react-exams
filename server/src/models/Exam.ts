export class Exam {
  private id: number;
  private classId: string;
  private title: string;
  private isValid: boolean;
  private openQuestions: number;
  private closedQuestions: number;
  private questions: number[];

  constructor(
    id: number,
    classId: string,
    title: string,
    isValid: boolean,
    openQuestions: number,
    closedQuestions: number,
    questions: number[]
  ) {
    this.id = id;
    this.classId = classId;
    this.title = title;
    this.isValid = isValid;
    this.openQuestions = openQuestions;
    this.closedQuestions = closedQuestions;
    this.questions = questions;
  }

  public getId(): number {
    return this.id;
  }

  public getClassId(): string {
    return this.classId;
  }

  public getTitle(): string {
    return this.title;
  }

  public getIsValid(): boolean {
    return this.isValid;
  }

  public getOpenQuestions(): number {
    return this.openQuestions;
  }

  public getClosedQuestions(): number {
    return this.closedQuestions;
  }

  public getQuestions(): number[] {
    return [...this.questions];
  }

  public setTitle(title: string): void {
    this.title = title;
  }

  public setIsValid(isValid: boolean): void {
    this.isValid = isValid;
  }

  public addQuestion(questionId: number): void {
    if (!this.questions.includes(questionId)) {
      this.questions.push(questionId);
    }
  }

  public removeQuestion(questionId: number): boolean {
    const index = this.questions.indexOf(questionId);
    if (index > -1) {
      this.questions.splice(index, 1);
      return true;
    }
    return false;
  }

  public toJSON() {
    return {
      id: this.id,
      classId: this.classId,
      title: this.title,
      isValid: this.isValid,
      openQuestions: this.openQuestions,
      closedQuestions: this.closedQuestions,
      questions: this.questions
    };
  }

  public static fromJSON(data: {
    id: number;
    classId: string;
    title: string;
    isValid: boolean;
    openQuestions: number;
    closedQuestions: number;
    questions: number[];
  }): Exam {
    return new Exam(
      data.id,
      data.classId,
      data.title,
      data.isValid,
      data.openQuestions,
      data.closedQuestions,
      data.questions
    );
  }
}

