require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const agente1 = require('./agente1');
const agente2 = require('./agente2');
const agente3_rag = require('./agente3_rag');//

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'uploads/' });

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
}));
app.use(express.json());

// Servir arquivos estáticos do frontend (pasta build)
app.use(express.static(path.join(__dirname, 'build')));

// Rotas da API com prefixo /api
app.post('/api/processar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('Nenhum arquivo PDF enviado');
    }
    const filePath = req.file.path;
    const jsonResponse = await agente1(filePath);
    fs.unlinkSync(filePath);
    res.json(jsonResponse);
  } catch (error) {
    console.error('Erro no processamento do PDF:', error.message, error.stack);
    res.status(500).json({ error: `Erro ao processar o PDF: ${error.message}` });
  }
});

app.post('/api/lancar-registro', async (req, res) => {
  try {
    const dados = req.body;
    const resultado = await agente2(dados);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao lançar registro:', error.message, error.stack);
    res.status(500).json({ error: `Erro ao lançar registro: ${error.message}` });
  }
});

// 🔹 Rota agente 3 (RAG)
app.post('/api/consulta-rag', async (req, res) => {
  try {
    const { pergunta } = req.body;
    const resultado = await agente3_rag(pergunta);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao processar consulta RAG:', error.message);
    res.status(500).json({ error: 'Erro ao processar consulta RAG.' });
  }
});

// Rota catch-all para o frontend (React)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.message, err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});

