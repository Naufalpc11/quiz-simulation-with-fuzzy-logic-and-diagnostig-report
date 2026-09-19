import { supabase, supabaseAdmin } from './config/db.js';
import authRoute from './routes/authRoute.js';
import accountRoute from './routes/accountRoute.js';
import topikRoute from './routes/topikRoute.js';
import kuisRoute from './routes/kuisRoute.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/', accountRoute);
app.use('/api/topik', topikRoute);
app.use('/api/kuis', kuisRoute);
app.use('/api/account', accountRoute);

app.get('/health', async (_, res) => {
  try {
    // pakai `supabase` (anon key) untuk health check publik — bukan supabaseAdmin
    const { error } = await supabase.from('user').select('id').limit(1);

    if (error) throw error;

    res.status(200).json({
      status: 'ok',
      message: 'Server dan database berjalan normal.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Server hidup, tetapi koneksi database bermasalah.',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message }),
    });
  }
});

const PORT = process.env.PORT || 3000;
const NETWORK_IP = '192.168.100.56';

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server RivNet Backend berjalan di:');
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network/HP: http://${NETWORK_IP}:${PORT}`);
});