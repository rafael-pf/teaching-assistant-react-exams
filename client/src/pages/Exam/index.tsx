import React from "react";
import ExamsService from "../../services/ExamsService";
import AICorrectionService from "../../services/AICorrectionService";
import { Student } from "../../types/Student";
import ExamList from "../../components/ExamList";
import Dropdown from "../../components/DropDown";
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";
import ModelSelectionModal from "../../components/ModelSelectionModal";
import SuccessModal from "../../components/SuccessModal";
import Alert from "../../components/Alert";

const Exam: React.FC = () => {
    const [students, setStudents] = React.useState<Student[]>([]);
    const [selectedClass, setSelectedClass] = React.useState<string>("");
    const [isModelModalOpen, setIsModelModalOpen] = React.useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
    const [selectedModel, setSelectedModel] = React.useState<string>("");
    const [alert, setAlert] = React.useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const [successData, setSuccessData] = React.useState<{
        model: string;
        estimatedTime: string;
        totalStudentExams: number;
        totalOpenQuestions: number;
        queuedMessages: number;
    } | null>(null);

    const testStudent: Student = {
        name: "Aluno Teste",
        cpf: "123.456.789-00",
        email: "aluno.teste@example.com"
    }

    const handleCorrectOpenQuestions = () => {
        setIsModelModalOpen(true);
    };

    const handleModelSelect = async (model: string) => {

        if (!model) {
            setAlert({
                message: "Você deve selecionar um modelo de IA para continuar",
                severity: 'error'
            });
            return;
        }

        // Validação dupla: verifica novamente se a matéria está selecionada
        if (!selectedClass || selectedClass === 'Selecione uma matéria' || selectedClass.trim() === '') {
            console.log("Validação falhou: selectedClass está vazio ou inválido");
            setAlert({
                message: "Você deve selecionar uma matéria antes de corrigir",
                severity: 'warning'
            });
            setIsModelModalOpen(false);
            return;
        }

        setSelectedModel(model);
        setIsModelModalOpen(false);

        try {
            const response = await AICorrectionService.triggerAICorrection(selectedClass, model);

            setSuccessData({
                model: model,
                estimatedTime: response.estimatedTime,
                totalStudentExams: response.totalStudentExams,
                totalOpenQuestions: response.totalOpenQuestions,
                queuedMessages: response.queuedMessages
            });
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            const errorMessage = error.message || "Erro ao iniciar a correção. Por favor, tente novamente.";
            setAlert({
                message: errorMessage,
                severity: 'error'
            });
        }
    };

    const handleCloseModelModal = () => {
        setIsModelModalOpen(false);
    };

    const handleCloseSuccessModal = () => {
        setIsSuccessModalOpen(false);
        setSuccessData(null);
    };

    const fetchStudents = async () => {
        try {
            const response = await ExamsService.correctExam("examId123", { answer1: "A", answer2: "B" });
            console.log("Exam corrected:", response);
            // Here you would typically update the students state with the fetched data
        } catch (error) {
            console.error("Error correcting exam:", error);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
            <Header />

            {alert && (
                <Alert
                    message={alert.message}
                    severity={alert.severity}
                    autoHideDuration={5000}
                    onClose={() => setAlert(null)}
                    open={!!alert}
                />
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Dropdown
                    subjects={["Engenharia de Software e Sistemas-2025-1", "Teste2"]}
                    initialText={selectedClass || "Selecione uma matéria"}
                    onSelect={(materia) => {
                        console.log("Dropdown selecionou matéria:", materia);
                        setSelectedClass(materia);
                        console.log("Estado selectedClass atualizado para:", materia);
                    }}
                />
                <CustomButton
                    label="Corrigir Questões Abertas"
                    onClick={handleCorrectOpenQuestions}
                    variant="primary"
                />
            </div>

            <ExamList
                students={[testStudent]}
                onCorrection={(student, examId) => console.log("Correcting", student, "for exam", examId)}
                loading={false}
            />

            <ModelSelectionModal
                isOpen={isModelModalOpen}
                onClose={handleCloseModelModal}
                onSelect={handleModelSelect}
                selectedModel={selectedModel}
            />

            {successData && (
                <SuccessModal
                    isOpen={isSuccessModalOpen}
                    onClose={handleCloseSuccessModal}
                    model={successData.model}
                    estimatedTime={successData.estimatedTime}
                    totalStudentExams={successData.totalStudentExams}
                    totalOpenQuestions={successData.totalOpenQuestions}
                    queuedMessages={successData.queuedMessages}
                />
            )}
        </div>
    );
};

export default Exam;