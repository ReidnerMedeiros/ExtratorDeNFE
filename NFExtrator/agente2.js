const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async function agente2(dados) {
  try {
    console.log('Dados recebidos no agente2:', JSON.stringify(dados, null, 2));

    const resultado = {
      mensagens: [],
      sucesso: true,
      fornecedor: {},
      faturado: {},
      despesa: {},
      movimento: {}
    };

    // Validar dados recebidos
    if (!dados.fornecedor?.cnpj) {
      throw new Error('CNPJ do fornecedor não fornecido');
    }
    if (!dados.faturado?.cpf && !dados.faturado?.cnpj) {
      throw new Error('CPF ou CNPJ do faturado não fornecido');
    }
    if (!dados.classificacaoDespesa) {
      throw new Error('Classificação de despesa não fornecida');
    }
    if (!dados.numeroNotaFiscal) {
      throw new Error('Número da nota fiscal não fornecido');
    }

    // Consultar/Inserir Fornecedor
    let { data: fornecedorData, error: fornecedorError } = await supabase
      .from('tb_pessoas')
      .select('idpessoas, razaosocial, documento')
      .eq('documento', dados.fornecedor.cnpj)
      .eq('tipo', 'FORNECEDOR')
      .single();

    if (fornecedorError && fornecedorError.code !== 'PGRST116') {
      console.error('Erro ao consultar fornecedor:', fornecedorError);
      throw fornecedorError;
    }

    if (!fornecedorData) {
      const { data: newFornecedor, error: insertError } = await supabase
        .from('tb_pessoas')
        .insert([
          {
            tipo: 'FORNECEDOR',
            razaosocial: dados.fornecedor.razaoSocial || 'Desconhecido',
            fantasia: dados.fornecedor.fantasia,
            documento: dados.fornecedor.cnpj,
            status: 'ATIVO'
          }
        ])
        .select()
        .single();
      if (insertError) {
        console.error('Erro ao inserir fornecedor:', insertError);
        throw insertError;
      }
      fornecedorData = newFornecedor;
      resultado.mensagens.push({ 
        tipo: 'SUCESSO', 
        mensagem: `Fornecedor criado - ID: ${fornecedorData.idpessoas}` 
      });
    } else {
      resultado.mensagens.push({ 
        tipo: 'SUCESSO', 
        mensagem: `Fornecedor existe - ID: ${fornecedorData.idpessoas}` 
      });
    }

    resultado.fornecedor = {
      nome: fornecedorData.razaosocial,
      cnpj: fornecedorData.documento,
      existe: !!fornecedorData.idpessoas,
      id: parseInt(fornecedorData.idpessoas)
    };

    // Consultar/Inserir Faturado
    let { data: faturadoData, error: faturadoError } = await supabase
      .from('tb_pessoas')
      .select('idpessoas, razaosocial, documento')
      .eq('documento', dados.faturado.cpf || dados.faturado.cnpj)
      .eq('tipo', 'FATURADO')
      .single();

    if (faturadoError && faturadoError.code !== 'PGRST116') {
      console.error('Erro ao consultar faturado:', faturadoError);
      throw faturadoError;
    }

    if (!faturadoData) {
      const { data: newFaturado, error: insertError } = await supabase
        .from('tb_pessoas')
        .insert([
          {
            tipo: 'FATURADO',
            razaosocial: dados.faturado.nomeCompleto || 'Desconhecido',
            documento: dados.faturado.cpf || dados.faturado.cnpj,
            status: 'ATIVO'
          }
        ])
        .select()
        .single();
      if (insertError) {
        console.error('Erro ao inserir faturado:', insertError);
        throw insertError;
      }
      faturadoData = newFaturado;
      resultado.mensagens.push({ 
        tipo: 'SUCESSO', 
        mensagem: `Faturado criado - ID: ${faturadoData.idpessoas}` 
      });
    } else {
      resultado.mensagens.push({ 
        tipo: 'SUCESSO', 
        mensagem: `Faturado existe - ID: ${faturadoData.idpessoas}` 
      });
    }

    resultado.faturado = {
      nome: faturadoData.razaosocial,
      cpf: dados.faturado.cpf,
      cnpj: dados.faturado.cnpj,
      existe: !!faturadoData.idpessoas,
      id: parseInt(faturadoData.idpessoas)
    };

    // Consultar/Inserir Classificação (Despesa)
    let { data: classificacaoData, error: classificacaoError } = await supabase
      .from('tb_classificacao')
      .select('idclassificacao, descricao')
      .eq('descricao', dados.classificacaoDespesa)
      .eq('tipo', 'DESPESA')
      .single();

    if (classificacaoError && classificacaoError.code !== 'PGRST116') {
      console.error('Erro ao consultar classificação:', classificacaoError);
      throw classificacaoError;
    }

    if (!classificacaoData) {
      const { data: newClassificacao, error: insertError } = await supabase
        .from('tb_classificacao')
        .insert([
          {
            tipo: 'DESPESA',
            descricao: dados.classificacaoDespesa,
            status: 'ATIVO'
          }
        ])
        .select()
        .single();
      if (insertError) {
        console.error('Erro ao inserir classificação:', insertError);
        throw insertError;
      }
      classificacaoData = newClassificacao;
      resultado.mensagens.push({ 
        tipo: 'SUCESSO', 
        mensagem: `Classificação criada - ID: ${classificacaoData.idclassificacao}` 
      });
    } else {
      resultado.mensagens.push({ 
        tipo: 'SUCESSO', 
        mensagem: `Classificação existe - ID: ${classificacaoData.idclassificacao}` 
      });
    }

    resultado.despesa = {
      nome: classificacaoData.descricao,
      existe: !!classificacaoData.idclassificacao,
      id: parseInt(classificacaoData.idclassificacao)
    };

    // Consultar Movimento para obter idmovimentocontas
    let { data: movimentoExistente, error: movimentoConsultaError } = await supabase
      .from('tb_movimentocontas')
      .select('idmovimentocontas')
      .eq('numeronotafiscal', dados.numeroNotaFiscal)
      .single();

    if (movimentoConsultaError && movimentoConsultaError.code !== 'PGRST116') {
      console.error('Erro ao consultar movimento:', movimentoConsultaError);
      throw movimentoConsultaError;
    }

    // Verificar Parcelas Existentes
    let parcelasExistentes = [];
    if (movimentoExistente) {
      const { data, error: parcelasError } = await supabase
        .from('tb_parcelascontas')
        .select('idparcelascontas')
        .eq('movimentocontas_idmovimentocontas', movimentoExistente.idmovimentocontas)
        .in('statusparcela', ['PENDENTE', 'PAGO', 'ATRASADO']);

      if (parcelasError) {
        console.error('Erro ao consultar parcelas:', parcelasError);
        throw parcelasError;
      }
      parcelasExistentes = data;
    }

    if (parcelasExistentes.length > 0) {
      resultado.sucesso = false;
      resultado.mensagens.push({
        tipo: 'ERRO',
        mensagem: 'Parcelas já existem para esta nota fiscal.'
      });
      resultado.movimento = {
        existe: !!movimentoExistente.idmovimentocontas,
        id: parseInt(movimentoExistente.idmovimentocontas)
      };
      resultado.mensagens.push({
        tipo: 'SUCESSO',
        mensagem: `Movimento existe - ID: ${movimentoExistente.idmovimentocontas}`
      });
      console.log('Resultado retornado (parcelas existentes):', JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Inserir Movimento (se não existe)
    let movimentoData = movimentoExistente;
    if (!movimentoExistente) {
      const { data, error: movimentoError } = await supabase
        .from('tb_movimentocontas')
        .insert([
          {
            numeronotafiscal: dados.numeroNotaFiscal,
            dataemissao: dados.dataEmissao,
            descricao: dados.produtos ? dados.produtos.map(p => p.descricao).join(', ') : 'Sem descrição',
            status: 'PENDENTE',
            valortotal: parseFloat(dados.valorTotal) || 0,
            pessoas_idfornecedorcliente: parseInt(fornecedorData.idpessoas),
            pessoas_idfaturado: parseInt(faturadoData.idpessoas)
          }
        ])
        .select()
        .single();

      if (movimentoError) {
        console.error('Erro ao inserir movimento:', movimentoError);
        throw movimentoError;
      }
      movimentoData = data;
      resultado.mensagens.push({
        tipo: 'SUCESSO',
        mensagem: `Movimento criado - ID: ${movimentoData.idmovimentocontas}`
      });
    } else {
      resultado.mensagens.push({
        tipo: 'SUCESSO',
        mensagem: `Movimento existe - ID: ${movimentoData.idmovimentocontas}`
      });
    }

    resultado.movimento = {
      existe: !!movimentoData.idmovimentocontas,
      id: parseInt(movimentoData.idmovimentocontas)
    };

    // Inserir Parcelas
    const parcelasToInsert = dados.parcelas.map((parcela, index) => ({
      identificacao: `${dados.numeroNotaFiscal}-${index + 1}`,
      datavencimento: parcela.dataVencimento,
      valorparcela: parseFloat(parcela.valor) || 0,
      valorsaldo: parseFloat(parcela.valor) || 0,
      statusparcela: 'PENDENTE',
      movimentocontas_idmovimentocontas: parseInt(movimentoData.idmovimentocontas)
    }));

    const { error: parcelasInsertError } = await supabase
      .from('tb_parcelascontas')
      .insert(parcelasToInsert);

    if (parcelasInsertError) {
      console.error('Erro ao inserir parcelas:', parcelasInsertError);
      throw parcelasInsertError;
    }

    // Inserir Classificação no Movimento
    const { error: classificacaoInsertError } = await supabase
      .from('tb_movimentocontas_classificacao')
      .insert([
        {
          movimentocontas_idmovimentocontas: parseInt(movimentoData.idmovimentocontas),
          classificacao_idclassificacao: parseInt(classificacaoData.idclassificacao)
        }
      ]);

    if (classificacaoInsertError) {
      console.error('Erro ao inserir classificação no movimento:', classificacaoInsertError);
      throw classificacaoInsertError;
    }

    resultado.mensagens.push({ tipo: 'SUCESSO', mensagem: 'Registro lançado com sucesso' });
    console.log('Resultado retornado (sucesso):', JSON.stringify(resultado, null, 2));
    return resultado;
  } catch (error) {
    console.error('Erro no agente2:', error.message, error.stack);
    const errorResultado = {
      mensagens: [{ tipo: 'ERRO', mensagem: error.message }],
      sucesso: false,
      fornecedor: resultado?.fornecedor || {},
      faturado: resultado?.faturado || {},
      despesa: resultado?.despesa || {},
      movimento: resultado?.movimento || {}
    };
    console.log('Resultado retornado (erro):', JSON.stringify(errorResultado, null, 2));
    return errorResultado;
  }
};