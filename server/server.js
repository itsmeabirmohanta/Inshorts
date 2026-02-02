const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const User = require('./models/User');
const { hashPassword } = require('./utils/security');

const app = express();
const PORT = process.env.PORT || 5001;

if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enhanced CORS configuration with multiple origins support
const getAllowedOrigins = () => {
  const origins = process.env.CLIENT_URL || 'http://localhost:5173';
  return origins.split(',').map(origin => origin.trim());
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

app.use('/uploads', express.static('uploads'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inshorts-uni';

const maskUri = (uri) => {
  try {
    return uri.replace(/:(.*)@/, ':****@');
  } catch (e) {
    return 'mongodb://<masked>';
  }
};

console.log('Connecting to MongoDB at', maskUri(MONGO_URI));

mongoose.connection.on('connected', () => console.log('✅ MongoDB Connected'));
mongoose.connection.on('error', (err) => console.error('❌ MongoDB Error:', err?.message));
mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB Disconnected'));

const seedUsers = async () => {
  try {
    if (process.env.NODE_ENV === 'production') return;

    const count = await User.countDocuments();
    if (count === 0) {
      const seedPassword = process.env.SEED_PASSWORD || 'pass123';
      const users = [
        { regId: 'teacher1', password: await hashPassword(seedPassword), role: 'teacher' },
        { regId: 'student1', password: await hashPassword(seedPassword), role: 'student' }
      ];
      await User.insertMany(users);
      console.log('✅ Default users created');
    }
  } catch (err) {
    console.error('Error seeding users:', err.message);
  }
};

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    await seedUsers();
    
    app.use('/api/auth', authRoutes);
    app.use('/api/announcements', announcementRoutes);
    
    app.get('/', (req, res) => {
      res.json({ success: true, message: 'Server is running', version: '1.0.0' });
    });

    // Global error handler - catches all unhandled errors
    app.use((err, req, res, next) => {
      // Log error details
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unhandled error:', err);
      }

      // Handle specific error types
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.message
        });
      }

      if (err.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID format',
          code: 'INVALID_ID'
        });
      }

      // Generic error response
      res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message,
        code: err.code || 'INTERNAL_ERROR'
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND'
      });
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    }).on('error', (err) => {
      console.error('Server failed to start:', err);
      process.exit(1);
    });
    
  } catch (err) {
    console.error('Failed to connect to MongoDB:');
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    console.error('\nPlease check:');
    console.error('1. MongoDB Atlas IP whitelist includes your current IP');
    console.error('2. Database credentials are correct in .env file');
    console.error('3. Network connection is stable');
    process.exit(1);
  }
};

startServer();
