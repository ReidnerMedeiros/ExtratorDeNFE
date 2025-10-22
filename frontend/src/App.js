import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

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
      console.log('Detalhes do erro:', error.message, error.code, error.config);
      alert('Erro ao processar: ' + (error.response?.data?.error || 'Erro desconhecido'));
    }
    setLoading(false);
  };

  const handleLancarRegistro = async (dados = jsonData, confirmado = false) => {
    if (!dados) {
      alert('Nenhum dado extraído para lançar.');
      return;
    }
    setLoadingLancamento(true);

    try {
      const payload = { ...dados };
      if (confirmado) {
        payload.adicionarParcelasConfirmado = true;
      }
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/lancar-registro`,
        payload
      );
      setResultadoLancamento(response.data);
    } catch (error) {
      console.error('Erro ao lançar registro:', error);
      console.log('Detalhes do erro:', error.message, error.code, error.config);
      const errorMessage = error.response?.data?.error || 'Erro desconhecido';
      if (errorMessage.includes('Parcelas já existem para esta nota fiscal')) {
        const confirmar = window.confirm(
          'Parcelas já existem para esta nota fiscal. Deseja adicionar mais parcelas?'
        );
        if (confirmar) {
          await handleLancarRegistro(dados, true);
        } else {
          setResultadoLancamento({
            mensagens: [{ tipo: 'ERRO', mensagem: 'Operação cancelada pelo usuário.' }],
            sucesso: false,
          });
        }
      } else {
        alert('Erro ao lançar registro: ' + errorMessage);
      }
    }
    setLoadingLancamento(false);
  };

  const handleAdicionarParcelas = () => {
    const confirmar = window.confirm(
      'Parcelas já existem para esta nota fiscal. Deseja adicionar mais parcelas?'
    );
    if (confirmar) {
      handleLancarRegistro(jsonData, true);
    } else {
      setResultadoLancamento({
        mensagens: [{ tipo: 'ERRO', mensagem: 'Operação cancelada pelo usuário.' }],
        sucesso: false,
      });
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `R$ ${Number(value).toFixed(2)}`;
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
        {resultadoLancamento?.mensagens.some(msg => msg.mensagem.includes('Parcelas já existem')) && (
          <button
            onClick={handleAdicionarParcelas}
            disabled={loadingLancamento}
            className="submit-button"
          >
            Adicionar Mais Parcelas
          </button>
        )}
      </div>
      {jsonData && (
        <div className="json-container">
          <h2 className="json-title">Dados Extraídos</h2>
          <div className="json-section">
            <h3>Fornecedor</h3>
            <p><strong>Razão Social:</strong> {jsonData.fornecedor.razaoSocial || 'N/A'}</p>
            <p><strong>Fantasia:</strong> {jsonData.fornecedor.fantasia || 'N/A'}</p>
            <p><strong>CNPJ:</strong> {jsonData.fornecedor.cnpj || 'N/A'}</p>
            <p><strong>Endereço:</strong> {jsonData.fornecedor.endereco?.rua
              ? `${jsonData.fornecedor.endereco.rua || ''}, ${jsonData.fornecedor.endereco.numero || ''}, ${jsonData.fornecedor.endereco.bairro || ''}, ${jsonData.fornecedor.endereco.cidade || ''} - ${jsonData.fornecedor.endereco.estado || ''}, ${jsonData.fornecedor.endereco.cep || ''}`
              : 'N/A'}</p>
          </div>
          <div className="json-section">
            <h3>Faturado</h3>
            <p><strong>Nome:</strong> {jsonData.faturado.nomeCompleto || 'N/A'}</p>
            <p><strong>CPF:</strong> {jsonData.faturado.cpf || 'N/A'}</p>
            <p><strong>CNPJ:</strong> {jsonData.faturado.cnpj || 'N/A'}</p>
          </div>
          <div className="json-section">
            <h3>Nota Fiscal</h3>
            <p><strong>Número:</strong> {jsonData.numeroNotaFiscal || 'N/A'}</p>
            <p><strong>Série:</strong> {jsonData.serieNota || 'N/A'}</p>
            <p><strong>Chave NF-e:</strong> {jsonData.chaveNfe || 'N/A'}</p>
            <p><strong>Data de Emissão:</strong> {jsonData.dataEmissao || 'N/A'}</p>
          </div>
          <div className="json-section">
            <h3>Produtos</h3>
            <ul>
              {jsonData.produtos && jsonData.produtos.length > 0 ? (
                jsonData.produtos.map((produto, index) => (
                  <li key={index}>
                    <p><strong>Código:</strong> {produto.codigo || 'N/A'}</p>
                    <p><strong>Descrição:</strong> {produto.descricao || 'N/A'}</p>
                    <p><strong>Quantidade:</strong> {produto.quantidade ?? 'N/A'}</p>
                    <p><strong>Valor Unitário:</strong> {formatCurrency(produto.valorUnitario)}</p>
                    <p><strong>Valor Total:</strong> {formatCurrency(produto.valorTotal)}</p>
                  </li>
                ))
              ) : (
                <p>Nenhum produto encontrado</p>
              )}
            </ul>
          </div>
          <div className="json-section">
            <h3>Pagamento</h3>
            <p><strong>Quantidade de Parcelas:</strong> {jsonData.quantidadeParcelas ?? 'N/A'}</p>
            <p><strong>Forma de Pagamento:</strong> {jsonData.formaPagamento || 'N/A'}</p>
            <h4>Parcelas</h4>
            <ul>
              {jsonData.parcelas && jsonData.parcelas.length > 0 ? (
                jsonData.parcelas.map((parcela, index) => (
                  <li key={index}>
                    <p><strong>Parcela {parcela.numero}:</strong> Vencimento em {parcela.dataVencimento || 'N/A'}, Valor: {formatCurrency(parcela.valor)}</p>
                  </li>
                ))
              ) : (
                <p>Nenhuma parcela encontrada</p>
              )}
            </ul>
          </div>
          <div className="json-section">
            <h3>Impostos</h3>
            <p><strong>ICMS:</strong> {jsonData.icms ? `${formatCurrency(jsonData.icms.valor)} (Alíquota: ${jsonData.icms.aliquota || 'N/A'})` : 'N/A'}</p>
          </div>
          <div className="json-section">
            <h3>Outros</h3>
            <p><strong>Valor Total:</strong> {formatCurrency(jsonData.valorTotal)}</p>
            <p><strong>Classificação da Despesa:</strong> {jsonData.classificacaoDespesa || 'N/A'}</p>
          </div>
          <div className="json-section">
            <h3>JSON Completo</h3>
            <pre className="json-output">{JSON.stringify(jsonData, null, 2)}</pre>
          </div>
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