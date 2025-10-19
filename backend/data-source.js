const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // Sincroniza automaticamente as entidades com o BD (use false em produção)
  logging: true, // Ativa logs para depuração
  entities: [
    'path/to/entities/*.js' // Ajuste para o caminho das suas entidades
  ],
  migrations: [],
  subscribers: [],
});

module.exports = AppDataSource;