const { createClient } = require('@supabase/supabase-js');

module.exports = async function agente2(dados) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  let resultado = { mensagens: [], sucesso: false };

  try {
    // Validação inicial dos dados
    if (!dados.fornecedor?.cnpj || !dados.faturado?.nomeCompleto || !dados.classificacaoDespesa) {
      throw new Error('Dados de entrada incompletos');
    }

    // 1. Consultar Fornecedor
    console.log('Consultando fornecedor com documento:', dados.fornecedor.cnpj);
    let { data: fornecedor, error: errFornecedor } = await supabase
      .from('tb_pessoas')
      .select('idpessoas')
      .eq('tipo', 'CLIENTE-FORNECEDOR')
      .eq('documento', dados.fornecedor.cnpj)
      .maybeSingle();

    if (errFornecedor) {
      console.error('Erro ao consultar fornecedor:', errFornecedor);
      throw new Error(`Erro ao consultar fornecedor: ${errFornecedor.message}`);
    }

    let fornecedorId = fornecedor ? fornecedor.idpessoas : null;
    resultado.mensagens.push({
      tipo: 'FORNECEDOR',
      mensagem: fornecedor ? `EXISTE - ID: ${fornecedor.idpessoas}` : 'NÃO EXISTE',
    });

    // Criar Fornecedor se não existir
    if (!fornecedorId) {
      console.log('Criando novo fornecedor:', dados.fornecedor.razaoSocial);
      const { data: novoFornecedor, error: errNovoFornecedor } = await supabase
        .from('tb_pessoas')
        .insert([
          {
            tipo: 'CLIENTE-FORNECEDOR',
            razaosocial: dados.fornecedor.razaoSocial,
            fantasia: dados.fornecedor.fantasia || null,
            documento: dados.fornecedor.cnpj,
            status: 'ATIVO',
          },
        ])
        .select('idpessoas')
        .single();

      if (errNovoFornecedor) {
        console.error('Erro ao criar fornecedor:', errNovoFornecedor);
        throw new Error(`Erro ao criar fornecedor: ${errNovoFornecedor.message}`);
      }
      fornecedorId = novoFornecedor.idpessoas;
    }

    // 2. Consultar Faturado
    console.log('Consultando faturado com documento:', dados.faturado.cpf || dados.faturado.cnpj);
    let { data: faturado, error: errFaturado } = await supabase
      .from('tb_pessoas')
      .select('idpessoas')
      .eq('tipo', 'FATURADO')
      .eq('documento', dados.faturado.cpf || dados.faturado.cnpj || null)
      .maybeSingle();

    if (errFaturado) {
      console.error('Erro ao consultar faturado:', errFaturado);
      throw new Error(`Erro ao consultar faturado: ${errFaturado.message}`);
    }

    let faturadoId = faturado ? faturado.idpessoas : null;
    resultado.mensagens.push({
      tipo: 'FATURADO',
      mensagem: faturado ? `EXISTE - ID: ${faturado.idpessoas}` : 'NÃO EXISTE',
    });

    // Criar Faturado se não existir
    if (!faturadoId) {
      console.log('Criando novo faturado:', dados.faturado.nomeCompleto);
      const { data: novoFaturado, error: errNovoFaturado } = await supabase
        .from('tb_pessoas')
        .insert([
          {
            tipo: 'FATURADO',
            razaosocial: dados.faturado.nomeCompleto,
            documento: dados.faturado.cpf || dados.faturado.cnpj || null,
            status: 'ATIVO',
          },
        ])
        .select('idpessoas')
        .single();

      if (errNovoFaturado) {
        console.error('Erro ao criar faturado:', errNovoFaturado);
        throw new Error(`Erro ao criar faturado: ${errNovoFaturado.message}`);
      }
      faturadoId = novoFaturado.idpessoas;
    }

    // 3. Consultar Despesa (Classificação)
    console.log('Consultando despesa com descrição:', dados.classificacaoDespesa);
    let { data: despesa, error: errDespesa } = await supabase
      .from('tb_classificacao')
      .select('idclassificacao')
      .eq('tipo', 'DESPESA')
      .eq('descricao', dados.classificacaoDespesa)
      .maybeSingle();

    if (errDespesa) {
      console.error('Erro ao consultar despesa:', errDespesa);
      throw new Error(`Erro ao consultar despesa: ${errDespesa.message}`);
    }

    let despesaId = despesa ? despesa.idclassificacao : null;
    resultado.mensagens.push({
      tipo: 'DESPESA',
      mensagem: despesa ? `EXISTE - ID: ${despesa.idclassificacao}` : 'NÃO EXISTE',
    });

    // Criar Despesa se não existir
    if (!despesaId) {
      console.log('Criando nova despesa:', dados.classificacaoDespesa);
      const { data: novaDespesa, error: errNovaDespesa } = await supabase
        .from('tb_classificacao')
        .insert([
          {
            tipo: 'DESPESA',
            descricao: dados.classificacaoDespesa,
            status: 'ATIVO',
          },
        ])
        .select('idclassificacao')
        .single();

      if (errNovaDespesa) {
        console.error('Erro ao criar despesa:', errNovaDespesa);
        throw new Error(`Erro ao criar despesa: ${errNovaDespesa.message}`);
      }
      despesaId = novaDespesa.idclassificacao;
    }

    // 4. Verificar se o movimento já existe para a nota fiscal
    console.log('Verificando movimento existente para nota fiscal:', dados.numeroNotaFiscal);
    let { data: movimentoExistente, error: errMovimentoExistente } = await supabase
      .from('tb_movimentocontas')
      .select('idmovimentocontas')
      .eq('numeronotafiscal', dados.numeroNotaFiscal)
      .eq('pessoas_idfornecedorcliente', fornecedorId)
      .maybeSingle();

    if (errMovimentoExistente) {
      console.error('Erro ao verificar movimento existente:', errMovimentoExistente);
      throw new Error(`Erro ao verificar movimento existente: ${errMovimentoExistente.message}`);
    }

    let movimentoId;
    if (movimentoExistente) {
      console.log('Movimento já existe com ID:', movimentoExistente.idmovimentocontas);
      movimentoId = movimentoExistente.idmovimentocontas;
      resultado.mensagens.push({
        tipo: 'MOVIMENTO',
        mensagem: `EXISTE - ID: ${movimentoId}`,
      });
    } else {
      // Criar Registro de Movimento (tb_movimentocontas)
      console.log('Criando movimento com fornecedorId:', fornecedorId, 'faturadoId:', faturadoId);
      const { data: novoMovimento, error: errMovimento } = await supabase
        .from('tb_movimentocontas')
        .insert([
          {
            numeronotafiscal: dados.numeroNotaFiscal,
            dataemissao: dados.dataEmissao,
            descricao: dados.produtos.map((p) => p.descricao).join(', ') || 'Sem descrição',
            status: 'PENDENTE',
            valortotal: dados.valorTotal,
            pessoas_idfornecedorcliente: fornecedorId,
            pessoas_idfaturado: faturadoId,
          },
        ])
        .select('idmovimentocontas')
        .single();

      if (errMovimento) {
        console.error('Erro ao criar movimento:', errMovimento);
        throw new Error(`Erro ao criar movimento: ${errMovimento.message}`);
      }
      movimentoId = novoMovimento.idmovimentocontas;
      resultado.mensagens.push({
        tipo: 'MOVIMENTO',
        mensagem: `CRIADO - ID: ${movimentoId}`,
      });
    }

    // 5. Verificar parcelas existentes
    console.log('Verificando parcelas existentes para movimentoId:', movimentoId);
    const { data: parcelasExistentes, error: errParcelasExistentes } = await supabase
      .from('tb_parcelascontas')
      .select('valorparcela')
      .eq('movimentocontas_idmovimentocontas', movimentoId);

    if (errParcelasExistentes) {
      console.error('Erro ao verificar parcelas existentes:', errParcelasExistentes);
      throw new Error(`Erro ao verificar parcelas existentes: ${errParcelasExistentes.message}`);
    }

    // Calcular o total das parcelas existentes
    const totalParcelasExistentes = parcelasExistentes.reduce((sum, parcela) => sum + parseFloat(parcela.valorparcela || 0), 0);
    console.log('Total das parcelas existentes:', totalParcelasExistentes);

    // Validar se novas parcelas podem ser criadas
    if (parcelasExistentes.length > 0 && !dados.adicionarParcelasConfirmado) {
      throw new Error('Parcelas já existem para esta nota fiscal. Confirme para adicionar mais parcelas.');
    }

    // Validar o valor total das novas parcelas
    if (!dados.parcelas || !Array.isArray(dados.parcelas) || dados.parcelas.length === 0) {
      throw new Error('Nenhuma parcela fornecida nos dados');
    }

    const totalNovasParcelas = dados.parcelas.reduce((sum, parcela) => sum + parseFloat(parcela.valor || 0), 0);
    if (totalParcelasExistentes + totalNovasParcelas > dados.valorTotal) {
      throw new Error(
        `O total das parcelas (existentes: ${totalParcelasExistentes}, novas: ${totalNovasParcelas}) ultrapassa o valor total da nota (${dados.valorTotal})`
      );
    }

    // 6. Criar Parcelas (tb_parcelascontas)
    for (let parcela of dados.parcelas) {
      if (!parcela.numero || !parcela.dataVencimento || !parcela.valor) {
        throw new Error(`Parcela inválida: ${JSON.stringify(parcela)}`);
      }
      const identificacao = `PAR-${movimentoId}-${parcela.numero}`;
      console.log('Criando parcela:', identificacao);
      const { error: errParcela } = await supabase
        .from('tb_parcelascontas')
        .insert([
          {
            identificacao: identificacao,
            datavencimento: parcela.dataVencimento,
            valorparcela: parcela.valor,
            valorpago: 0,
            valorsaldo: parcela.valor,
            statusparcela: 'PENDENTE',
            movimentocontas_idmovimentocontas: movimentoId,
          },
        ]);

      if (errParcela) {
        console.error('Erro ao criar parcela:', errParcela);
        throw new Error(`Erro ao criar parcela: ${errParcela.message}`);
      }
    }

    // 7. Associar Classificação ao Movimento (tb_movimentocontas_classificacao)
    console.log('Associando classificação ao movimento:', movimentoId, despesaId);
    const { data: associacaoExistente, error: errAssociacaoExistente } = await supabase
      .from('tb_movimentocontas_classificacao')
      .select('movimentocontas_idmovimentocontas')
      .eq('movimentocontas_idmovimentocontas', movimentoId)
      .eq('classificacao_idclassificacao', despesaId)
      .maybeSingle();

    if (errAssociacaoExistente) {
      console.error('Erro ao verificar associação existente:', errAssociacaoExistente);
      throw new Error(`Erro ao verificar associação existente: ${errAssociacaoExistente.message}`);
    }

    if (!associacaoExistente) {
      const { error: errAssociacao } = await supabase
        .from('tb_movimentocontas_classificacao')
        .insert([
          {
            movimentocontas_idmovimentocontas: movimentoId,
            classificacao_idclassificacao: despesaId,
          },
        ]);

      if (errAssociacao) {
        console.error('Erro ao associar classificação:', errAssociacao);
        throw new Error(`Erro ao associar classificação: ${errAssociacao.message}`);
      }
    }

    resultado.sucesso = true;

  } catch (error) {
    resultado.mensagens.push({ tipo: 'ERRO', mensagem: error.message });
  }

  return resultado;
};