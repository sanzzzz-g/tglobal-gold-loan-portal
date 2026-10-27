import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { processAIChat } from '../services/aiService.ts';

export const aiRouter = Router();

const AIChatRequestSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'system']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const parseResult = AIChatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Invalid chat payload',
      });
      return;
    }

    const { prompt, messages } = parseResult.data;
    const response = await processAIChat(messages, prompt);

    res.json({
      success: true,
      ...response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI assistant error';
    res.status(500).json({ error: message });
  }
});
