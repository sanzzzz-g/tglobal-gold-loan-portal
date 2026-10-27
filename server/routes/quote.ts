import { Router, type Request, type Response } from 'express';
import { calculateQuote, DEMO_GOLD_RATE_PER_GRAM } from '../services/calculationService.ts';
import { QuoteRequestSchema } from '../services/validationService.ts';
import type { PurityKarat, SchemeId } from '../types/index.ts';

export const quoteRouter = Router();

quoteRouter.post('/', (req: Request, res: Response) => {
  try {
    const parseResult = QuoteRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      res.status(400).json({
        error: firstIssue?.message || 'Invalid quote calculation parameters.',
        details: parseResult.error.format(),
      });
      return;
    }

    const { gross_weight, stone_weight, purity_karat, scheme_id } = parseResult.data;

    const breakdown = calculateQuote(
      gross_weight,
      stone_weight ?? 0,
      purity_karat as PurityKarat,
      scheme_id as SchemeId,
      DEMO_GOLD_RATE_PER_GRAM
    );

    res.json({
      success: true,
      quote: breakdown,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error calculating loan quote.';
    res.status(400).json({ error: message });
  }
});
