import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { join } from 'path';
import passport from 'passport';

import routes from './routes';
import { seedDb } from './utils/seed';

const app = express();

// CORS - Allow requests from client URLs
const clientUrlDev = process.env.CLIENT_URL_DEV || 'http://localhost:3000';
const clientUrlProd = process.env.CLIENT_URL_PROD || 'http://localhost:3080';
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  'http://localhost:3000', // React dev
  'http://localhost:3080', // Docker production
  clientUrlDev,
  clientUrlProd,
  'https://mern-boilerplate.amd2.localhost3002.live',
  'https://localhost3002.live'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Load passport strategies
// Load passport strategies
import './services/jwtStrategy';
import './services/googleStrategy';
import './services/localStrategy';

const isProduction = process.env.NODE_ENV === 'production';
const dbConnection = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;

mongoose.connect(dbConnection)
  .then(() => {
    console.log('MongoDB Connected...');
    if (!process.env.VERCEL) {
      seedDb();
    }
  })
  .catch(err => console.log(err));

app.use('/', routes);
app.use('/public/images', express.static(join(__dirname, '../public/images')));

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

const port = process.env.PORT || 5000;
const host = isProduction ? '0.0.0.0' : 'localhost';

if (!process.env.VERCEL) {
  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;