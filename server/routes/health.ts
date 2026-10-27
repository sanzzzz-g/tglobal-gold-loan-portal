import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.ts';
import { DEMO_GOLD_RATE_PER_GRAM } from '../services/calculationService.ts';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as alive').get() as { alive: number };
    const schemesCount = db.prepare('SELECT COUNT(*) as count FROM loan_schemes').get() as { count: number };
    const applicationsCount = db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number };

    res.json({
      status: 'ok',
      service: 'T Global Gold Loan Portal API',
      version: '1.0.0',
      database: dbCheck.alive === 1 ? 'connected' : 'unhealthy',
      demo_gold_rate_inr: DEMO_GOLD_RATE_PER_GRAM,
      statistics: {
        active_schemes: schemesCount.count,
        total_applications: applicationsCount.count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});
