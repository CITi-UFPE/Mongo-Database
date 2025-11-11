import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { join } from 'path';
import passport from 'passport';

import routes from './routes';
import { seedDb } from './utils/seed';

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

mongoose.connect(dbConnection)
  .then(() => {
    console.log('MongoDB Connected...');
    seedDb();
  })
  .catch(err => console.log(err));

app.use('/', routes);
app.use('/public/images', express.static(join(__dirname, '../public/images')));

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`http server running at http://localhost:${port}`);
});