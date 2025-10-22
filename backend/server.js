require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const agente1 = require('./agente1');
const agente2 = require('./agente2');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.post('/processar-pdf', upload.single('pdf'), async (req, res) => {
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

app.post('/lancar-registro', async (req, res) => {
  try {
    const dados = req.body;
    const resultado = await agente2(dados);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao lançar registro:', error.message, error.stack);
    res.status(500).json({ error: `Erro ao lançar registro: ${error.message}` });
  }
});



app.listen(5000, () => {
  console.log('Backend rodando na porta 5000');
});