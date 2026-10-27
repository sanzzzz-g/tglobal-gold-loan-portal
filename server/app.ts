import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.ts';
import { schemesRouter } from './routes/schemes.ts';
import { quoteRouter } from './routes/quote.ts';
import { applicationsRouter } from './routes/applications.ts';
import { adminRouter } from './routes/admin.ts';
import { aiRouter } from './routes/ai.ts';

export const app = express();

// Security and parser middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/schemes', schemesRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

// Centralized 404 handler for unknown API routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling middleware
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const statusCode = (err as any)?.statusCode || (err as any)?.status || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'An unexpected server error occurred. Please try again later.' : message,
    timestamp: new Date().toISOString(),
  });
});
