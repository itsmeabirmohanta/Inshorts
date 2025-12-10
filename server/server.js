const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors()); // Allow all origins for development
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Database Connection (improved diagnostics)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inshorts-uni';

// Mask URI for logs (do not print credentials)
const maskUri = (uri) => {
  try {
    // keep protocol and host, hide auth
    return uri.replace(/:(.*)@/, ':****@');
  } catch (e) {
    return 'mongodb://<masked>';
  }
};

console.log('Connecting to MongoDB at', maskUri(MONGO_URI));

// Recommended options; increase serverSelectionTimeoutMS for slower networks
// Connection event listeners for diagnostics
mongoose.connection.on('connected', () => console.log('Mongoose event: connected'));
mongoose.connection.on('error', (err) => console.error('Mongoose event: error', err && err.message));
mongoose.connection.on('disconnected', () => console.warn('Mongoose event: disconnected'));

// Seed Users
const seedUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const users = [
        { regId: 'teacher1', password: 'pass123', role: 'teacher' },
        { regId: 'student1', password: 'pass123', role: 'student' }
      ];
      await User.insertMany(users);
      console.log('Users Seeded');
    } else {
      console.log('Users already exist, skipping seed');
    }
  } catch (err) {
    console.error('Error seeding users:', err.message);
  }
};

// Connect to MongoDB and start server only after connection is established
const startServer = async () => {
  try {
    // Wait for MongoDB connection with proper options
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30s timeout for server selection
      socketTimeoutMS: 45000,
      // Disable buffering - fail fast if not connected
      bufferCommands: false
    });
    
    console.log('MongoDB Connected successfully');
    
    // Seed users after connection is confirmed
    await seedUsers();
    
    // Setup routes after DB is ready
    app.use('/api/auth', authRoutes);
    app.use('/api/announcements', announcementRoutes);
    
    app.get('/', (req, res) => {
      res.send('Server is running');
    });
    
    // Start server only after DB connection is confirmed
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
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

// Start the server
startServer();
