require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'build')));

// LAZY LOAD
let agente1, agente2, agente3_rag;

app.post('/api/processar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!agente1) agente1 = require('./agente1');
    if (!req.file) return res.status(400).json({ error: 'PDF não enviado' });
    const jsonResponse = await agente1(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json(jsonResponse);
  } catch (error) {
    console.error('Erro processar PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lancar-registro', async (req, res) => {
  try {
    if (!agente2) agente2 = require('./agente2');
    const resultado = await agente2(req.body);
    res.json(resultado);
  } catch (error) {
    console.error('Erro lançar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/consulta-rag', async (req, res) => {
  try {
    if (!agente3_rag) agente3_rag = require('./agente3_rag');
    const resultado = await agente3_rag(req.body.pergunta);
    res.json(resultado);
  } catch (error) {
    console.error('Erro RAG:', error);
    res.status(500).json({ error: 'Erro na consulta' });
  }
});

// ================== ROTAS 100% COMPLETAS E ATUALIZADAS ==================

// CLASSIFICAÇÃO
app.get('/api/classificacao', async (req, res) => {
  try {
    const { tipo, status = 'ATIVO' } = req.query;
    let q = supabase.from('tb_classificacao').select('idclassificacao -> id, descricao, tipo, status');
    if (tipo) q = q.eq('tipo', tipo);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) { console.error('Erro GET classificação:', e.message); res.status(500).json({ error: e.message }); }
});

app.post('/api/classificacao', async (req, res) => {
  try {
    const { descricao, tipo } = req.body;
    const { data, error } = await supabase
      .from('tb_classificacao')
      .insert({ descricao: descricao.trim(), tipo, status: 'ATIVO' })
      .select('idclassificacao -> id, descricao, tipo');
    if (error) throw error;
    res.json(data[0]);
  } catch (e) { console.error('Erro POST classificação:', e.message); res.status(500).json({ error: e.message }); }
});

app.put('/api/classificacao/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;
    const { data, error } = await supabase
      .from('tb_classificacao')
      .update({ descricao: descricao.trim() })
      .eq('idclassificacao', id)
      .select('idclassificacao -> id, descricao, tipo');
    if (error) throw error;
    res.json(data[0]);
  } catch (e) { console.error('Erro PUT classificação:', e.message); res.status(500).json({ error: e.message }); }
});

app.delete('/api/classificacao/:id', async (req, res) => {
  try {
    await supabase.from('tb_classificacao').update({ status: 'DESATIVADO' }).eq('idclassificacao', req.params.id);
    res.json({ sucesso: true });
  } catch (e) { console.error('Erro DELETE classificação:', e.message); res.status(500).json({ error: e.message }); }
});

// CONTAS → COM TIPO (Cliente/Fornecedor/Faturado) + NOME DA PESSOA
app.get('/api/contas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tb_movimentocontas')
      .select(`
        idmovimentocontas -> id,
        numeronotafiscal,
        dataemissao,
        valortotal,
        descricao,
        status,
        pessoas_idfornecedorcliente,
        pessoas_idfaturado,
        fornecedor:tb_pessoas!pessoas_idfornecedorcliente (idpessoas, razaosocial),
        faturado:tb_pessoas!pessoas_idfaturado (idpessoas, razaosocial)
      `)
      .order('dataemissao', { ascending: false });

    if (error) throw error;

    const resultado = data.map(item => ({
      id: item.id,
      numeronotafiscal: item.numeronotafiscal || '',
      dataemissao: item.dataemissao,
      valortotal: item.valortotal,
      descricao: item.descricao || '',
      status: item.status,
      tipo: item.pessoas_idfornecedorcliente 
        ? 'Fornecedor' 
        : item.pessoas_idfaturado 
          ? 'Faturado' 
          : 'Cliente',
      nome_pessoa: item.fornecedor?.razaosocial 
        || item.faturado?.razaosocial 
        || 'Não informado'
    }));

    res.json(resultado);
  } catch (e) {
    console.error('ERRO /api/contas:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/contas/buscar', async (req, res) => {
  try {
    const { termo } = req.query;
    const { data, error } = await supabase
      .from('tb_movimentocontas')
      .select('idmovimentocontas -> id, numeronotafiscal, dataemissao, valortotal')
      .ilike('numeronotafiscal', `%${termo}%`)
      .order('dataemissao', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) { console.error('ERRO buscar contas:', e.message); res.status(500).json({ error: e.message }); }
});

app.post('/api/contas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tb_movimentocontas')
      .insert(req.body)
      .select('idmovimentocontas -> id');
    if (error) throw error;
    res.json(data[0]);
  } catch (e) { console.error('Erro POST contas:', e.message); res.status(500).json({ error: e.message }); }
});

app.put('/api/contas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('tb_movimentocontas')
      .update(req.body)
      .eq('idmovimentocontas', id)
      .select('idmovimentocontas -> id');
    if (error) throw error;
    res.json(data[0]);
  } catch (e) { console.error('Erro PUT contas:', e.message); res.status(500).json({ error: e.message }); }
});

