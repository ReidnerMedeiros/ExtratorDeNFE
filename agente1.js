// backend/agente1.js - Agente para Extração com Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

module.exports = async function agente1(filePath) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Prompt para Gemini (manter igual ou atualizar se necessário)
  const prompt = `
    Analise este PDF de nota fiscal (CONTAS A PAGAR) e extraia os dados em JSON estrito. 
    Use raciocínio lógico para classificar a despesa baseada na descrição dos produtos.
    
    Estrutura JSON obrigatória:
    {
      "fornecedor": {
        "razaoSocial": "string",
        "fantasia": "string ou null",
        "cnpj": "string",
        "endereco": {
          "rua": "string ou null",
          "numero": "string ou null",
          "bairro": "string ou null",
          "cidade": "string ou null",
          "estado": "string ou null",
          "cep": "string ou null"
        }
      },
      "faturado": {
        "nomeCompleto": "string",
        "cpf": "string ou null",
        "cnpj": "string ou null"
      },
      "numeroNotaFiscal": "string",
      "serieNota": "string ou null",
      "chaveNfe": "string ou null",
      "dataEmissao": "YYYY-MM-DD",
      "produtos": [
        {
          "codigo": "string ou null",
          "descricao": "string",
          "quantidade": number,
          "valorUnitario": number,
          "valorTotal": number
        }
      ],
      "quantidadeParcelas": number,
      "parcelas": [
        {
          "numero": number,
          "dataVencimento": "YYYY-MM-DD",
          "valor": number
        }
      ],
      "valorTotal": number,
      "icms": {
        "valor": number,
        "aliquota": "string ou null"
      },
      "formaPagamento": "string ou null",
      "classificacaoDespesa": "string (uma categoria principal)"
    }
    
    Categorias de despesas (classifique com base nos produtos; se não encaixar, use "OUTROS"):
    - INSUMOS AGRÍCOLAS: Sementes, Fertilizantes, Defensivos Agrícolas, Corretivos
    - MANUTENÇÃO E OPERAÇÃO: Combustíveis e Lubrificantes, Peças, Parafusos, Componentes Mecânicos, Manutenção de Máquinas e Equipamentos, Pneus, Filtros, Correias, Ferramentas e Utensílios
    - RECURSOS HUMANOS: Mão de Obra Temporária, Salários e Encargos
    - SERVIÇOS OPERACIONAIS: Frete e Transporte, Colheita Terceirizada, Secagem e Armazenagem, Pulverização e Aplicação
    - INFRAESTRUTURA E UTILIDADES: Energia Elétrica, Arrendamento de Terras, Construções e Reformas, Materiais de Construção
    - ADMINISTRATIVAS: Honorários (Contábeis, Advocatícios, Agronômicos), Despesas Bancárias e Financeiras
    - SEGUROS E PROTEÇÃO: Seguro Agrícola, Seguro de Ativos (Máquinas/Veículos), Seguro Prestamista
    - IMPOSTOS E TAXAS: ITR, IPTU, IPVA, INCRA-CCIR
    - INVESTIMENTOS: Aquisição de Máquinas e Implementos, Aquisição de Veículos, Aquisição de Imóveis, Infraestrutura Rural
    
    Regras adicionais:
    - Para campos numéricos (quantidade, valorUnitario, valorTotal, valor de parcelas, valorTotal da nota, icms.valor), retorne 0 se o valor não estiver disponível no PDF.
    - Para campos de texto ou outros, retorne null se não estiverem disponíveis.
    - Retorne APENAS o JSON válido, sem texto extra ou explicações.
  `;

  const fileData = {
    inlineData: {
      data: fs.readFileSync(filePath).toString('base64'),
      mimeType: 'application/pdf',
    },
  };

  const result = await model.generateContent([prompt, fileData]);

  if (!result || !result.response || !result.response.candidates || !Array.isArray(result.response.candidates) || result.response.candidates.length === 0) {
    throw new Error('Resposta do Gemini inválida: candidates não encontrado ou vazio');
  }

  const candidate = result.response.candidates[0];
  if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
    throw new Error('Resposta do Gemini inválida: parts não encontrado ou vazio');
  }

  let responseText = candidate.content.parts[0].text;
  responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

  let jsonResponse;
  try {
    jsonResponse = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Erro ao parsear JSON:', parseError, 'Resposta:', responseText);
    throw new Error('Formato de JSON inválido retornado pelo Gemini');
  }

  return jsonResponse;
};