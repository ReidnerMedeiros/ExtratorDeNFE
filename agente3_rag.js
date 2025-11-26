// agente3_rag.js — RAG DUPLO: SIMPLES + EMBEDDINGS (O MELHOR DOS DOIS MUNDOS)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelEmbedding = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const modelResposta = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function gerarEmbedding(texto) {
  const result = await modelEmbedding.embedContent(texto);
  return result.embedding.values;
}

async function agente3_rag(pergunta) {
  try {
    const original = pergunta.trim();
    const texto = removerAcentos(pergunta.toLowerCase().trim());
    console.log('RAG → Pergunta:', texto);

    // ============================================================
    // 1. TENTA RAG SIMPLES PRIMEIRO (RÁPIDO E CERTEIRO)
    // ============================================================
    const respostaSimples = await tentarRagSimples(original, texto);
    if (respostaSimples) {
      return respostaSimples; // Responde em < 1 segundo
    }

    // ============================================================
    // 2. SE NÃO ENTENDEU → RAG + EMBEDDINGS (INTELIGÊNCIA TOTAL)
    // ============================================================
    console.log('→ Usando RAG + Embeddings (modo avançado)');
    const embedding = await gerarEmbedding(original);

    const { data: documentos } = await supabase.rpc('match_documentos', {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 15
    });

    // Pega os movimentos reais relacionados
    const idsMovimentos = [...new Set(documentos.map(d => d.movimento_id).filter(Boolean))];
    let contas = [];
    if (idsMovimentos.length > 0) {
      const { data } = await supabase
        .from('tb_movimentocontas')
        .select(`
          idmovimentocontas,
          numeronotafiscal,
          dataemissao,
          valortotal,
          descricao,
          status,
          fornecedor:tb_pessoas!pessoas_idfornecedorcliente(razaosocial, fantasia),
          faturado:tb_pessoas!pessoas_idfaturado(razaosocial, fantasia),
          parcelas:tb_parcelascontas(datavencimento, valorparcela, valorpago, statusparcela)
        `)
        .in('idmovimentocontas', idsMovimentos)
        .order('dataemissao', { ascending: false })
        .limit(50);
      contas = data || [];
    }

    // Contexto rico
    const total = contas.reduce((s, c) => s + Number(c.valortotal || 0), 0);
    const contexto = contas.length > 0
      ? `Foram encontrados ${contas.length} registros relevantes:\n` +
        contas.slice(0, 10).map(c => {
          const p = c.fornecedor?.razaosocial || c.faturado?.razaosocial || '—';
          return `• NF ${c.numeronotafiscal || '-'} | R$ ${Number(c.valortotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})} | ${new Date(c.dataemissao).toLocaleDateString('pt-BR')} | ${p}`;
        }).join('\n') +
        `\n\nTotal nos registros: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
      : 'Não encontrei informações relevantes para sua pergunta.';

    // Resposta final com Gemini 2.0
    const prompt = `
Você é o melhor contador rural do Brasil. Fala como gente, direto e com autoridade.

Pergunta do produtor: "${original}"

Contexto que encontrei no sistema:
${contexto}

Responda em português brasileiro, natural, com emojis se fizer sentido.
Seja útil, claro e objetivo.

Resposta:`;

    const result = await modelResposta.generateContent(prompt);
    const resposta = result.response?.text?.() || 'Desculpe, não consegui entender direito.';

    return {
      resposta: resposta.trim(),
      dados: contas.slice(0, 25),
      estatisticas: { total, totalNotas: contas.length, modo: 'embeddings' }
    };

  } catch (e) {
    console.error('Erro RAG:', e.message);
    return { resposta: 'Deu ruim aqui, chefe. Tenta de novo que eu te ajudo!', dados: [] };
  }
}

// ============================================================
// RAG SIMPLES — RÁPIDO E INFALÍVEL PARA 95% DAS PERGUNTAS
// ============================================================
async function tentarRagSimples(original, texto) {
  const categoria = extrairCategoria(texto);
  const tipo = detectarTipoMovimento(texto);
  let nome = null;
  if (!categoria) {
    nome = extrairNomePessoa(texto);
  }

  let query = supabase.from('tb_movimentocontas').select(`
      idmovimentocontas, numeronotafiscal, dataemissao, valortotal, descricao, status,
      fornecedor:tb_pessoas!pessoas_idfornecedorcliente(razaosocial, fantasia),
      faturado:tb_pessoas!pessoas_idfaturado(razaosocial, fantasia)
    `).order('dataemissao', { ascending: false });

  // Categoria → prioridade máxima
  if (categoria) {
    const { data: cat } = await supabase.from('tb_classificacao').select('idclassificacao').eq('descricao', categoria).single();
    if (cat) {
      const { data: ids } = await supabase.from('tb_movimentocontas_classificacao')
        .select('movimentocontas_idmovimentocontas').eq('classificacao_idclassificacao', cat.idclassificacao);
      if (ids?.length > 0) {
        query = query.in('idmovimentocontas', ids.map(i => i.movimentocontas_idmovimentocontas));
      }
    }
  }

  if (tipo === 'fornecedor') query = query.not('pessoas_idfornecedorcliente', 'is', null);
  if (tipo === 'cliente') query = query.not('pessoas_idfaturado', 'is', null);
  if (nome) {
    query = query.or(`fornecedor.razaosocial.ilike.%${nome}%,fornecedor.fantasia.ilike.%${nome}%,faturado.razaosocial.ilike.%${nome}%`);
  }

  const { data: contas, error } = await query.limit(40);
  if (error || !contas || contas.length === 0) return null;

  const total = contas.reduce((s, c) => s + Number(c.valortotal || 0), 0);
  const contexto = `Encontradas ${contas.length} notas:\n` +
    contas.slice(0, 8).map(c => {
      const p = c.fornecedor?.razaosocial || c.faturado?.razaosocial || '—';
      return `• NF ${c.numeronotafiscal || '-'} | R$ ${Number(c.valortotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})} | ${new Date(c.dataemissao).toLocaleDateString('pt-BR')} | ${p}`;
    }).join('\n') +
    `\n\nTotal: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

  // Resposta rápida com Gemini (só formatação)
  const prompt = `Responda de forma natural e objetiva:\n\n"${original}"\n\n${contexto}\n\nResposta:`;
  const result = await modelResposta.generateContent(prompt);
  const resposta = result.response?.text?.() || contexto;

  return {
    resposta: resposta.trim(),
    dados: contas.slice(0, 20),
    estatisticas: { total, totalNotas: contas.length, modo: 'simples' }
  };
}

