require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// === SUPABASE ===
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const app = express();

// Pasta uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: 'uploads/' });

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'build')));

// ====================== LAZY LOAD DOS AGENTES ======================
let agente1, agente2, agente3_rag;

// Extrair PDF
app.post('/api/processar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!agente1) agente1 = require('./agente1');
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
    const filePath = req.file.path;
    const jsonResponse = await agente1(filePath);
    fs.unlinkSync(filePath);
    res.json(jsonResponse);
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    res.status(500).json({ error: `Erro ao processar o PDF: ${error.message}` });
  }
});

// Lançar registro
app.post('/api/lancar-registro', async (req, res) => {
  try {
    if (!agente2) agente2 = require('./agente2');
    const resultado = await agente2(req.body);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao lançar registro:', error);
    res.status(500).json({ error: `Erro ao lançar registro: ${error.message}` });
  }
});

// Consulta RAG
app.post('/api/consulta-rag', async (req, res) => {
  try {
    if (!agente3_rag) agente3_rag = require('./agente3_rag');
    const resultado = await agente3_rag(req.body.pergunta);
    res.json(resultado);
  } catch (error) {
    console.error('Erro consulta RAG:', error);
    res.status(500).json({ error: 'Erro na consulta inteligente.' });
  }
});

// ================== ROTAS CADASTROS – 100% CORRIGIDAS ==================

// CLASSIFICAÇÃO
app.get('/api/classificacao', async (req, res) => {
  const { tipo, status = 'ATIVO' } = req.query;
  let query = supabase.from('tb_classificacao').select('*');
  if (tipo) query = query.eq('tipo', tipo);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/classificacao/buscar', async (req, res) => {
  const { termo, tipo } = req.query;
  let query = supabase.from('tb_classificacao').select('*').ilike('descricao', `%${termo}%`);
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/classificacao', async (req, res) => {
  const { descricao, tipo } = req.body;
  const { data, error } = await supabase.from('tb_classificacao').insert({ descricao: descricao.trim(), tipo, status: 'ATIVO' }).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/classificacao/:id', async (req, res) => {
  const { id } = req.params;
  const { descricao } = req.body;
  const { data, error } = await supabase.from('tb_classificacao').update({ descricao: descricao.trim() }).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/classificacao/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('tb_classificacao').update({ status: 'DESATIVADO' }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ sucesso: true });
});

// MANTEM CONTAS → AGORA CONSULTA tb_movimentocontas (a tabela real!)
app.get('/api/contas', async (req, res) => {
  const { status = 'ATIVO' } = req.query;
  const { data, error } = await supabase
    .from('tb_movimentocontas')
    .select('idmovimentocontas as id, numeronotafiscal, dataemissao, valortotal, descricao, status')
    .order('dataemissao', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/contas/buscar', async (req, res) => {
  const { termo } = req.query;
  const { data, error } = await supabase
    .from('tb_movimentocontas')
    .select('idmovimentocontas as id, numeronotafiscal, dataemissao, valortotal, descricao')
    .ilike('numeronotafiscal', `%${termo}%`)
    .order('dataemissao', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// PESSOAS → usando razaosocial (e não nome)
app.get('/api/pessoas', async (req, res) => {
  const { tipo, status = 'ATIVO' } = req.query;
  let query = supabase.from('tb_pessoas').select('idpessoas as id, razaosocial, fantasia, documento, tipo, status').eq('status', status);
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/pessoas/buscar', async (req, res) => {
  const { termo, tipo } = req.query;
  let query = supabase.from('tb_pessoas').select('idpessoas as id, razaosocial, documento, tipo').eq('status', 'ATIVO');
  if (termo) query = query.or(`razaosocial.ilike.%${termo}%,documento.ilike.%${termo}%`);
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/pessoas', async (req, res) => {
  const { razaosocial, fantasia, documento, tipo } = req.body;
  const { data, error } = await supabase.from('tb_pessoas').insert({
    tipo,
    razaosocial: razaosocial.trim(),
    fantasia: fantasia?.trim() || null,
    documento: documento.trim(),
    status: 'ATIVO'
  }).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/pessoas/:id', async (req, res) => {
  const { id } = req.params;
  const { razaosocial, fantasia, documento } = req.body;
  const { data, error } = await supabase.from('tb_pessoas').update({
    razaosocial: razaosocial.trim(),
    fantasia: fantasia?.trim() || null,
    documento: documento.trim()
  }).eq('idpessoas', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/pessoas/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('tb_pessoas').update({ status: 'DESATIVADO' }).eq('idpessoas', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ sucesso: true });
});

// FRONTEND
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// SERVIDOR
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Acesse: https://extratordenfe-1.onrender.com`);
});