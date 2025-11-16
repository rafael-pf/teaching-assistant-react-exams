import React from 'react';
import { Student } from '../types/Student';
import { studentService } from '../services/StudentService';
import '../services/ExamsService'

interface StudentListProps {
  students: Student[];
  onCorrection: (student: Student, examId: String) => void;
  loading: boolean;
}

const ExamList: React.FC<StudentListProps> = ({ 
  students, 
  onCorrection, 
  loading 
}) => {
  const handleEdit = (student: Student, examId: String) => {
    onCorrection(student, examId);
  };

  if (loading) {
    return (
      <div className="students-list">
        <h2>Students ({students.length})</h2>
        <div className="loading">Loading students...</div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="students-list">
        <h2>Students (0)</h2>
        <div className="no-students">
          No students registered yet. Add your first student using the form above.
        </div>
      </div>
    );
  }

  return (
    <div className="students-list">
      <h2>Students ({students.length})</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>CPF</th>
              <th>Email</th>
              <th>Correction</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.cpf}>
                <td>{student.name}</td>
                <td>{student.cpf}</td>
                <td>{student.email}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(student, "examId123")}>Correct Exam</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamList;