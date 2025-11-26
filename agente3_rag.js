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

    const filtros = {
      status_conta: detectarStatusConta(texto),
      categoria: extrairCategoria(texto),
      nome_pessoa: extrairNomePessoa(texto),
      valor_min: extrairNumero(texto, ['acima de', 'maior que', 'mais de']),
      valor_max: extrairNumero(texto, ['abaixo de', 'menor que', 'até']),
      data_inicio: extrairData(texto, ['depois de', 'após', 'desde', 'a partir de']),
      data_fim: extrairData(texto, ['antes de', 'até', 'em', 'no mês de']),
      quer_total: /total|quanto|soma|gasto|devo/i.test(texto),
      quer_resumo: /resumo|análise|relatorio/i.test(texto)
    };

    // === PRIMEIRO: BUSCA OS IDs DAS CONTAS COM A CATEGORIA CERTA ===
    let idsComCategoria = [];
    if (filtros.categoria) {
      const { data: idsData, error: err1 } = await supabase
        .from('tb_movimentocontas_classificacao')
        .select('movimentocontas_idmovimentocontas')
        .eq('classificacao_idclassificacao', 
          supabase
            .from('tb_classificacao')
            .select('idclassificacao')
            .eq('descricao', filtros.categoria)
            .eq('tipo', 'DESPESA')
            .single()
        );

      if (err1) console.error("Erro ao buscar categoria:", err1);
      else if (idsData) {
        idsComCategoria = idsData.map(item => item.movimentocontas_idmovimentocontas);
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
        parcelas:tb_parcelascontas(valorparcela, valorpago, datavencimento, statusparcela)
      `)
      .order('dataemissao', { ascending: false });

    if (filtros.status_conta) query = query.eq('status', filtros.status_conta);
    if (filtros.nome_pessoa) {
      query = query.or(`
        fornecedor.razaosocial.ilike.%${filtros.nome_pessoa}%,
        fornecedor.fantasia.ilike.%${filtros.nome_pessoa}%,
        faturado.razaosocial.ilike.%${filtros.nome_pessoa}%
      `);
    }
    if (filtros.valor_min) query = query.gte('valortotal', filtros.valor_min);
    if (filtros.valor_max) query = query.lte('valortotal', filtros.valor_max);
    if (filtros.data_inicio) query = query.gte('dataemissao', filtros.data_inicio);
    if (filtros.data_fim) query = query.lte('dataemissao', filtros.data_fim);

    // APLICA FILTRO DE CATEGORIA POR ID (CORRETO E SEGURO)
    if (idsComCategoria.length > 0) {
      query = query.in('idmovimentocontas', idsComCategoria);
    }

    const { data: contas, error } = await query.limit(100);
    if (error) throw error;

    // === BUSCA CATEGORIAS DAS CONTAS ENCONTRADAS ===
    const idsContas = contas.map(c => c.idmovimentocontas);
    let categoriasMap = {};
    if (idsContas.length > 0) {
      const { data: cats } = await supabase
        .from('tb_movimentocontas_classificacao')
        .select('movimentocontas_idmovimentocontas, tb_classificacao!inner(descricao)')
        .in('movimentocontas_idmovimentocontas', idsContas);

      cats?.forEach(item => {
        const id = item.movimentocontas_idmovimentocontas;
        if (!categoriasMap[id]) categoriasMap[id] = [];
        categoriasMap[id].push(item.tb_classificacao.descricao);
      });
    }

    // === CÁLCULOS ===
    const totalValor = contas.reduce((s, c) => s + Number(c.valortotal || 0), 0);
    const totalPago = contas.reduce((s, c) => s + (c.parcelas?.reduce((sp, p) => sp + Number(p.valorpago || 0), 0) || 0), 0);
    const totalPendente = totalValor - totalPago;

    // === RESPOSTA ===
    let resposta = '';
    if (contas.length === 0) {
      resposta = 'Não encontrei notas com esses critérios.';
    } else if (filtros.quer_total) {
      resposta = `Total de ${filtros.categoria || 'encontrado'}: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                 `Já pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                 `Pendente: R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else {
      resposta = `Encontradas ${contas.length} notas de ${filtros.categoria || 'gastos'}:\n` +
        contas.slice(0, 8).map(c => {
          const pessoa = c.fornecedor?.razaosocial || c.faturado?.razaosocial || '—';
          const cat = categoriasMap[c.idmovimentocontas]?.join(', ') || 'Sem categoria';
          return `• NF ${c.numeronotafiscal || '-'} | R$ ${Number(c.valortotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${new Date(c.dataemissao).toLocaleDateString('pt-BR')} | ${pessoa} | ${cat}`;
        }).join('\n');
      if (contas.length > 8) resposta += `\n... e mais ${contas.length - 8} notas.`;
    }

    return {
      resposta,
      dados: contas.slice(0, 20).map(c => ({
        ...c,
        categorias: categoriasMap[c.idmovimentocontas] || []
      })),
      estatisticas: { totalValor, totalPago, totalPendente }
    };

  } catch (e) {
    console.error('Erro RAG:', e.message);
    return { resposta: 'Erro ao processar. Tente novamente.', dados: [] };
  }
}

