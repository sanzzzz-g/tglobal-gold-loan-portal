import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.ts';
import { DEMO_GOLD_RATE_PER_GRAM } from '../services/calculationService.ts';

export const schemesRouter = Router();

schemesRouter.get('/', (req: Request, res: Response) => {
  try {
    const schemes = db.prepare('SELECT * FROM loan_schemes WHERE active = 1 ORDER BY ltv_ratio DESC').all() as any[];

    const formatted = schemes.map((s) => ({
      ...s,
      key_terms: typeof s.key_terms === 'string' ? JSON.parse(s.key_terms) : s.key_terms,
      formatted_ltv: `${Math.round(s.ltv_ratio * 100)}%`,
      formatted_interest: `${s.interest_rate}% p.a.`,
    }));

    res.json({
      success: true,
      demonstration_gold_rate: DEMO_GOLD_RATE_PER_GRAM,
      schemes: formatted,
      disclaimer: 'Interest rates and gold rates displayed are demonstration values for technical evaluation.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve loan schemes.' });
  }
});
