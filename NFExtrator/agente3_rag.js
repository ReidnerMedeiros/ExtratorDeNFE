// agente3_rag.js
require('dotenv').config();
const OpenAI = require('openai');
const { Pool } = require('pg');

// Configuração da conexão com PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

// Inicializa o cliente da OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function agente3_rag(pergunta) {
  try {
    // Busca dados no banco conforme a pergunta
    const query = `
      SELECT * FROM financeiro
      WHERE LOWER(descricao) LIKE LOWER('%${pergunta}%')
      OR LOWER(categoria) LIKE LOWER('%${pergunta}%')
      LIMIT 10;
    `;
    const result = await pool.query(query);

    const contexto = JSON.stringify(result.rows, null, 2);

    // Chama o modelo para gerar uma resposta contextualizada
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro que explica resultados de consultas SQL de forma clara e objetiva.',
        },
        {
          role: 'user',
          content: `Pergunta: ${pergunta}\nDados do banco:\n${contexto}`,
        },
      ],
    });

    return {
      resposta: completion.choices[0].message.content,
      dados: result.rows,
    };
  } catch (error) {
    console.error('Erro no agente3_rag:', error);
    throw error;
  }
}

module.exports = agente3_rag;
