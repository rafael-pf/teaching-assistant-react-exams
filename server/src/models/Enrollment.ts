import { Student } from './Student';
import { Evaluation } from './Evaluation';
import fs from 'fs/promises';
import path from 'path';

export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];

  constructor(student: Student, evaluations: Evaluation[] = []) {
    this.student = student;
    this.evaluations = evaluations;
  }

  // Get student
  getStudent(): Student {
    return this.student;
  }

  // Get evaluations
  getEvaluations(): Evaluation[] {
    return [...this.evaluations]; // Return copy to prevent external modification
  }

  // Add or update an evaluation
  addOrUpdateEvaluation(goal: string, grade: 'MANA' | 'MPA' | 'MA'): void {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations[existingIndex].setGrade(grade);
    } else {
      this.evaluations.push(new Evaluation(goal, grade));
    }
  }

  // Remove an evaluation
  removeEvaluation(goal: string): boolean {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations.splice(existingIndex, 1);
      return true;
    }
    return false;
  }

  // Get evaluation for a specific goal
  getEvaluationForGoal(goal: string): Evaluation | undefined {
    return this.evaluations.find(evaluation => evaluation.getGoal() === goal);
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      student: this.student.toJSON(),
      evaluations: this.evaluations.map(evaluation => evaluation.toJSON())
    };
  }

  // Create Enrollment from JSON object
  static fromJSON(data: { student: any; evaluations: any[] }, student: Student): Enrollment {
    const evaluations = data.evaluations
      ? data.evaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];
    
    return new Enrollment(student, evaluations);
  }
}

// --- Novas funções: persistência de exams e questions em JSON ---

const dataDir = path.resolve(__dirname, '../../../data');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJsonFile(fileName: string): Promise<any[]> {
  const filePath = path.join(dataDir, fileName);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err: any) {
    if (err && err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeJsonFile(fileName: string, data: any[]): Promise<void> {
  const filePath = path.join(dataDir, fileName);
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Adiciona um exam ao ficheiro data/exams.json.
 * Se o ficheiro não existir, é criado.
 * Se exam.id não existir, é gerado um id.
 */
export async function addExamToStore(exam: any): Promise<void> {
  const fileName = 'exams.json';
  const list = await readJsonFile(fileName);
  const id = exam.id ?? generateId();
  const record = { ...exam, id };
  list.push(record);
  await writeJsonFile(fileName, list);
}

/**
 * Adiciona uma question ao ficheiro data/questions.json.
 * Se o ficheiro não existir, é criado.
 * Se question.id não existir, é gerado um id.
 */
export async function addQuestionToStore(question: any): Promise<void> {
  const fileName = 'questions.json';
  const list = await readJsonFile(fileName);
  const id = question.id ?? generateId();
  const record = { ...question, id };
  list.push(record);
  await writeJsonFile(fileName, list);
}