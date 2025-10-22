import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Log para depurar a URL da API
console.log('API URL:', process.env.REACT_APP_API_URL);

function App() {
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [resultadoLancamento, setResultadoLancamento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLancamento, setLoadingLancamento] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResultadoLancamento(null);
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
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/processar-pdf`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      setJsonData(response.data);
      setResultadoLancamento(null);
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      console.log('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });
      alert('Erro ao processar: ' + (error.response?.data?.error || 'Erro ao conectar com o servidor'));
    }
    setLoading(false);
  };

  const handleLancarRegistro = async (dados = jsonData) => {
    if (!dados) {
      alert('Nenhum dado extraído para lançar.');
      return;
    }
    setLoadingLancamento(true);

    try {
      const payload = { ...dados };
      console.log('Payload enviado para lancar-registro:', JSON.stringify(payload, null, 2));
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/lancar-registro`,
        payload
      );
      console.log('Resultado recebido do lancar-registro:', JSON.stringify(response.data, null, 2));
      setResultadoLancamento(response.data);
    } catch (error) {
      console.error('Erro ao lançar registro:', error);
      console.log('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });
      const errorMessage = error.response?.data?.mensagens?.[0]?.mensagem || 'Erro ao conectar com o servidor';
      alert('Erro ao lançar registro: ' + errorMessage);
      setResultadoLancamento({
        mensagens: [{ tipo: 'ERRO', mensagem: errorMessage }],
        sucesso: false,
        fornecedor: {},
        faturado: {},
        despesa: {},
        movimento: {}
      });
    }
    setLoadingLancamento(false);
  };

  return (
    <div className="app-container">
      <h1 className="title">Processador de Nota Fiscal</h1>
      <div className="upload-container">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="file-input"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Processando...' : 'Extrair Dados'}
        </button>
        <button
          onClick={() => handleLancarRegistro()}
          disabled={loadingLancamento || !jsonData}
          className="submit-button"
        >
          {loadingLancamento ? 'Lançando...' : 'Lançar Registro'}
        </button>
      </div>
      {jsonData && (
        <div className="json-container">
          <h2 className="json-title">Dados Extraídos</h2>
          <pre>{JSON.stringify(jsonData, null, 2)}</pre>
        </div>
      )}
      {resultadoLancamento && (
        <div className="json-container" style={{ marginTop: '30px' }}>
          <h2 className="json-title">Resultado do Lançamento</h2>
          {resultadoLancamento.mensagens.map((msg, index) => (
            <p key={index} style={{ color: msg.tipo === 'ERRO' ? 'red' : msg.tipo === 'SUCESSO' ? 'green' : 'black' }}>
              <strong>{msg.tipo}:</strong> {msg.mensagem}
            </p>
          ))}
          {resultadoLancamento.sucesso && (
            <p style={{ color: 'green' }}>Registro lançado com sucesso!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;