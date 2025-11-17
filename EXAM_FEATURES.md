# Exam and Question Management - Implementation Guide

This document describes the implementation of the Exam and Question Management feature for the Teaching Assistant application.

## Overview

The system now supports comprehensive question and exam management, including:
- Creating and managing questions with multiple choice and open-ended formats
- Building exams from a question bank
- Automatic exam generation based on criteria
- Score validation and exam publication
- Question update impact tracking

## Backend Architecture

### Models

#### Question (`server/src/models/Questions.ts`)
Enhanced with the following fields:
- `code`: Unique identifier (e.g., "QST005")
- `subject`: Topic/subject classification
- `difficulty`: Easy, Medium, or Hard
- `status`: Active, Inactive, or Archived
- `createdAt`, `updatedAt`: Timestamps

Supports both:
- **ClosedQuestion**: Multiple choice with one or more correct answers
- **OpenQuestion**: Text-based answers

#### Exam (`server/src/models/Exam.ts`)
New model with:
- `title`: Exam name
- `applicationDate`: When the exam will be applied
- `maxScore`: Maximum points for the exam
- `status`: In Editing, Published, Active, Applied, or Completed
- `classId`: Associated class
- `questions`: Array of question references with scores

**Key Methods:**
- `addQuestion()`: Add question with score validation
- `publish()`: Publish exam to a class
- `getCurrentScore()`: Calculate total allocated points
- `canEdit()`: Check if exam can be modified

### Services

#### QuestionBankService (`server/src/services/QuestionBankService.ts`)
Manages the question repository:
- Add, update, delete questions
- Search and filter by status, subject, difficulty, tags
- Generate unique codes (QST001, QST002, etc.)
- Get random questions for exam generation
- Track question usage across exams

#### ExamService (`server/src/services/ExamService.ts`)
Handles exam business logic:
- Create, update, delete exams
- Add/remove questions to/from exams
- Validate score constraints
- Generate exams automatically from criteria
- Publish exams to classes
- Track which exams use specific questions

### API Endpoints

#### Questions API (`/api/questions`)

```
GET    /api/questions              # Get all questions (with optional filters)
GET    /api/questions/:id          # Get question by ID
GET    /api/questions/code/:code   # Get question by code
GET    /api/questions/search/:text # Search questions by text
POST   /api/questions              # Create new question
PUT    /api/questions/:id          # Update question
DELETE /api/questions/:id          # Delete question
```

#### Exams API (`/api/exams`)

```
GET    /api/exams                      # Get all exams
GET    /api/exams/:id                  # Get exam by ID
GET    /api/exams/:id/details          # Get exam with question details
POST   /api/exams                      # Create new exam
PUT    /api/exams/:id                  # Update exam
DELETE /api/exams/:id                  # Delete exam
POST   /api/exams/:id/questions        # Add question to exam
DELETE /api/exams/:id/questions/:qid   # Remove question from exam
PUT    /api/exams/:id/questions/:qid   # Update question score
POST   /api/exams/generate             # Generate exam automatically
POST   /api/exams/:id/publish          # Publish exam to class
```

### Data Persistence

The `dataService` has been updated to persist:
- Questions in the question bank
- Exams with their question associations

Data is saved to `server/data/app-data.json` with the structure:
```json
{
  "students": [...],
  "classes": [...],
  "questions": [...],
  "exams": [...]
}
```

## Frontend Architecture

### Types

#### Question (`client/src/types/Question.ts`)
```typescript
interface IClosedQuestion {
  id?: string;
  code?: string;
  text: string;
  options: string[];
  correctIndices: number[];
  subject?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'Active' | 'Inactive' | 'Archived';
  tags: string[];
  // ...
}
```

#### Exam (`client/src/types/Exam.ts`)
```typescript
interface IExam {
  id?: string;
  title: string;
  applicationDate: string;
  maxScore: number;
  status: 'In Editing' | 'Published' | 'Active' | 'Applied' | 'Completed';
  classId?: string;
  questions: IExamQuestion[];
  // ...
}
```

### Services

#### QuestionService (`client/src/services/QuestionService.ts`)
Client-side service for question operations:
- `getAllQuestions()`: Fetch with filters
- `createQuestion()`: Create new question
- `updateQuestion()`: Update existing question
- `searchQuestions()`: Search by text

#### ExamService (`client/src/services/ExamService.ts`)
Client-side service for exam operations:
- `createExam()`: Create blank exam
- `addQuestionToExam()`: Add question with score
- `generateExam()`: Auto-generate from criteria
- `publishExam()`: Publish to class

## Implemented Scenarios

### 1. Question Registration ✅
- Create multiple-choice questions with multiple alternatives
- Set correct answer(s)
- Add tags and metadata (subject, difficulty)
- Automatic code generation (QST001, QST002, etc.)
- Status management (Active/Inactive/Archived)

**API Example:**
```bash
POST /api/questions
{
  "text": "Which SOLID principle refers to Dependency Inversion?",
  "type": "closed",
  "options": ["SRP", "OCP", "LSP", "ISP", "DIP"],
  "correctIndices": [4],
  "subject": "Engineering",
  "difficulty": "Medium"
}
```

### 2. Blank Exam Creation ✅
- Create exam with title, date, and max score
- Initial state: "In Editing" with 0 questions
- Automatic ID generation

