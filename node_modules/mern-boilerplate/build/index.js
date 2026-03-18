"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
require("dotenv/config");
var _express = _interopRequireDefault(require("express"));
var _mongoose = _interopRequireDefault(require("mongoose"));
var _cors = _interopRequireDefault(require("cors"));
var _path = require("path");
var _passport = _interopRequireDefault(require("passport"));
var _routes = _interopRequireDefault(require("./routes"));
var _seed = require("./utils/seed");
require("./services/jwtStrategy");
require("./services/googleStrategy");
require("./services/localStrategy");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const app = (0, _express.default)();

// CORS - Allow requests from client URLs
const clientUrlDev = process.env.CLIENT_URL_DEV || 'http://localhost:3000';
const clientUrlProd = process.env.CLIENT_URL_PROD || 'http://localhost:3080';
const allowedOrigins = ['http://localhost:5173',
// Vite dev server
'http://localhost:4173',
// Vite preview
'http://localhost:3000',
// React dev
'http://localhost:3080',
// Docker production
clientUrlDev, clientUrlProd, 'https://mern-boilerplate.amd2.localhost3002.live', 'https://localhost3002.live', 'https://mongo-database-jshebbs-projects.vercel.app' // Vercel production
];
app.use((0, _cors.default)({
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
app.use(_express.default.json());
app.use(_express.default.urlencoded({
  extended: true
}));
app.use(_passport.default.initialize());

// Load passport strategies
// Load passport strategies

const isProduction = process.env.NODE_ENV === 'production';
const dbConnection = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
_mongoose.default.connect(dbConnection).then(() => {
  console.log('MongoDB Connected...');
  if (!process.env.VERCEL) {
    (0, _seed.seedDb)();
  }
}).catch(err => console.log(err));

// Validate critical environment variables at startup
const validateEnvVars = () => {
  const requiredVars = ['GOOGLE_CLIENT_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
  }

  // Check JWT secret
  const jwtSecret = process.env.JWT_SECRET_DEV || process.env.JWT_SECRET_PROD;
  if (!jwtSecret) {
    console.error('❌ Missing JWT_SECRET (JWT_SECRET_DEV or JWT_SECRET_PROD)');
  }

  // Log validation results (without exposing secrets)
  console.log('🔍 Environment validation:');
  console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing');
  console.log('  - JWT_SECRET:', jwtSecret ? '✓ Set' : '✗ Missing');
  console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');
};

// Run validation
validateEnvVars();
app.use('/api', _routes.default);
app.use('/', _routes.default);
app.use('/public/images', _express.default.static((0, _path.join)(__dirname, '../public/images')));
app.get('/', (req, res) => {
  res.json({
    message: 'Server is running'
  });
});

// Global error handler - must be after all routes
app.use((err, req, res, next) => {
  console.error('❌ [Global Error Handler] Unhandled error:');
  console.error('  Path:', req.method, req.path);
  console.error('  Error:', err.message);
  console.error('  Stack:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack
    })
  });
});
const port = process.env.PORT || 5000;
const host = isProduction ? '0.0.0.0' : 'localhost';
if (!process.env.VERCEL) {
  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
var _default = exports.default = app;