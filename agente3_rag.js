// agente3_rag.js — VERSÃO FINAL: CONSULTA TUDO DO BANCO COM INTELIGÊNCIA
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function agente3_rag(pergunta) {
  try {
    if (!pergunta?.trim()) return { resposta: 'Digite uma pergunta válida.', dados: [] };

    const texto = removerAcentos(pergunta.toLowerCase().trim());
    console.log('RAG → Pergunta:', texto);

    // === DETECÇÃO INTELIGENTE DE FILTROS ===
    const filtros = {
      status_conta: detectarStatusConta(texto),
      status_parcela: detectarStatusParcela(texto),
      categoria: extrairCategoria(texto),
      tipo_pessoa: detectarTipoPessoa(texto),
      nome_pessoa: extrairNomePessoa(texto),
      valor_min: extrairNumero(texto, ['acima de', 'maior que', 'mais de', 'acima']),
      valor_max: extrairNumero(texto, ['abaixo de', 'menor que', 'até', 'maximo']),
      data_inicio: extrairData(texto, ['depois de', 'após', 'desde', 'a partir de']),
      data_fim: extrairData(texto, ['antes de', 'até', 'em', 'no mês de']),
      mes_vencimento: extrairMes(texto),
      quer_total: /total|quanto|soma|somatorio|gasto|devo|recebi/i.test(texto),
      quer_resumo: /resumo|análise|visão geral|panorama|relatorio/i.test(texto),
      quer_maior_menor: /maior|menor|top|principal|pior/i.test(texto)
    };

    // === CONSULTA PRINCIPAL COM TODOS OS JOINS ===
    let query = supabase
      .from('tb_movimentocontas')
      .select(`
        idmovimentocontas,
        numeronotafiscal,
        dataemissao,
        valortotal,
        descricao,
        status,
        pessoas_idfornecedorcliente,
        pessoas_idfaturado,
        fornecedor:tb_pessoas!pessoas_idfornecedorcliente(razaosocial, fantasia, documento, tipo),
        faturado:tb_pessoas!pessoas_idfaturado(razaosocial, fantasia, tipo),
        classificacoes:tb_movimentocontas_classificacao(tb_classificacao(descricao, tipo)),
        parcelas:tb_parcelascontas(datavencimento, valorparcela, valorpago, valorsaldo, statusparcela)
      `)
      .order('dataemissao', { ascending: false });

    // === APLICA TODOS OS FILTROS POSSÍVEIS ===
    if (filtros.status_conta) query = query.eq('status', filtros.status_conta);
    if (filtros.categoria) query = query.contains('classificacoes.tb_classificacao.descricao', [filtros.categoria]);
    if (filtros.nome_pessoa) {
      query = query.or(`
        fornecedor.razaosocial.ilike.%${filtros.nome_pessoa}%,
        fornecedor.fantasia.ilike.%${filtros.nome_pessoa}%,
        faturado.razaosocial.ilike.%${filtros.nome_pessoa}%
      `);
    }
    if (filtros.tipo_pessoa) {
      const campo = filtros.tipo_pessoa === 'cliente' ? 'faturado' : 'fornecedor';
      query = query.eq(`${campo}.tipo`, filtros.tipo_pessoa.toUpperCase());
    }
    if (filtros.valor_min) query = query.gte('valortotal', filtros.valor_min);
    if (filtros.valor_max) query = query.lte('valortotal', filtros.valor_max);
    if (filtros.data_inicio) query = query.gte('dataemissao', filtros.data_inicio);
    if (filtros.data_fim) query = query.lte('dataemissao', filtros.data_fim);

    const { data: contas, error } = await query.limit(100);
    if (error) throw error;

    // === CÁLCULOS INTELIGENTES ===
    const totalValor = contas.reduce((s, c) => s + Number(c.valortotal), 0);
    const totalPago = contas.reduce((s, c) => s + (c.parcelas?.reduce((sp, p) => sp + Number(p.valorpago), 0) || 0), 0);
    const totalPendente = totalValor - totalPago;

    const parcelasVencerEsseMes = contas.flatMap(c => c.parcelas || [])
      .filter(p => {
        if (!p.datavencimento) return false;
        const venc = new Date(p.datavencimento);
        const hoje = new Date();
        return venc.getMonth() === hoje.getMonth() && venc.getFullYear() === hoje.getFullYear() && p.statusparcela !== 'PAGO';
      });

    // === RESPOSTA FINAL INTELIGENTE ===
    let resposta = '';

    if (contas.length === 0) {
      resposta = 'Não encontrei nenhum registro com esses critérios.';
    }
    else if (filtros.quer_total) {
      resposta = `Total encontrado: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                 `Já pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                 `Ainda a pagar: R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    else if (filtros.quer_resumo || filtros.quer_maior_menor) {
      const maiorNota = contas.reduce((a, b) => a.valortotal > b.valortotal ? a : b, contas[0]);
      const pessoaMais = contarPorPessoa(contas);
      resposta = `Resumo:\n` +
                 `• ${contas.length} notas encontradas\n` +
                 `• Total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                 `• Maior nota: R$ ${Number(maiorNota.valortotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Nº ${maiorNota.numeronotafiscal})\n` +
                 `• Principal ${pessoaMais.tipo}: ${pessoaMais.nome} (R$ ${pessoaMais.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n` +
                 (parcelasVencerEsseMes.length > 0 ? `• ${parcelasVencerEsseMes.length} parcelas vencem este mês` : '');
    }
    else {
      resposta = `Encontradas ${contas.length} notas:\n` +
        contas.slice(0, 7).map(c => {
          const pessoa = c.fornecedor?.razaosocial || c.faturado?.razaosocial || '—';
          const cat = c.classificacoes?.[0]?.tb_classificacao?.descricao || 'Sem categoria';
          return `• ${c.numeronotafiscal} | R$ ${Number(c.valortotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${new Date(c.dataemissao).toLocaleDateString('pt-BR')} | ${pessoa} | ${cat} | ${c.status}`;
        }).join('\n');
      if (contas.length > 7) resposta += `\n... e mais ${contas.length - 7} registros.`;
    }

    // Gemini só para perguntas complexas
    if (filtros.quer_resumo) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`Baseado nestes dados financeiros rurais, dê um resumo executivo em 3 frases curtas:\n${resposta}`);
      resposta = await result.response.text();
    }

    return {
      resposta,
      dados: contas.slice(0, 20),
      estatisticas: { totalValor, totalPago, totalPendente, parcelasEsseMes: parcelasVencerEsseMes.length }
    };

  } catch (e) {
    console.error('Erro RAG:', e.message);
    return { resposta: 'Erro ao processar sua consulta. Tente de novo.', dados: [] };
  }
}

