import express from 'express';
import cors from 'cors';
import { extractUserContext } from './middleware/auth.mjs';
import employeesRouter from './routes/employees.mjs';
import shiftsRouter from './routes/shifts.mjs';
import attendanceRouter from './routes/attendance.mjs';
import leavesRouter from './routes/leaves.mjs';
import payrollRouter from './routes/payroll.mjs';
import credentialsRouter from './routes/credentials.mjs';
import reportsRouter from './routes/reports.mjs';
import eventsRouter from './routes/events.mjs';
import { testConnection } from './db/index.mjs';

const app = express();
const PORT = parseInt(process.env.PORT || '8010', 10);

app.use(cors({
  origin: ['http://localhost:8443', 'http://localhost:5173', 'http://127.0.0.1:8443', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());
app.use(extractUserContext);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbInfo = await testConnection();
    res.json({
      status: 'healthy',
      service: 'HospAI Enterprise HRMS Gateway',
      version: '1.0.0',
      database: dbInfo,
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// HRMS Module Routes
app.use('/api/hr', employeesRouter);
app.use('/api/hr', shiftsRouter);
app.use('/api/hr', attendanceRouter);
app.use('/api/hr', leavesRouter);
app.use('/api/hr', payrollRouter);
app.use('/api/hr', credentialsRouter);
app.use('/api/hr', reportsRouter);
app.use('/api/hr', eventsRouter);

// Fallback 404 for unrecognized HR routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/hr')) {
    return res.status(404).json({ error: `HR API endpoint ${req.method} ${req.originalUrl} not found` });
  }
  next();
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HospAI HRMS Backend] Running on http://localhost:${PORT}`);
    console.log(`[HospAI HRMS Backend] Connected to PostgreSQL on port 5434`);
  });
}

export default app;
