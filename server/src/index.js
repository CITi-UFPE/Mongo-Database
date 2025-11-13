'use strict';
require('dotenv/config'); 

// Use require para CommonJS
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const passport = require('passport');
const routes = require('./routes').default; 
const { seedDb } = require('./utils/seed');

const app = express();

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
  credentials: true
}));

// COOP
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const isProduction = process.env.NODE_ENV === 'production';

const dbConnection = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;

if (!dbConnection) {
  console.error("Erro fatal: String de conexão com MongoDB não definida (MONGO_URI_DEV ou MONGO_URI_PROD).");
  console.log("Verifique seu .env ou as variáveis de ambiente do docker-compose.");
  process.exit(1); 
}

mongoose.connect(dbConnection)
  .then(() => {
    console.log('MongoDB Connected...');
    if (process.env.RUN_SEED_ON_STARTUP === 'true') {
      console.log('RUN_SEED_ON_STARTUP=true detectado. Rodando o seed...');
      seedDb().then(() => {
        console.log('Seed concluído com sucesso.');
      }).catch(seedErr => {
        console.error('Erro ao rodar o seed:', seedErr);
      });
    } else {
      console.log('Seed pulado. (Defina RUN_SEED_ON_STARTUP=true no docker-compose para rodar)');
    }
  })
  .catch(err => {
    console.error('Falha ao conectar no MongoDB:', err.message);
  });

app.use('/', routes);

app.use('/public/images', express.static(path.join(__dirname, '../public/images')));


app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// A porta é 80, conforme definido no docker-compose.yml
const port = process.env.PORT || 5000; 
app.listen(port, () => {
  console.log(`http server running at http://localhost:${port}`);
});