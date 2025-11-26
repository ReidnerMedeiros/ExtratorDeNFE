import React, { useState } from 'react';
import axios from 'axios';

function ConsultaRAG() {
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePergunta = async () => {
    if (!pergunta.trim()) {
      alert('Digite uma pergunta antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      // ← CORRIGIDO: usa caminho relativo fixo
      const response = await axios.post('/api/consulta-rag', { pergunta });

      setResposta(response.data.resposta || 'Sem resposta textual.');
      setDados(response.data.dados || []);
    } catch (error) {
      console.error('Erro ao consultar RAG:', error);
      const msg = error.response?.data?.error || error.message || 'Erro no servidor';
      alert('Erro ao consultar: ' + msg);
      setResposta('');
      setDados([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="json-container" style={{ marginTop: '50px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 className="json-title">Consulta Inteligente (RAG)</h2>
      
      <textarea
        placeholder="Ex: Qual foi a maior despesa do mês passado? Quem é o fornecedor mais usado?"
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
        rows="5"
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '16px',
          marginBottom: '12px',
        }}
      />

      <button 
        onClick={handlePergunta} 
        disabled={loading} 
        className="submit-button"
        style={{ width: '100%', padding: '12px', fontSize: '16px' }}
      >
        {loading ? 'Consultando inteligência...' : 'Enviar Pergunta'}
      </button>

      {resposta && (
        <div style={{ marginTop: '25px', background: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Resposta:</h3>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.5' }}>
            {resposta}
          </p>
        </div>
      )}

      {dados.length > 0 && (
        <div style={{ marginTop: '25px' }}>
          <h3>Dados utilizados na resposta:</h3>
          <pre style={{ 
            background: '#f1f1f1', 
            padding: '15px', 
            borderRadius: '6px', 
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(dados, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ConsultaRAG;