app.delete('/api/contas/:id', async (req, res) => {
  try {
    await supabase.from('tb_movimentocontas').update({ status: 'CANCELADO' }).eq('idmovimentocontas', req.params.id);
    res.json({ sucesso: true });
  } catch (e) { console.error('Erro DELETE contas:', e.message); res.status(500).json({ error: e.message }); }
});

// PESSOAS
app.get('/api/pessoas', async (req, res) => {
  try {
    const { tipo, status = 'ATIVO' } = req.query;
    let q = supabase.from('tb_pessoas').select('idpessoas -> id, razaosocial, fantasia, documento, tipo, status').eq('status', status);
    if (tipo) q = q.eq('tipo', tipo);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) { console.error('ERRO GET pessoas:', e.message); res.status(500).json({ error: e.message }); }
});

app.get('/api/pessoas/buscar', async (req, res) => {
  try {
    const { termo, tipo } = req.query;
    let q = supabase.from('tb_pessoas').select('idpessoas -> id, razaosocial, documento, tipo').eq('status', 'ATIVO');
    if (termo) q = q.or(`razaosocial.ilike.%${termo}%,documento.ilike.%${termo}%`);
    if (tipo) q = q.eq('tipo', tipo);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) { console.error('ERRO buscar pessoas:', e.message); res.status(500).json({ error: e.message }); }
});

app.post('/api/pessoas', async (req, res) => {
  try {
    const { razaosocial, fantasia, documento, tipo } = req.body;
    const { data, error } = await supabase
      .from('tb_pessoas')
      .insert({ tipo, razaosocial: razaosocial.trim(), fantasia: fantasia?.trim() || null, documento: documento.trim(), status: 'ATIVO' })
      .select('idpessoas -> id, razaosocial, fantasia, documento, tipo');
    if (error) throw error;
    res.json(data[0]);
  } catch (e) { console.error('Erro POST pessoas:', e.message); res.status(500).json({ error: e.message }); }
});

app.put('/api/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { razaosocial, fantasia, documento } = req.body;
    const { data, error } = await supabase
      .from('tb_pessoas')
      .update({ razaosocial: razaosocial.trim(), fantasia: fantasia?.trim() || null, documento: documento.trim() })
      .eq('idpessoas', id)
      .select('idpessoas -> id, razaosocial, fantasia, documento');
    if (error) throw error;
    res.json(data[0]);
  } catch (e) { console.error('Erro PUT pessoas:', e.message); res.status(500).json({ error: e.message }); }
});

app.delete('/api/pessoas/:id', async (req, res) => {
  try {
    await supabase.from('tb_pessoas').update({ status: 'DESATIVADO' }).eq('idpessoas', req.params.id);
    res.json({ sucesso: true });
  } catch (e) { console.error('Erro DELETE pessoas:', e.message); res.status(500).json({ error: e.message }); }
});

// FRONTEND
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} — TUDO 100% FUNCIONAL`);
  console.log(`Acesse: https://extratordenfe-1.onrender.com`);
});