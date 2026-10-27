import { Router, type Request, type Response } from 'express';
import { createApplication, getApplicationByReference, ConflictError } from '../services/applicationService.ts';
import { ApplicationSubmissionSchema } from '../services/validationService.ts';

export const applicationsRouter = Router();

// Customer submits new application
applicationsRouter.post('/', (req: Request, res: Response) => {
  try {
    const parseResult = ApplicationSubmissionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      res.status(400).json({
        error: firstIssue?.message || 'Invalid application submission details.',
        details: parseResult.error.format(),
      });
      return;
    }

    const { application, breakdown } = createApplication({
      ...parseResult.data,
      consent: true,
    });

    res.status(201).json({
      success: true,
      message: 'Gold loan application submitted successfully.',
      application: {
        application_reference: application.application_reference,
        applicant_name: application.applicant_name,
        scheme_id: application.scheme_id,
        net_weight: application.net_weight,
        purity_karat: application.purity_karat,
        eligible_loan_amount: application.eligible_loan_amount,
        status: application.status,
        created_at: application.created_at,
      },
      quote_breakdown: breakdown,
    });
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        error: error.message,
        code: 'DUPLICATE_APPLICATION_WINDOW',
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to submit application.';
    res.status(400).json({ error: message });
  }
});

// Customer tracking their own application by reference
applicationsRouter.get('/:reference', (req: Request, res: Response) => {
  try {
    const reference = req.params.reference;
    const application = getApplicationByReference(reference);

    if (!application) {
      res.status(404).json({ error: 'Application reference not found.' });
      return;
    }

    res.json({
      success: true,
      application: {
        application_reference: application.application_reference,
        applicant_name: application.applicant_name,
        scheme_name: application.scheme_name,
        net_weight: application.net_weight,
        purity_karat: application.purity_karat,
        eligible_loan_amount: application.eligible_loan_amount,
        status: application.status,
        created_at: application.created_at,
        updated_at: application.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to look up application.' });
  }
});
