# 🎓 Inshorts - University Announcement Platform

> A modern, fast, and beautiful university announcement system built with the MERN stack. Teachers create announcements with AI-powered summaries, students view them in an elegant feed.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb)

## ✨ Key Features

- 🤖 **AI-Powered Summaries** - Automatic 60-word summaries using Google Gemini 2.0
- 🎨 **Beautiful UI** - React 19 + Tailwind CSS v4 with smooth Framer Motion animations
- �� **Role-Based Access** - Separate teacher (create/edit) and student (view) dashboards
- 🏷️ **Smart Categories** - Academic, Administrative, Placement, Sports, Benefits
- 📱 **Fully Responsive** - Mobile-first design that works everywhere
- ⚡ **Lightning Fast** - Optimized with Vite for instant hot reload
- 🔍 **Advanced Filtering** - Filter announcements by category with real-time updates
- 📎 **File Attachments** - Support for documents, images, and other files

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ 
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key ([Get free key](https://aistudio.google.com/app/apikey))

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/Inshorts.git
cd Inshorts

# Install all dependencies (root + server + client)
npm run install:all

# Configure environment variables (see below)

# Start the application
npm start
\`\`\`

The application will open at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5001

### Environment Setup

Create \`server/.env\` file:

\`\`\`env
# Database
MONGO_URI=your_mongodb_connection_string

# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=5001
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Optional: Image API
PEXELS_API_KEY=your_pexels_api_key
\`\`\`

## 👤 Default Login Credentials

**Teacher Account**
- Registration ID: \`teacher1\`
- Password: \`pass123\`

**Student Account**
- Registration ID: \`student1\`
- Password: \`pass123\`

> ⚠️ Change these credentials in production!

## 📁 Project Structure

\`\`\`
Inshorts/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── pages/            # Route components
│   │   ├── config/           # API endpoints
│   │   ├── App.jsx           # Main app with routing
│   │   └── main.jsx          # Entry point
│   └── package.json
│
├── server/                    # Express Backend
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic (AI)
│   ├── utils/                # Utilities
│   ├── middleware/           # Express middleware
│   ├── scripts/              # Utility scripts
│   ├── server.js             # Entry point
│   └── package.json
│
└── package.json              # Root scripts
\`\`\`

## 🔌 API Endpoints

### Authentication
\`\`\`http
POST /api/auth/login
Body: { regId: string, password: string }
Response: { token, user: { id, regId, role } }
\`\`\`

### Announcements
\`\`\`http
GET    /api/announcements              # Get all announcements
GET    /api/announcements?authorId=id  # Filter by author
POST   /api/announcements              # Create (Teacher only)
PUT    /api/announcements/:id          # Update (Teacher only)
DELETE /api/announcements/:id          # Delete (Teacher only)
\`\`\`

## 🎨 Tech Stack

**Frontend**
- React 19 with latest features
- Vite - Lightning-fast build tool
- Tailwind CSS v4 - Modern utility-first styling
- Framer Motion - Smooth animations
- React Router v7 - Client-side routing
- Axios - HTTP requests

**Backend**
- Node.js + Express 5
- MongoDB + Mongoose
- Google Gemini 2.0 - AI summarization
- bcryptjs - Password security
- Multer - File uploads

## 📝 How It Works

### Creating Announcements (Teachers)
1. Login with teacher credentials
2. Click "+ New Announcement"
3. Fill in title, description, select category
4. Add up to 3 tags for better image generation
5. Select target audience (Students/Faculty/Both)
6. AI generates a 60-word summary automatically
7. System selects a relevant image (Pexels/fallback)
8. Attach files if needed
9. Publish!

### Viewing Announcements (Students)
1. Login with student credentials
2. Browse beautiful announcement cards
3. Filter by categories (All, Academic, Placement, etc.)
4. Click "Read Full Announcement" for details
5. Download attachments if available

## 🛠️ Development

\`\`\`bash
# Run server only
cd server && npm run dev

# Run client only
cd client && npm run dev

# Run both (from root)
npm start
\`\`\`

## 🚀 Performance Optimizations

- ✅ MongoDB indexing on frequently queried fields
- ✅ Client-side filtering for instant category switches
- ✅ Optimized image loading
- ✅ Minimal bundle size with tree-shaking
- ✅ Production-ready error handling
- ✅ Secure password hashing
- ✅ Rate limiting on login endpoints

## �� Security Features

- Password hashing with bcryptjs
- Input sanitization to prevent XSS
- Rate limiting on authentication
- JWT token-based sessions
- CORS configuration
- Helmet.js security headers

## 📦 Deployment

### Backend (Node.js)
- Recommended: Railway, Render, Heroku
- Set environment variables
- Configure \`MONGO_URI\` to production database
- Set \`NODE_ENV=production\`

### Frontend (React)
- Recommended: Vercel, Netlify
- Update API base URL in \`client/src/config/api.js\`
- Build command: \`npm run build\`
- Output directory: \`client/dist\`

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent content generation
- Pexels for beautiful free stock photos
- The React and Vite communities
- Tailwind CSS for amazing styling utilities

---

**Made with ❤️ using MERN Stack**