**API Example:**
```bash
POST /api/exams
{
  "title": "Final Assessment",
  "applicationDate": "2025-12-15",
  "maxScore": 10.0
}
```

### 3. Adding Questions to Exam ✅
- Search questions by code
- Add question with custom score
- Automatic score validation (won't exceed max)
- Real-time score calculation

**API Example:**
```bash
POST /api/exams/{examId}/questions
{
  "questionId": "q_abc123",
  "score": 2.0
}
```

### 4. Score Validation ✅
- Prevents adding questions that would exceed maxScore
- Clear error messages
- Current total tracking

**Error Response:**
```json
{
  "error": "Total score would exceed the exam's maximum value (10.0 points)"
}
```

### 5. Question Update Impact ✅
- Track which exams use a question
- Notify about impacted exams when updating
- Update answer keys automatically

**API Response:**
```json
{
  "message": "Question successfully updated. 2 exam(s) were impacted.",
  "impactedExams": 2
}
```

### 6. Random Exam Generation ✅
- Specify criteria (subject, difficulty, quantity)
- Validate sufficient questions exist
- Random selection from matching questions
- Auto-distribute scores

**API Example:**
```bash
POST /api/exams/generate
{
  "title": "Auto-Generated Exam",
  "applicationDate": "2025-12-15",
  "maxScore": 10.0,
  "criteria": [
    { "subject": "Project Management", "difficulty": "Medium", "quantity": 5 },
    { "subject": "Requirements", "difficulty": "Easy", "quantity": 5 }
  ]
}
```

**Error Response (Insufficient Questions):**
```json
{
  "error": "There are not enough questions to generate the exam. 2 Algebra (Medium Difficulty) questions are missing."
}
```

### 7. Exam Publication ✅
- Validate exam has questions
- Validate total score is reasonable
- Change status to "Published"
- Associate with class
- Lock questions from editing

**API Example:**
```bash
POST /api/exams/{examId}/publish
{
  "classId": "301"
}
```

## Usage Examples

### Creating a Complete Question

```typescript
import QuestionService from './services/QuestionService';

const question = await QuestionService.createQuestion({
  type: 'closed',
  text: 'What is dependency injection?',
  options: [
    'A design pattern',
    'A programming language',
    'A database',
    'An IDE'
  ],
  correctIndices: [0],
  subject: 'Software Engineering',
  difficulty: 'Medium',
  tags: ['Design Patterns', 'SOLID']
});

console.log(question.message); // "Question successfully registered"
console.log(question.question.code); // "QST001"
```

### Building an Exam

```typescript
import ExamService from './services/ExamService';

// 1. Create blank exam
const { exam } = await ExamService.createExam({
  title: 'Midterm Exam',
  applicationDate: '2025-12-15',
  maxScore: 10.0,
  status: 'In Editing'
});

// 2. Add questions
await ExamService.addQuestionToExam(exam.id!, 'question_id_1', 2.5);
await ExamService.addQuestionToExam(exam.id!, 'question_id_2', 2.5);
await ExamService.addQuestionToExam(exam.id!, 'question_id_3', 5.0);

// 3. Publish
await ExamService.publishExam(exam.id!, 'class_301');
```

### Auto-Generating an Exam

```typescript
const { exam } = await ExamService.generateExam({
  title: 'Generated Exam',
  applicationDate: '2025-12-20',
  maxScore: 10.0,
  criteria: [
    { subject: 'Algorithms', difficulty: 'Hard', quantity: 3 },
    { subject: 'Data Structures', difficulty: 'Medium', quantity: 7 }
  ]
});

console.log(`Generated exam with ${exam.questions.length} questions`);
```

## Testing

To test the implementation:

1. Start the server:
```bash
cd server
npm install
npm start
```

2. The server will run on `http://localhost:3005`

3. Use the API endpoints or build React components using the provided services

## Next Steps

Potential enhancements:
1. UI Components for question and exam management
2. Question preview and editing screens
3. Exam builder interface with drag-and-drop
4. Analytics dashboard for question usage
5. Export exams to PDF
6. Student exam-taking interface
7. Automatic grading for multiple-choice questions

## File Structure

```
server/
├── src/
│   ├── models/
│   │   ├── Questions.ts      # Enhanced with new fields
│   │   ├── Exam.ts            # New exam model
│   │   └── Exams.ts           # Legacy, kept for compatibility
│   ├── services/
│   │   ├── QuestionBankService.ts  # Question management
│   │   ├── ExamService.ts          # Exam management
│   │   └── dataService.ts          # Updated with new services
│   └── routes/
│       ├── questions.ts       # Questions API
│       ├── exams.ts           # Exams API
│       └── index.ts           # Updated to include new routes

client/
├── src/
│   ├── types/
│   │   ├── Question.ts        # Question types
│   │   └── Exam.ts            # Exam types
│   └── services/
│       ├── QuestionService.ts # Question API client
│       └── ExamService.ts     # Exam API client
```

## Summary

All scenarios from the feature specification have been implemented:
- ✅ Question registration with multiple-choice support
- ✅ Blank exam creation
- ✅ Adding questions to exams with score tracking
- ✅ Score validation (preventing exceeding max)
- ✅ Question updates with exam impact tracking
- ✅ Random exam generation with validation
- ✅ Exam publication with class association

The system is fully functional and ready for frontend UI development.
