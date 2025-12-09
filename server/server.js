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
mongoose.connect(MONGO_URI, {
  // useNewUrlParser and useUnifiedTopology are accepted; mongoose v6+ uses them by default
  serverSelectionTimeoutMS: 30000, // 30s timeout for server selection
  socketTimeoutMS: 45000
})
.then(() => {
  console.log('MongoDB Connected');
  seedUsers();
})
.catch(err => {
  console.error('Mongoose connection error:');
  console.error(err && err.message ? err.message : err);
  console.error('Full error: ', err);
});

// Connection event listeners for additional diagnostics
mongoose.connection.on('connected', () => console.log('Mongoose event: connected'));
mongoose.connection.on('error', (err) => console.error('Mongoose event: error', err && err.message));
mongoose.connection.on('disconnected', () => console.warn('Mongoose event: disconnected'));

// Seed Users
const seedUsers = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    const users = [
      { regId: 'teacher1', password: 'pass123', role: 'teacher' },
      { regId: 'student1', password: 'pass123', role: 'student' }
    ];
    await User.insertMany(users);
    console.log('Users Seeded');
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);

app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start server - bind to 0.0.0.0 for container deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