// === FUNÇÕES AUXILIARES TURBINADAS ===
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extrairCategoria(texto) {
  const mapa = {
    insumo: 'INSUMOS AGRÍCOLAS', fertilizante: 'INSUMOS AGRÍCOLAS', semente: 'INSUMOS AGRÍCOLAS', defensivo: 'INSUMOS AGRÍCOLAS',
    manutencao: 'MANUTENÇÃO E OPERAÇÃO', combustivel: 'MANUTENÇÃO E OPERAÇÃO', peça: 'MANUTENÇÃO E OPERAÇÃO',
    frete: 'SERVIÇOS OPERACIONAIS', colheita: 'SERVIÇOS OPERACIONAIS',
    arrendamento: 'INFRAESTRUTURA E UTILIDADES', energia: 'INFRAESTRUTURA E UTILIDADES',
    seguro: 'SEGUROS E PROTEÇÃO', imposto: 'IMPOSTOS E TAXAS', itr: 'IMPOSTOS E TAXAS',
    maquina: 'INVESTIMENTOS', trator: 'INVESTIMENTOS', caminhao: 'INVESTIMENTOS'
  };
  for (const [k, v] of Object.entries(mapa)) if (texto.includes(k)) return v;
  return null;
}

function detectarStatusConta(texto) {
  if (/pago|pagas|liquidado/i.test(texto)) return 'PAGO';
  if (/pendente|aberto|devendo/i.test(texto)) return 'PENDENTE';
  if (/atrasado|atrasada|vencido/i.test(texto)) return 'ATRASADO';
  return null;
}

function detectarStatusParcela(texto) {
  if (/parcela.*paga/i.test(texto)) return 'PAGO';
  if (/parcela.*aberta|vencer/i.test(texto)) return 'PENDENTE';
  return null;
}

function detectarTipoPessoa(texto) {
  if (/cliente|vend[ai]|recebi|faturado para/i.test(texto)) return 'cliente';
  if (/fornecedor|compra|paguei/i.test(texto)) return 'fornecedor';
  return null;
}

function extrairNomePessoa(texto) {
  const palavras = texto.split(' ');
  for (let i = 0; i < palavras.length - 1; i++) {
    if (/(para|de|com|do|da|cliente|fornecedor|empresa)/i.test(palavras[i])) {
      return palavras.slice(i + 1).join(' ').replace(/[^a-zA-Zà-ú\s]/g, '').trim();
    }
  }
  return null;
}

function extrairNumero(texto, palavras) {
  for (const p of palavras) {
    const idx = texto.indexOf(p);
    if (idx > -1) {
      const resto = texto.substring(idx + p.length);
      const match = resto.match(/\d+/);
      if (match) return Number(match[0]);
    }
  }
  const matchGlobal = texto.match(/(\d{4,})|(\d+[\.,]\d+)/);
  return matchGlobal ? Number(matchGlobal[0].replace(',', '.')) : null;
}

function extrairData(texto, palavras) {
  for (const p of palavras) {
    const idx = texto.indexOf(p);
    if (idx > -1) {
      const match = texto.substring(idx).match(/\d{2}\/\d{2}\/\d{4}/);
      if (match) return match[0].split('/').reverse().join('-');
    }
  }
  return null;
}

function extrairMes(texto) {
  const meses = { janeiro: '01', fevereiro: '02', março: '03', abril: '04', maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12' };
  for (const [nome, num] of Object.entries(meses)) {
    if (texto.includes(nome)) return num;
  }
  return null;
}

function contarPorPessoa(contas) {
  const mapa = {};
  contas.forEach(c => {
    const nome = c.fornecedor?.razaosocial || c.faturado?.razaosocial || 'Desconhecido';
    const tipo = c.fornecedor ? 'fornecedor' : 'cliente';
    mapa[nome] = (mapa[nome] || { valor: 0, tipo });
    mapa[nome].valor += Number(c.valortotal);
  });
  return Object.entries(mapa).sort((a, b) => b[1].valor - a[1].valor)[0][1];
}

module.exports = agente3_rag;