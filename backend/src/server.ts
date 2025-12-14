import express from 'express';
import cors from 'cors';
import excavateRouter from './routes/excavate';
import eventsRouter from './routes/events';

const app = express();
const PORT = parseInt(process.env.PORT || '10000');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Code Archaeologist API',
    status: 'running',
    endpoints: {
      health: '/health',
      excavate: '/api/excavate',
      events: '/api/events/recent'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/excavate', excavateRouter);
app.use('/api/events', eventsRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Code Archaeologist API running on port ${PORT}`);
});
