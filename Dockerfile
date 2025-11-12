# Usar Node.js 20 com Alpine (leve e eficiente)
FROM node:20-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar todo o código do projeto
COPY . .

# Buildar o frontend (gera a pasta 'build')
RUN npm run build

# Expor a porta 5000 (usada pelo backend)
EXPOSE 5000

# Comando para iniciar o backend (npm start = node server.js)
CMD ["npm", "run", "start"]