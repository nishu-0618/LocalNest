// server.js
// This is the heart of the app — it starts the server

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load .env variables FIRST before anything else
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());              // Allow cross-origin requests (for frontend later)
app.use(express.json());      // Parse incoming JSON request bodies

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/listings',     require('./routes/listings'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/needs',        require('./routes/needs'));
app.use('/api/notifications',require('./routes/notifications'));

// Health check — visit this URL to confirm server is running
app.get('/', (req, res) => {
  res.json({ message: '🏠 LocalNest API is running!' });
});

// ── Error Handler (always last) ─────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});