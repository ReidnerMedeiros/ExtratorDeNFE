require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Verifica se a chave da API está definida
if (!process.env.GEMINI_API_KEY) {
  console.error('Erro: GEMINI_API_KEY não está definida no arquivo .env');
  process.exit(1);
}
console.log('Chave da API (parcial):', process.env.GEMINI_API_KEY.slice(0, 5) + '...');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.post('/processar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    // Verifica se o arquivo foi enviado
    if (!req.file) {
      throw new Error('Nenhum arquivo PDF enviado');
    }

    const filePath = req.file.path;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prompt atualizado para extrair mais campos
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
      
      Retorne APENAS o JSON válido, sem texto extra ou explicações. Se um campo não estiver presente, use null.
    `;

    // Lê o PDF como binário
    const fileData = {
      inlineData: {
        data: fs.readFileSync(filePath).toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    // Faz a requisição ao Gemini
    console.log('Enviando requisição ao Gemini com PDF:', filePath);
    const result = await model.generateContent([prompt, fileData]);

    // Loga a resposta completa para depuração
    console.log('Resposta completa do Gemini:', JSON.stringify(result, null, 2));

    // Verifica a estrutura da resposta
    if (!result || !result.response || !result.response.candidates || !Array.isArray(result.response.candidates) || result.response.candidates.length === 0) {
      throw new Error('Resposta do Gemini inválida: candidates não encontrado ou vazio');
    }

    const candidate = result.response.candidates[0];
    if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      throw new Error('Resposta do Gemini inválida: parts não encontrado ou vazio');
    }

    let responseText = candidate.content.parts[0].text;

    // Log para depuração
    console.log('Resposta bruta do Gemini:', responseText);

    // Limpa markdown ou quebras de linha
    responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

    // Verifica se é um JSON válido
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError, 'Resposta:', responseText);
      throw new Error('Formato de JSON inválido retornado pelo Gemini');
    }

    // Limpa o arquivo temporário
    fs.unlinkSync(filePath);

    res.json(jsonResponse);
  } catch (error) {
    console.error('Erro no processamento do PDF:', error.message, error.stack);
    res.status(500).json({ error: `Erro ao processar o PDF: ${error.message}` });
  }
});

app.listen(5000, () => {
  console.log('Backend rodando na porta 5000 com Gemini 1.5-flash');
});