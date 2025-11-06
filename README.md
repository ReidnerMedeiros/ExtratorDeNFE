Processador de Notas Fiscais

Descrição

Este projeto foi desenvolvido como parte da disciplina Prática de Engenharia de Software da Universidade de Rio Verde (UniRV). O Processador de Notas Fiscais é uma aplicação web que permite a extração de dados de notas fiscais em formato PDF e o registro automático desses dados em um banco de dados. A aplicação utiliza inteligência artificial para extrair informações como fornecedor, faturado, produtos, parcelas e classificação de despesa, e realiza o armazenamento estruturado em um banco de dados relacional.

O sistema é composto por um frontend em React para interação com o usuário e um backend em Node.js integrado com o banco de dados Supabase. A extração de dados do PDF é feita pelo agenteExtrator.js , que utiliza a API do Gemini, enquanto o registro no banco é gerenciado pelo agenteManipulador.js .
Funcionalidades

Upload de PDF: Permite ao usuário fazer upload de arquivos PDF de notas fiscais.
Extração de Dados: Extrai informações como fornecedor (CNPJ, razão social), faturado (CPF/CNPJ, nome), número da nota fiscal, data de emissão, produtos, parcelas, valor total, ICMS e classificação de despesa.

Registro no Banco de Dados: Insere os dados extraídos nas tabelas tb_pessoas, tb_classificacao, tb_movimentocontas, tb_parcelascontas e tb_movimentocontas_classificacao no Supabase.

Validação de Duplicatas: Impede o registro de parcelas duplicadas para a mesma nota fiscal, exibindo uma mensagem de erro clara.

Interface Amigável: Interface em React com exibição dos dados extraídos e resultados do lançamento, incluindo mensagens de sucesso e erro com IDs das entidades criadas ou existentes.


Tecnologias Utilizadas

Frontend: React, Axios, CSS
Backend: Node.js, Express
Banco de Dados: Supabase (PostgreSQL)
Extração de PDF: API do Gemini (via agenteExtrator.js)
Outras Ferramentas: Docker, Vite (para desenvolvimento do frontend)

Estrutura do Projeto

NFEExtrator/

├── src/

│   ├── App.js           # Componente principal do frontend

│   ├── App.css          # Estilos do frontend

│   ├── agenteExtrator.js   # Extrai dados de PDFs (anteriormente agente1.js)

│   ├── agenteManipulador.js # Gerencia registros no banco (anteriormente agente2.js)

├── server.js        # Configuração do servidor Express

├── .env                 # Variáveis de ambiente (API_URL, Supabase, Gemini)

├── Dockerfile           # Configuração para container Docker

├── .dockerignore        # Arquivos ignorados pelo Docker

├── package.json         # Dependências e scripts

├── README.md            # Este arquivo


Pré-requisitos

Node.js (versão 18 ou superior)
npm
Conta no Supabase (para banco de dados)
Chave da API do Gemini (para extração de PDFs)
Docker (opcional, para implantação)

Instalação

Clonar o Repositório:
git clone <URL_DO_REPOSITORIO>
cd processador-notas-fiscais


Instalar Dependências:
npm install


Configurar Variáveis de Ambiente:Crie um arquivo .env na raiz do projeto com o seguinte conteúdo:
NODE_ENV=development
PORT=5000
GEMINI_API_KEY=<SUA_CHAVE_GEMINI>
SUPABASE_URL=<SUA_URL_SUPABASE>
SUPABASE_KEY=<SUA_CHAVE_SUPABASE>
REACT_APP_API_URL=http://localhost:5000/api

Substitua <SUA_CHAVE_GEMINI>, <SUA_URL_SUPABASE> e <SUA_CHAVE_SUPABASE> pelas suas credenciais.

Configurar o Banco de Dados:

No Supabase, crie as tabelas necessárias com o seguinte esquema SQL:CREATE TABLE tb_pessoas (
    idpessoas SERIAL PRIMARY KEY,
    tipo VARCHAR(20) CHECK (tipo IN ('FORNECEDOR', 'FATURADO')),
    razaosocial VARCHAR(255),
    fantasia VARCHAR(255),
    documento VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('ATIVO', 'DESATIVADO'))
);

CREATE TABLE tb_classificacao (
    idclassificacao SERIAL PRIMARY KEY,
    tipo VARCHAR(20) CHECK (tipo IN ('DESPESA', 'RECEITA')),
    descricao VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('ATIVO', 'DESATIVADO'))
);

CREATE TABLE tb_movimentocontas (
    idmovimentocontas SERIAL PRIMARY KEY,
    numeronotafiscal VARCHAR(50),
    dataemissao DATE,
    descricao TEXT,
    status VARCHAR(20) CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO')),
    valortotal NUMERIC,
    pessoas_idfornecedorcliente INTEGER REFERENCES tb_pessoas(idpessoas),
    pessoas_idfaturado INTEGER REFERENCES tb_pessoas(idpessoas)
);

