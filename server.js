require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const agente1 = require('./agente1');
const agente2 = require('./agente2');
const agente3_rag = require('./agente3_rag');

const app = express();

// Criar pasta uploads se não existir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: 'uploads/' });

// CORS liberado para seu domínio e localhost
app.use(cors()); // ← SIMPLES E FUNCIONA PERFEITO NO RENDER

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir o frontend construído
app.use(express.static(path.join(__dirname, 'build')));

// ================== ROTAS API ==================
app.post('/api/processar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });

    const filePath = req.file.path;
    const jsonResponse = await agente1(filePath);

    // Apagar arquivo temporário
    fs.unlinkSync(filePath);

    res.json(jsonResponse);
  } catch (error) {
    console.error('Erro no processamento do PDF:', error);
    res.status(500).json({ error: `Erro ao processar o PDF: ${error.message}` });
  }
});

app.post('/api/lancar-registro', async (req, res) => {
  try {
    const dados = req.body;
    const resultado = await agente2(dados);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao lançar registro:', error);
    res.status(500).json({ error: `Erro ao lançar registro: ${error.message}` });
  }
});

app.post('/api/consulta-rag', async (req, res) => {
  try {
    const { pergunta } = req.body;
    const resultado = await agente3_rag(pergunta);
    res.json(resultado);
  } catch (error) {
    console.error('Erro consulta RAG:', error);
    res.status(500).json({ error: 'Erro na consulta inteligente.' });
  }
});

// Todas as outras rotas → React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Porta do Render
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});