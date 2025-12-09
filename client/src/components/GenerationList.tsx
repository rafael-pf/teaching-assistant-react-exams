import React from 'react';

type Generation = {
  id: string;
  examId: number;
  classId: string;
  timestamp: string;
  description?: string;
  versions?: any[];
};

export default function GenerationList({ generations, onSelect }: { generations: Generation[]; onSelect?: (id: string) => void }) {
  if (!generations || generations.length === 0) return <div>Nenhuma geração encontrada.</div>;

  const handleCopy = (id: string) => {
    try {
      navigator.clipboard.writeText(id);
      alert('ID copiado: ' + id);
    } catch (e) {
      // fallback
      const el = document.createElement('textarea');
      el.value = id;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert('ID copiado: ' + id);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <h3>Gerações</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {generations.map(g => (
          <li key={g.id} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{g.id} <span style={{ color: '#666', fontWeight: 400 }}> (Prova {g.examId})</span></div>
              <div style={{ fontSize: 12, color: '#666' }}>{g.description || ''} — {new Date(g.timestamp).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{(g.versions || []).length} versões</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onSelect && <button onClick={() => onSelect(g.id)}>Selecionar</button>}
              <button onClick={() => handleCopy(g.id)}>Copiar ID</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
