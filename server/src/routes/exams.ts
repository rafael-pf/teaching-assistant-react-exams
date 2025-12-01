import { Router, Request, Response } from "express";
import {
  getStudentsWithExamsForClass,
  getExamsForClass,
  addExam,
  triggerSaveExams,
  generateStudentExams,
  getQuestionById,
  getQuestionsByIds,
  examsManager,
  deleteExam,
  getExamById,
  triggerSaveStudentsExams,
} from "../services/dataService";

const router = Router();

/**
 * GET /api/exams/students
 * Get students with exam information for a specific class and exam
 * Query parameters:
 *   - classId: The class ID (required)
 *   - examId: The exam ID (optional - if not provided, returns all exams in class)
 */
router.get("/students", (req: Request, res: Response) => {
  try {
    const { classId, examId } = req.query;

    // Validate classId is provided
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    // Convert examId to number if provided
    let examIdNum: number | undefined;
    if (examId) {
      examIdNum = parseInt(examId as string, 10);
      if (isNaN(examIdNum)) {
        return res.status(400).json({
          error: "examId must be a valid number",
        });
      }
    }

    // Get students with exam information
    const studentsWithExams = getStudentsWithExamsForClass(classId, examIdNum);

    if (studentsWithExams.length === 0) {
      return res.status(200).json({
        message: "No students found for the given class and exam criteria",
        classId: classId,
        examId: examIdNum || "all",
        total: 0,
        data: [],
      });
    }

    // Transform data to table format with all required fields
    const tableData = studentsWithExams.map(studentData => {
      // Get the exam definition to retrieve question details
      const examDef = getExamsForClass(classId).find(
        (e) => e.id === studentData.examId
      );

      if (!examDef) {
        return null;
      }

      // Get ONLY the questions selected for THIS student
      const examQuestions = studentData.answers
        .map((a: { questionId: number; answer: any; }) => {
          const q = getQuestionById(a.questionId);
          if (!q) return null;

          return {
            idQuestion: q.id,
            tipoQuestao: q.type === "open" ? "Aberta" : "Fechada",
            textoPergunta: q.question,
            respostaAluno: a.answer, // opcional: devolve a resposta
          };
        })
        .filter(Boolean);

      // Return table row format
      return {
        studentName: studentData.studentName,
        examID: studentData.examId,
        qtdAberta: examDef.openQuestions,
        qtdFechada: examDef.closedQuestions,
        ativo: "Sim",
        details: examQuestions,
      };
    }).filter(Boolean); // Remove null entries

    res.status(200).json({
      message: "Students with exam information retrieved successfully",
      classId: classId,
      examId: examIdNum || "all",
      total: tableData.length,
      data: tableData,
    });
  } catch (error) {
    console.error("Error fetching students with exams:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/exams/class/:classId
 * Get all exams for a specific class
 */
router.get("/class/:classId", (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    const exams = getExamsForClass(classId);

    if (exams.length === 0) {
      return res.status(404).json({
        message: "No exams found for the given class",
        classId: classId,
        data: [],
      });
    }

    res.status(200).json({
      message: "Exams retrieved successfully",
      classId: classId,
      total: exams.length,
      data: exams,
    });
  } catch (error) {
    console.error("Error fetching exams by class:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/exams/:examId/generate
 * Generate randomized student exams with different questions for each student
 * Query parameters:
 *   - classId: The class ID (required)
 */
router.post("/:examId/generate", (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { classId } = req.query;

    // Validate examId
    if (!examId) {
      return res.status(400).json({
        error: "examId is required",
      });
    }

    const examIdNum = parseInt(examId, 10);
    if (isNaN(examIdNum)) {
      return res.status(400).json({
        error: "examId must be a valid number",
      });
    }

    // Validate classId
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    // Generate student exams
    const generatedExams = generateStudentExams(examIdNum, classId);

    res.status(201).json({
      message: "Student exams generated successfully",
      examId: examIdNum,
      classId: classId,
      totalGenerated: generatedExams.length,
      data: generatedExams,
    });
  } catch (error) {
    console.error("Error generating student exams:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/exams
 * Create a new exam
 * Body parameters:
 *   - nomeProva: Exam name (required)
 *   - classId: Class ID (required)
 *   - quantidadeAberta: Number of open questions (required, non-negative integer)
 *   - quantidadeFechada: Number of closed questions (required, non-negative integer)
 *   - questionIds: Array of question IDs to include in the exam (required)
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const {
      nomeProva,
      classId,
      quantidadeAberta,
      quantidadeFechada,
      questionIds,
    } = req.body;

    // Validate required fields
    if (!nomeProva || typeof nomeProva !== "string") {
      return res.status(400).json({
        error: "nomeProva is required and must be a string",
      });
    }

    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    // Validate questionIds is provided
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        error: "questionIds is required and must be a non-empty array",
      });
    }

    // Validate question quantities
    if (
      quantidadeAberta === undefined ||
      !Number.isInteger(quantidadeAberta) ||
      quantidadeAberta < 0
    ) {
      return res.status(400).json({
        error: "quantidadeAberta is required and must be a non-negative integer",
      });
    }

    if (
      quantidadeFechada === undefined ||
      !Number.isInteger(quantidadeFechada) ||
      quantidadeFechada < 0
    ) {
      return res.status(400).json({
        error: "quantidadeFechada is required and must be a non-negative integer",
      });
    }

    // Validate that at least one question type is required
    if (quantidadeAberta === 0 && quantidadeFechada === 0) {
      return res.status(400).json({
        error: "At least one question is required (quantidadeAberta or quantidadeFechada must be > 0)",
      });
    }

    // Generate sequential ID
    const allExamsGlobal = examsManager.getAllExams();
    const maxId = allExamsGlobal.reduce((max, exam) => Math.max(max, exam.id), 0);
    const examId = maxId + 1;

    // Validate that all provided question IDs exist
    const questions = getQuestionsByIds(questionIds);

    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        error: "Some question IDs do not exist",
      });
    }

    // Count open and closed questions in the provided list
    const openQuestionsProvided = questions.filter((q: any) => q.type === 'open').length;
    const closedQuestionsProvided = questions.filter((q: any) => q.type === 'closed').length;

    // Validate that the provided questions match the required quantities
    if (openQuestionsProvided < quantidadeAberta) {
      return res.status(400).json({
        error: `Not enough open questions in questionIds. Required: ${quantidadeAberta}, Provided: ${openQuestionsProvided}`,
      });
    }

    if (closedQuestionsProvided < quantidadeFechada) {
      return res.status(400).json({
        error: `Not enough closed questions in questionIds. Required: ${quantidadeFechada}, Provided: ${closedQuestionsProvided}`,
      });
    }

    // Create new exam object
    const newExam = {
      id: examId,
      classId: classId,
      title: nomeProva,
      isValid: true,
      openQuestions: quantidadeAberta,
      closedQuestions: quantidadeFechada,
      questions: questionIds,
    };

    // Add exam to the system
    addExam(newExam);
    triggerSaveExams();

    res.status(201).json({
      message: "Exam created successfully",
      data: newExam,
    });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/exams/:examId
 * Delete an exam from a class by its ID
 * Query parameters:
 *   - classId: The class ID (required) - validates the exam belongs to this class
 */
router.delete("/:examId", (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { classId } = req.query;

    // Validate examId
    if (!examId) {
      return res.status(400).json({
        error: "examId is required",
      });
    }

    const examIdNum = parseInt(examId, 10);
    if (isNaN(examIdNum)) {
      return res.status(400).json({
        error: "examId must be a valid number",
      });
    }

    // Validate classId
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    // Check if exam exists
    const exam = getExamById(examIdNum);
    if (!exam) {
      return res.status(404).json({
        error: `Exam with ID ${examIdNum} not found`,
      });
    }

    // Verify the exam belongs to the specified class
    if (exam.classId !== classId) {
      return res.status(403).json({
        error: `Exam ${examIdNum} does not belong to class ${classId}`,
      });
    }

    // Delete the exam (this also deletes associated student exams)
    const deleted = deleteExam(examIdNum);

    if (!deleted) {
      return res.status(500).json({
        error: "Failed to delete exam",
      });
    }

    // Persist changes to both files
    triggerSaveExams();
    triggerSaveStudentsExams();

    res.status(200).json({
      message: "Exam deleted successfully",
      examId: examIdNum,
      classId: classId,
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
