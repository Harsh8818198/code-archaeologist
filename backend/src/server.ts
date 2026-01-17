import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import excavateRouter from './routes/excavate.js';
import eventsRouter from './routes/events.js';
import jobsRouter from './routes/jobs.js';
import kestraRouter from './routes/kestra.js';
import { supabase } from './lib/supabase.js';
import { getKestraClient } from './lib/kestra-client.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  if (!req.path.includes('health')) console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/excavate', excavateRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/kestra', kestraRouter);

app.get('/health', async (req, res) => {
  const storageOk = supabase ? 'supabase' : 'memory';
  const kestraOk = await getKestraClient().isAvailable() ? 'available' : 'unavailable';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: storageOk,
    kestra: kestraOk,
    version: '1.2.0'
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(50));
  console.log('🏛️  CODE ARCHAEOLOGIST BACKEND');
  console.log('='.repeat(50));
  console.log(`📡 API: http://localhost:${PORT}`);
  console.log(`💾 Storage: ${supabase ? 'Supabase' : 'Memory'}`);
  const kestra = await getKestraClient().isAvailable();
  console.log(`🎛️  Kestra: ${kestra ? 'Connected' : 'Unavailable'}`);
  console.log('='.repeat(50) + '\n');
});
