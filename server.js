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

// ====================== LAZY LOAD DOS AGENTES ======================
let agente1, agente2, agente3_rag;

app.post('/api/processar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!agente1) agente1 = require('./agente1');
    if (!req.file) return res.status(400).json({ error: 'Nenhum PDF enviado' });
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
    console.error('Erro lançar registro:', error);
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
    res.status(500).json({ error: 'Erro na consulta inteligente' });
  }
});

// ================== ROTAS CORRETAS 100% ==================

// CLASSIFICAÇÃO (OK)
app.get('/api/classificacao', async (req, res) => {
  const { tipo, status = 'ATIVO' } = req.query;
  let q = supabase.from('tb_classificacao').select('*');
  if (tipo) q = q.eq('tipo', tipo);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/classificacao/buscar', async (req, res) => {
  const { termo, tipo } = req.query;
  let q = supabase.from('tb_classificacao').select('*').ilike('descricao', `%${termo}%`);
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// CONTAS → AGORA É tb_movimentocontas + idmovimentocontas
app.get('/api/contas', async (req, res) => {
  const { data, error } = await supabase
    .from('tb_movimentocontas')
    .select('idmovimentocontas:id, numeronotafiscal, dataemissao, valortotal, descricao, status')
    .order('dataemissao', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/contas/buscar', async (req, res) => {
  const { termo } = req.query;
  const { data, error } = await supabase
    .from('tb_movimentocontas')
    .select('idmovimentocontas:id, numeronotafiscal, dataemissao, valortotal')
    .ilike('numeronotafiscal', `%${termo}%`)
    .order('dataemissao', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// PESSOAS → idpessoas + razaosocial
app.get('/api/pessoas', async (req, res) => {
  const { tipo, status = 'ATIVO' } = req.query;
  let q = supabase.from('tb_pessoas').select('idpessoas:id, razaosocial, fantasia, documento, tipo, status').eq('status', status);
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/pessoas/buscar', async (req, res) => {
  const { termo, tipo } = req.query;
  let q = supabase.from('tb_pessoas').select('idpessoas:id, razaosocial, documento, tipo').eq('status', 'ATIVO');
  if (termo) q = q.or(`razaosocial.ilike.%${termo}%,documento.ilike.%${termo}%`);
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/pessoas', async (req, res) => {
  const { razaosocial, fantasia, documento, tipo } = req.body;
  const { data, error } = await supabase.from('tb_pessoas').insert({
    tipo,
    razaosocial: razaosocial.trim(),
    fantasia: fantasia?.trim(),
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
    fantasia: fantasia?.trim(),
    documento: documento.trim()
  }).eq('idpessoas', id).select();  // ← CORRETO: idpessoas
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

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Acesse: https://extratordenfe-1.onrender.com`);
});