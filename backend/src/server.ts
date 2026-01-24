import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import excavateRoute from './routes/excavate.js';
import searchRoute from './routes/search.js';
import analyticsRoute from './routes/analytics.js';
import chatRoute from './routes/chat.js';
import { supabase } from './lib/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/excavate', excavateRoute);
app.use('/api/search', searchRoute);
app.use('/api/analytics', analyticsRoute);
app.use('/api/chat', chatRoute);

// Start server
app.listen(PORT, () => {
  console.log(`
==================================================
🏛️  CODE ARCHAEOLOGIST BACKEND
==================================================
📡 API: http://localhost:${PORT}
💾 Storage: ${supabase ? 'Supabase' : 'Memory'}
🔍 Search: Enabled
🤖 AI Router: Oumi → Gemini
💬 Chat: Context-aware
📊 Analytics: Enabled
==================================================
  `);
});
