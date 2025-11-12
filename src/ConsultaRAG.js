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
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/consulta-rag`,
        { pergunta }
      );
      setResposta(response.data.resposta);
      setDados(response.data.dados || []);
    } catch (error) {
      console.error('Erro ao consultar RAG:', error);
      alert('Erro ao consultar: ' + (error.response?.data?.error || 'Erro no servidor.'));
    }
    setLoading(false);
  };

  return (
    <div className="json-container" style={{ marginTop: '50px' }}>
      <h2 className="json-title">🔍 Consulta Inteligente (RAG)</h2>

      <textarea
        placeholder="Digite sua pergunta sobre o banco de dados..."
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
        rows="4"
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '10px',
        }}
      />

      <button onClick={handlePergunta} disabled={loading} className="submit-button">
        {loading ? 'Consultando...' : 'Enviar Pergunta'}
      </button>

      {resposta && (
        <div style={{ marginTop: '20px' }}>
          <h3>🧠 Resposta:</h3>
          <p>{resposta}</p>
        </div>
      )}

      {dados.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>📊 Dados Retornados:</h3>
          <pre>{JSON.stringify(dados, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default ConsultaRAG;
