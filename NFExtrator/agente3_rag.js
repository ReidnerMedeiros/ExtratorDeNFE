// agente3_rag.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function agente3_rag(pergunta) {
  try {
    if (!pergunta?.trim()) return { resposta: 'Faça uma pergunta.', dados: [] };

    const normalizado = removerAcentos(pergunta.toLowerCase().trim());
    console.log('RAG - Pergunta normalizada:', normalizado);

    // === EXTRAI CATEGORIA ===
    const categoria = extrairCategoria(normalizado);
    const termoLivre = normalizado.split(' ').find(p => p.length > 3);

    // === MONTA FILTRO DINÂMICO ===
    let query = supabase
      .from('tb_movimentocontas')
      .select(`
        numeronotafiscal,
        valortotal,
        dataemissao,
        descricao,
        tb_movimentocontas_classificacao!inner (
          tb_classificacao!inner (descricao)
        )
      `)
      .order('dataemissao', { ascending: false });

    // Se tem categoria → filtra
    if (categoria) {
      query = query.ilike('tb_movimentocontas_classificacao.tb_classificacao.descricao', `%${categoria}%`);
    }

    // Se tem termo livre → busca em descrição
    if (termoLivre && !categoria) {
      query = query.ilike('descricao', `%${termoLivre}%`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Erro Supabase:', error.message);
      return { resposta: 'Erro no banco.', dados: [] };
    }

    console.log(`RAG - Encontradas ${rows.length} notas.`);

    // === CONTEXTO INTELIGENTE ===
    const contexto = rows.length > 0
      ? `Encontradas ${rows.length} notas:\n` +
        rows.slice(0, 5).map(r =>
          `- ${r.numeronotafiscal}: R$ ${r.valortotal} | ${r.dataemissao} | ${r.tb_movimentocontas_classificacao?.[0]?.tb_classificacao?.descricao || 'Sem categoria'}`
        ).join('\n')
      : 'Nenhum registro encontrado.';

    // === GEMINI ===
    let resposta = 'Erro na IA.';
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `
Você é um assistente financeiro. Responda em português, de forma clara e objetiva.

Pergunta: "${pergunta}"
Dados: ${contexto}

Se for contagem, diga o número. Se for lista, resuma. Se não souber, diga "Não encontrei."
`;

      const result = await model.generateContent(prompt);
      resposta = result.response?.text?.() || 'Sem resposta.';
    } catch (err) {
      console.error('Erro Gemini:', err.message);
    }

    return { resposta, dados: rows };

  } catch (error) {
    console.error('Erro crítico:', error.message);
    return { resposta: 'Erro interno.', dados: [] };
  }
}

// === FUNÇÕES AUXILIARES ===
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extrairCategoria(texto) {
  const mapeamento = {
    'insumos agricolas': 'INSUMOS AGRÍCOLAS',
    'insumos': 'INSUMOS AGRÍCOLAS',
    'agricolas': 'INSUMOS AGRÍCOLAS',
    'sementes': 'INSUMOS AGRÍCOLAS',
    'fertilizantes': 'INSUMOS AGRÍCOLAS',
    'defensivos': 'INSUMOS AGRÍCOLAS',
    'adubos': 'INSUMOS AGRÍCOLAS',

    'manutencao e operacao': 'MANUTENÇÃO E OPERAÇÃO',
    'manutencao': 'MANUTENÇÃO E OPERAÇÃO',
    'operacao': 'MANUTENÇÃO E OPERAÇÃO',
    'combustivel': 'MANUTENÇÃO E OPERAÇÃO',
    'pecas': 'MANUTENÇÃO E OPERAÇÃO',
    'pneus': 'MANUTENÇÃO E OPERAÇÃO',
    'filtros': 'MANUTENÇÃO E OPERAÇÃO',
    'graxa': 'MANUTENÇÃO E OPERAÇÃO',
    'oleo': 'MANUTENÇÃO E OPERAÇÃO',

    'recursos humanos': 'RECURSOS HUMANOS',
    'mao de obra': 'RECURSOS HUMANOS',
    'salarios': 'RECURSOS HUMANOS',

    'servicos operacionais': 'SERVIÇOS OPERACIONAIS',
    'frete': 'SERVIÇOS OPERACIONAIS',
    'colheita': 'SERVIÇOS OPERACIONAIS',

    'infraestrutura': 'INFRAESTRUTURA E UTILIDADES',
    'arrendamento': 'INFRAESTRUTURA E UTILIDADES',
    'energia': 'INFRAESTRUTURA E UTILIDADES',

    'administrativas': 'ADMINISTRATIVAS',
    'contador': 'ADMINISTRATIVAS',
    'bancarias': 'ADMINISTRATIVAS',

    'seguros': 'SEGUROS E PROTEÇÃO',
    'protecao': 'SEGUROS E PROTEÇÃO',

    'impostos': 'IMPOSTOS E TAXAS',
    'taxas': 'IMPOSTOS E TAXAS',
    'itr': 'IMPOSTOS E TAXAS',

    'investimentos': 'INVESTIMENTOS',
    'maquinas': 'INVESTIMENTOS',

    'custos fixos': 'CUSTOS FIXOS GERAIS',
    'aluguel': 'CUSTOS FIXOS GERAIS',

    'custos variaveis': 'CUSTOS VARIÁVEIS GERAIS',

    'outros': 'OUTROS'
  };

  for (const [chave, valor] of Object.entries(mapeamento)) {
    if (texto.includes(chave)) return valor;
  }
  return null;
}

module.exports = agente3_rag;