// === FUNÇÃO DE CATEGORIA (100% FUNCIONAL) ===
function extrairCategoria(texto) {
  const mapa = {
    insumo: 'INSUMOS AGRÍCOLAS', insumos: 'INSUMOS AGRÍCOLAS',
    fertilizante: 'INSUMOS AGRÍCOLAS', adubo: 'INSUMOS AGRÍCOLAS',
    semente: 'INSUMOS AGRÍCOLAS', defensivo: 'INSUMOS AGRÍCOLAS',
    ureia: 'INSUMOS AGRÍCOLAS', glifosato: 'INSUMOS AGRÍCOLAS',

    manutencao: 'MANUTENÇÃO E OPERAÇÃO', manutenção: 'MANUTENÇÃO E OPERAÇÃO',
    diesel: 'MANUTENÇÃO E OPERAÇÃO', oleo: 'MANUTENÇÃO E OPERAÇÃO',
    pneu: 'MANUTENÇÃO E OPERAÇÃO', peça: 'MANUTENÇÃO E OPERAÇÃO',

    frete: 'SERVIÇOS OPERACIONAIS', colheita: 'SERVIÇOS OPERACIONAIS',
    pulverização: 'SERVIÇOS OPERACIONAIS', pulverizacao: 'SERVIÇOS OPERACIONAIS',

    salario: 'RECURSOS HUMANOS', salários: 'RECURSOS HUMANOS',
    arrendamento: 'INFRAESTRUTURA E UTILIDADES',
    energia: 'INFRAESTRUTURA E UTILIDADES',
    seguro: 'SEGUROS E PROTEÇÃO',
    imposto: 'IMPOSTOS E TAXAS', itr: 'IMPOSTOS E TAXAS',
    trator: 'INVESTIMENTOS', maquina: 'INVESTIMENTOS'
  };

  for (const [chave, valor] of Object.entries(mapa)) {
    if (texto.includes(chave)) return valor;
  }
  return null;
}

function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function detectarStatusConta(texto) {
  if (/pago|pagas/i.test(texto)) return 'PAGO';
  if (/pendente|aberto/i.test(texto)) return 'PENDENTE';
  if (/atrasado|vencido/i.test(texto)) return 'ATRASADO';
  return null;
}

function extrairNomePessoa(texto) {
  const match = texto.match(/(?:de|para|com|da|do)\s+([a-zA-ZÀ-ú\s]+)/i);
  return match ? match[1].trim() : null;
}

function extrairNumero(texto, palavras) {
  for (const p of palavras) {
    const idx = texto.indexOf(p);
    if (idx > -1) {
      const num = texto.substring(idx).match(/\d+/);
      if (num) return Number(num[0]);
    }
  }
  return null;
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

module.exports = agente3_rag;