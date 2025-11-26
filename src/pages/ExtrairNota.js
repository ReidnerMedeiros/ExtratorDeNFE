// src/pages/ExtrairNota.js   ← VERSÃO FINAL CORRIGIDA
import React, { useState } from 'react';
import axios from 'axios';
import ConsultaRAG from "../components/ConsultaRAG";  // ← Caminho corrigido
import '../App.css';  // ← Agora importa do App.css principal (ou crie um ExtrairNota.css)

// MUDANÇA 1: Nome do componente agora é ExtrairNota (não App)
function ExtrairNota() {
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [resultadoLancamento, setResultadoLancamento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLancamento, setLoadingLancamento] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResultadoLancamento(null);
    setJsonData(null); // ← Boa prática: limpar ao trocar arquivo
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post('/api/processar-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJsonData(response.data);
      setResultadoLancamento(null);
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      const msg = error.response?.data?.error || error.message || 'Erro ao conectar com o servidor';
      alert('Erro ao processar: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLancarRegistro = async () => {
    if (!jsonData) {
      alert('Nenhum dado extraído para lançar.');
      return;
    }
    setLoadingLancamento(true);
    try {
      const response = await axios.post('/api/lancar-registro', jsonData);
      setResultadoLancamento(response.data);
    } catch (error) {
      console.error('Erro ao lançar registro:', error);
      const errorMessage =
        error.response?.data?.mensagens?.[0]?.mensagem ||
        error.response?.data?.error ||
        error.message ||
        'Erro ao conectar com o servidor';
      alert('Erro ao lançar registro: ' + errorMessage);
      setResultadoLancamento({
        mensagens: [{ tipo: 'ERRO', mensagem: errorMessage }],
        sucesso: false,
        fornecedor: {},
        faturado: {},
        despesa: {},
        movimento: {}
      });
    } finally {
      setLoadingLancamento(false);
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">Extrair e Lançar Nota Fiscal</h1>
      
      <div className="upload-container">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="file-input"
        />
        
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleSubmit} disabled={loading} className="submit-button">
            {loading ? 'Processando PDF...' : '1. Extrair Dados'}
          </button>
          
          <button
            onClick={handleLancarRegistro}
            disabled={loadingLancamento || !jsonData}
            className="submit-button"
            style={{ marginLeft: '10px' }}
          >
            {loadingLancamento ? 'Lançando...' : '2. Lançar Registro'}
          </button>
        </div>
      </div>

      {jsonData && (
        <div className="json-container">
          <h2 className="json-title">Dados Extraídos com Sucesso</h2>
          <pre>{JSON.stringify(jsonData, null, 2)}</pre>
        </div>
      )}

      {resultadoLancamento && (
        <div className="json-container" style={{ marginTop: '30px', padding: '20px', border: '2px solid #764ba2', borderRadius: '10px' }}>
          <h2 className="json-title">Resultado do Lançamento</h2>
          {resultadoLancamento.mensagens?.map((msg, index) => (
            <p key={index} style={{
              color: msg.tipo === 'ERRO' ? '#e74c3c' : '#2ecc71',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              {msg.tipo}: {msg.mensagem}
            </p>
          ))}
          {resultadoLancamento.sucesso && (
            <p style={{ color: '#2ecc71', fontSize: '1.3rem', fontWeight: 'bold' }}>
              Registro lançado com sucesso no sistema!
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <ConsultaRAG />
      </div>
    </div>
  );
}

// MUDANÇA 2: Exportar com o nome correto
export default ExtrairNota;