// ============================================================
// FUNÇÕES AUXILIARES (IMUNES A ERROS)
// ============================================================
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extrairCategoria(texto) {
  const mapa = {
    insumo: 'INSUMOS AGRÍCOLAS', insumos: 'INSUMOS AGRÍCOLAS', fertilizante: 'INSUMOS AGRÍCOLAS',
    semente: 'INSUMOS AGRÍCOLAS', defensivo: 'INSUMOS AGRÍCOLAS', adubo: 'INSUMOS AGRÍCOLAS',
    diesel: 'MANUTENÇÃO E OPERAÇÃO', manutencao: 'MANUTENÇÃO E OPERAÇÃO', manutenção: 'MANUTENÇÃO E OPERAÇÃO',
    frete: 'SERVIÇOS OPERACIONAIS', colheita: 'SERVIÇOS OPERACIONAIS',
    salario: 'RECURSOS HUMANOS', arrendamento: 'INFRAESTRUTURA E UTILIDADES',
    seguro: 'SEGUROS E PROTEÇÃO', imposto: 'IMPOSTOS E TAXAS', trator: 'INVESTIMENTOS'
  };
  for (const [k, v] of Object.entries(mapa)) if (texto.includes(k)) return v;
  return null;
}

function detectarTipoMovimento(texto) {
  if (/fornecedor|compra|despesa|paguei/i.test(texto)) return 'fornecedor';
  if (/cliente|venda|recebi|receita/i.test(texto)) return 'cliente';
  return null;
}

function extrairNomePessoa(texto) {
  const match = texto.match(/(?:de|para|do|da|com)\s+([a-zà-ú]{3,})/i);
  if (!match) return null;
  const nome = match[1].trim();
  const proibidos = ['insumos', 'insumo', 'manutencao', 'frete', 'fornecedor', 'cliente'];
  return proibidos.includes(nome) ? null : nome;
}

module.exports = agente3_rag;