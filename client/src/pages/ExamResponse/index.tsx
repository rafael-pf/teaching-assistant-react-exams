import React, { useEffect, useState } from 'react';
import ResponseService from '../../services/ResponseService';
import Header from '../../components/Header';
import CustomButton from '../../components/CustomButton';

export default function ExamResponse({ examId: propExamId = undefined as any } : { examId?: number | string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentCpf, setStudentCpf] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [message, setMessage] = useState('');
  // Now student must enter a generation ID (string like `<examId>-<timestamp>`)
  const [generationId, setGenerationId] = useState<string | undefined>(propExamId ? String(propExamId) : undefined);
  const [loadedGenerationId, setLoadedGenerationId] = useState<string | undefined>(undefined);


  // Load questions only when user requests (by clicking 'Carregar Prova') or when propExamId provided
  useEffect(() => {
    if (!propExamId) return;
    setGenerationId(String(propExamId));
  }, [propExamId]);

  const handleChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [String(questionId)]: value }));
  };

  const handleLoadExam = async () => {
    setMessage('');
    if (!generationId) {
      setMessage('Informe o ID da geração antes de carregar.');
      return;
    }

    setLoading(true);
    try {
      const qs = await ResponseService.getQuestions(String(generationId));
      setQuestions(qs);
      setLoadedGenerationId(String(generationId));
      // Reset previous answers
      setAnswers({});
    } catch (err) {
      console.error('Failed to load questions', err);
      setMessage('Não foi possível carregar a prova. Verifique o ID.');
      setQuestions([]);
      setLoadedGenerationId(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!studentCpf) {
      setMessage('Informe o CPF do aluno antes de enviar.');
      return;
    }

    if (!loadedGenerationId) {
      setMessage('Carregue a prova (por ID de geração) antes de enviar as respostas.');
      return;
    }

    // Build answers array expected by server
    const payload = questions.map(q => ({ questionId: q.id, answer: answers[String(q.id)] ?? '' }));

    // Basic validation
    const incomplete = payload.some((a: any) => a.answer === null || a.answer === undefined || String(a.answer).trim() === '');
    if (incomplete) {
      setMessage('Por favor responda todas as questões antes de enviar.');
      return;
    }

    try {
      // Simulate a student token in Authorization header
      const token = 'student-token';
      // use loadedGenerationId which is guaranteed to be set when submitting
      await ResponseService.submitResponse(loadedGenerationId as string, studentCpf, payload, token);
      setMessage('Respostas enviadas com sucesso.');
      setAnswers({});
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Erro ao enviar respostas.');
    }
  };

  return (
    <div className="App">
      <Header />
      <main className="App-main">
        <div className="student-form">
          <h2>Responder Prova {loadedGenerationId ? `(Geração ${String(loadedGenerationId)})` : ''}</h2>

          <div className="form-group">
            <label>ID da geração:</label>
            <input value={generationId ?? ''} onChange={e => setGenerationId(e.target.value)} placeholder="ID da geração (ex: 1-1630000000000)" />
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={handleLoadExam}>Carregar Prova</button>
            </div>
          </div>

          {loading && <div className="loading">Carregando questões...</div>}

          <div className="form-group">
            <label>CPF do aluno:</label>
            <input value={studentCpf} onChange={e => setStudentCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>

          {questions.map(q => (
            <div key={q.id} className="form-group" style={{ border: '1px solid #e2e8f0', padding: 12, borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{q.question}</div>
              {q.type === 'closed' && Array.isArray(q.options) ? (
                q.options.map((opt: any) => (
                  <label key={opt.id} className="option-label" style={{ marginBottom: 6 }}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={String(answers[q.id]) === String(opt.id)}
                      onChange={() => handleChange(q.id, String(opt.id))}
                    />
                    {opt.option}
                  </label>
                ))
              ) : (
                <textarea value={answers[q.id] ?? ''} onChange={e => handleChange(q.id, e.target.value)} style={{ width: '100%', minHeight: 120, padding: 8 }} />
              )}
            </div>
          ))}

          <div className="form-buttons">
            <CustomButton label="Enviar respostas" onClick={handleSubmit} />
          </div>

          {message && <div className="error-message" style={{ marginTop: 12 }}>{message}</div>}
        </div>
      </main>
    </div>
  );
}

