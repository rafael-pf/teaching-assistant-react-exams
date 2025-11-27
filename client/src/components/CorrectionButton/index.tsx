import "./CorrectionButton.css";
import CorrectionService from "../../services/CorrectionService";
import CustomButton from "../CustomButton";

interface CorrectionButtonProps {
    students: any[];
    exam: any;
    label: string;
    isActive: boolean;
    className?: string;
}

export default function CorrectionButton({ students, exam, label, isActive, className = '' }: CorrectionButtonProps) {
  
  // 🔥 hover ativo só quando condição é true
  const hoverClass = isActive ? '' : 'no-hover';

  // 🔥 cor muda dinamicamente
  const appliedColor = isActive ? undefined : "#cccccc";

  const handleCorrectExam = async () => {
    if (!exam || !students) return;

    console.log("Corrigindo provas...");
    CorrectionService.correctAllExams(students, exam);
  };

  return (
      <CustomButton
          label={label}
          onClick={isActive ? handleCorrectExam : undefined} 
          color={appliedColor}
          className={`${className} ${hoverClass}`}
      />
  );
}