CREATE TABLE tb_parcelascontas (
    idparcelascontas SERIAL PRIMARY KEY,
    identificacao VARCHAR(50) UNIQUE,
    datavencimento DATE,
    valorparcela NUMERIC,
    valorsaldo NUMERIC,
    statusparcela VARCHAR(20) CHECK (statusparcela IN ('PENDENTE', 'PAGO', 'ATRASADO')),
    movimentocontas_idmovimentocontas INTEGER REFERENCES tb_movimentocontas(idmovimentocontas)
);

CREATE TABLE tb_movimentocontas_classificacao (
    idmovimentocontas_classificacao SERIAL PRIMARY KEY,
    movimentocontas_idmovimentocontas INTEGER REFERENCES tb_movimentocontas(idmovimentocontas),
    classificacao_idclassificacao INTEGER REFERENCES tb_classificacao(idclassificacao)
);




Renomear Arquivos de Agentes:

Renomeie agente1.js para agenteExtrator.js.
Renomeie agente2.js para agenteManipulador.js.
Atualize o server.js para refletir os novos nomes:const agenteExtrator = require('./agenteExtrator');
const agenteManipulador = require('./agenteManipulador');





Como Usar

Executar Localmente:

Inicie o backend:npm start

O servidor estará disponível em http://localhost:5000.
Inicie o frontend:npm run dev

Acesse a interface em http://localhost:3000.


Upload e Processamento:

Na interface, faça upload de um arquivo PDF de uma nota fiscal.
Clique em Extrair Dados para processar o PDF. Os dados extraídos serão exibidos em formato JSON.
Clique em Lançar Registro para registrar os dados no banco de dados.
Verifique os resultados na tela:
Sucesso: Mensagens em verde com IDs das entidades criadas ou existentes.
Erro: Mensagens em vermelho, como "Parcelas já existem para esta nota fiscal".




Testar com Docker:

Construa a imagem:docker build -t processador-notas-fiscais .


Execute o container:docker run -p 5000:5000 --env-file .env processador-notas-fiscais


Acesse http://localhost:5000.



Testes

Cenário Sem Parcelas Existentes:

Faça upload de um PDF e clique em "Lançar Registro".
Espere mensagens como:SUCESSO: Fornecedor existe - ID: <id>
SUCESSO: Faturado existe - ID: <id>
SUCESSO: Classificação existe - ID: <id>
SUCESSO: Movimento criado - ID: <id>
SUCESSO: Registro lançado com sucesso


Verifique o banco com:SELECT * FROM tb_movimentocontas WHERE numeronotafiscal = '503.972';
SELECT * FROM tb_parcelascontas WHERE identificacao LIKE '503.972%';




Cenário com Parcelas Existentes:

Tente lançar a mesma nota fiscal novamente.
Espere um erro:SUCESSO: Fornecedor existe - ID: <id>
SUCESSO: Faturado existe - ID: <id>
SUCESSO: Classificação existe - ID: <id>
SUCESSO: Movimento existe - ID: <id>
ERRO: Parcelas já existem para esta nota fiscal.


Um alert será exibido com o erro.


Limpar o Banco para Testes:

Remova parcelas existentes:DELETE FROM tb_parcelascontas WHERE identificacao LIKE '503.972%';





Depuração

Logs do Backend: Verifique o terminal (npm start) para logs como:
Dados recebidos no agenteExtrator
Dados recebidos no agenteManipulador
Resultado retornado (sucesso) ou Resultado retornado (erro)


Logs do Frontend: No navegador (F12 > Console), verifique:
Payload enviado para lancar-registro
Resultado recebido do lancar-registro


Erros no Banco: Execute SELECTs para verificar os dados:SELECT * FROM tb_pessoas WHERE documento = '48.290.289/0001-57' AND tipo = 'FORNECEDOR';
SELECT * FROM tb_pessoas WHERE documento = '709.715.321-09' AND tipo = 'FATURADO';
SELECT * FROM tb_classificacao WHERE descricao = 'OUTROS' AND tipo = 'DESPESA';



Contribuições
Este projeto foi desenvolvido como trabalho acadêmico e não está aberto para contribuições externas no momento. Sugestões ou melhorias podem ser discutidas com a equipe da disciplina Prática de Engenharia de Software na UniRV.
Autores

[Reidner e Laura] - Desenvolvedor principal
Orientador: [João Dionisio Paraiba]

Licença
Este projeto é de uso exclusivo para fins acadêmicos na UniRV. Não possui licença pública.