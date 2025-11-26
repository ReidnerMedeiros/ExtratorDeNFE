// agente3_rag.js — VERSÃO FINAL OFICIAL COM GEMINI TURBINADO
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function agente3_rag(pergunta) {
  try {
    if (!pergunta?.trim()) return { resposta: 'Faça uma pergunta válida.', dados: [] };

    const texto = removerAcentos(pergunta.toLowerCase().trim());
    console.log('RAG → Pergunta:', texto);

    // === DETECÇÃO INTELIGENTE ===
    const categoria = extrairCategoria(texto);
    const tipoMovimento = detectarTipoMovimento(texto);
    const nomePessoa = extrairNomePessoa(texto);
    const valorMin = extrairNumero(texto, ['acima de', 'maior que', 'mais de']);
    const valorMax = extrairNumero(texto, ['abaixo de', 'menor que', 'até', 'máximo']);
    const dataInicio = extrairData(texto, ['depois de', 'após', 'desde']);
    const dataFim = extrairData(texto, ['antes de', 'até', 'em']);
    const querTotal = /total|quanto|soma|gasto|devo|recebi/i.test(texto);

    // === BUSCA IDs POR CATEGORIA (se houver) ===
    let idsPorCategoria = [];
    if (categoria) {
      const { data: cat } = await supabase
        .from('tb_classificacao')
        .select('idclassificacao')
        .eq('descricao', categoria)
        .single();

      if (cat) {
        const { data } = await supabase
          .from('tb_movimentocontas_classificacao')
          .select('movimentocontas_idmovimentocontas')
          .eq('classificacao_idclassificacao', cat.idclassificacao);
        idsPorCategoria = data?.map(i => i.movimentocontas_idmovimentocontas) || [];
      }
    }

    // === CONSULTA PRINCIPAL ===
    let query = supabase
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
        parcelas:tb_parcelascontas(valorparcela, valorpago, statusparcela)
      `)
      .order('dataemissao', { ascending: false });

    // Aplica filtros
    if (idsPorCategoria.length > 0) query = query.in('idmovimentocontas', idsPorCategoria);
    if (tipoMovimento === 'fornecedor') query = query.not('pessoas_idfornecedorcliente', 'is', null);
    if (tipoMovimento === 'cliente') query = query.not('pessoas_idfaturado', 'is', null);
    if (nomePessoa) {
      query = query.or(`
        fornecedor.razaosocial.ilike.%${nomePessoa}%,
        fornecedor.fantasia.ilike.%${nomePessoa}%,
        faturado.razaosocial.ilike.%${nomePessoa}%
      `);
    }
    if (valorMin) query = query.gte('valortotal', valorMin);
    if (valorMax) query = query.lte('valortotal', valorMax);
    if (dataInicio) query = query.gte('dataemissao', dataInicio);
    if (dataFim) query = query.lte('dataemissao', dataFim);

    const { data: contas, error } = await query.limit(50);
    if (error) throw error;

    // === MONTA CONTEXTO PARA O GEMINI ===
    const totalValor = contas.reduce((s, c) => s + Number(c.valortotal || 0), 0);
    const totalPago = contas.reduce((s, c) => s + (c.parcelas?.reduce((p, par) => p + Number(par.valorpago || 0), 0) || 0), 0);

    const contexto = contas.length > 0
      ? `Encontradas ${contas.length} notas:\n` + contas.slice(0, 8).map(c => {
          const pessoa = c.fornecedor?.razaosocial || c.faturado?.razaosocial || '—';
          const valor = Number(c.valortotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const data = new Date(c.dataemissao).toLocaleDateString('pt-BR');
          return `• NF ${c.numeronotafiscal || '-'} | R$ ${valor} | ${data} | ${pessoa} | ${c.status || '—'}`;
        }).join('\n') + 
        `\n\nTotal: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'Nenhum registro encontrado.';

    // === GEMINI RESPONDE COM INTELIGÊNCIA ===
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
Você é um assistente financeiro rural extremamente inteligente e objetivo.
Responda em português brasileiro, de forma clara, natural e profissional.
Use os dados abaixo para responder à pergunta do usuário.

PERGUNTA DO USUÁRIO:
"${pergunta}"

DADOS ENCONTRADOS:
${contexto}

INSTRUÇÕES:
- Se pedir total, responda o valor exato.
- Se pedir lista, resuma as principais.
- Se for "fornecedor", entenda como despesas.
- Se for "cliente", entenda como receitas.
- Se não houver dados, diga: "Não encontrei registros com esses critérios."
- Nunca invente informações.
- Seja breve e direto.

Resposta:`;

    const result = await model.generateContent(prompt);
    const resposta = result.response?.text?.() || 'Não consegui processar a resposta.';

    return {
      resposta: resposta.trim(),
      dados: contas.slice(0, 20),
      estatisticas: { totalValor, totalPago, totalPendente: totalValor - totalPago, totalNotas: contas.length }
    };

  } catch (e) {
    console.error('Erro RAG:', e.message);
    return { resposta: 'Desculpe, ocorreu um erro ao processar sua consulta. Tente novamente.', dados: [] };
  }
}

// === FUNÇÕES AUXILIARES PERFEITAS ===
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extrairCategoria(texto) {
  const mapa = {
    insumo: 'INSUMOS AGRÍCOLAS', insumos: 'INSUMOS AGRÍCOLAS', fertilizante: 'INSUMOS AGRÍCOLAS',
    semente: 'INSUMOS AGRÍCOLAS', defensivo: 'INSUMOS AGRÍCOLAS', adubo: 'INSUMOS AGRÍCOLAS',
    ureia: 'INSUMOS AGRÍCOLAS', glifosato: 'INSUMOS AGRÍCOLAS',
    manutencao: 'MANUTENÇÃO E OPERAÇÃO', manutenção: 'MANUTENÇÃO E OPERAÇÃO', diesel: 'MANUTENÇÃO E OPERAÇÃO',
    oleo: 'MANUTENÇÃO E OPERAÇÃO', pneu: 'MANUTENÇÃO E OPERAÇÃO', peça: 'MANUTENÇÃO E OPERAÇÃO',
    frete: 'SERVIÇOS OPERACIONAIS', colheita: 'SERVIÇOS OPERACIONAIS', pulverização: 'SERVIÇOS OPERACIONAIS',
    salario: 'RECURSOS HUMANOS', salários: 'RECURSOS HUMANOS', encargos: 'RECURSOS HUMANOS',
    arrendamento: 'INFRAESTRUTURA E UTILIDADES', energia: 'INFRAESTRUTURA E UTILIDADES',
    seguro: 'SEGUROS E PROTEÇÃO', imposto: 'IMPOSTOS E TAXAS', itr: 'IMPOSTOS E TAXAS',
    trator: 'INVESTIMENTOS', maquina: 'INVESTIMENTOS'
  };
  for (const [k, v] of Object.entries(mapa)) if (texto.includes(k)) return v;
  return null;
}

function detectarTipoMovimento(texto) {
  if (/fornecedor|compra|paguei|despesa|compras/i.test(texto)) return 'fornecedor';
  if (/cliente|venda|recebi|receita|faturado/i.test(texto)) return 'cliente';
  return null;
}

function extrairNomePessoa(texto) {
  const match = texto.match(/(?:de|para|do|da|com)\s+([a-zà-ú]{4,})/i);
  if (!match) return null;
  const nome = match[1].trim();
  return ['fornecedor', 'cliente'].includes(nome) ? null : nome;
}

function extrairNumero(texto, palavras) {
  for (const p of palavras) {
    const match = texto.match(new RegExp(p + '\\s*(\\d+)', 'i'));
    if (match) return Number(match[1]);
  }
  return null;
}

function extrairData(texto, palavras) {
  for (const p of palavras) {
    const match = texto.match(new RegExp(p + '\\s*(\\d{2}[/\.-]\\d{2}[/\.-]\\d{4})', 'i'));
    if (match) return match[1].split(/[\/\.-]/).reverse().join('-');
  }
  return null;
}

module.exports = agente3_rag;