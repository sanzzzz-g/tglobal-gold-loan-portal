import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/database.ts';
import { requireAdminAuth, JWT_SECRET, type AuthenticatedRequest } from '../middleware/auth.ts';
import { listApplications, updateApplicationStatus, NotFoundError, ValidationError } from '../services/applicationService.ts';
import { maskMobileNumber, StatusUpdateSchema } from '../services/validationService.ts';
import type { ApplicationStatus } from '../types/index.ts';

export const adminRouter = Router();

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Admin login
adminRouter.post('/login', (req: Request, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid credentials input' });
      return;
    }

    const { email, password } = parseResult.data;
    const adminUser = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email.toLowerCase().trim()) as any;

    if (!adminUser) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordMatches = bcrypt.compareSync(password, adminUser.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed due to server error.' });
  }
});

// Admin verify session
adminRouter.get('/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(12, 'New password must be at least 12 characters long'),
    confirm_password: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New password and confirm password do not match',
    path: ['confirm_password'],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: 'New password must be different from current password',
    path: ['new_password'],
  });

// Admin change password
adminRouter.post('/change-password', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = ChangePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Invalid password parameters.',
      });
      return;
    }

    const { current_password, new_password } = parseResult.data;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized session.' });
      return;
    }

    const adminUser = db.prepare('SELECT id, password_hash FROM admin_users WHERE id = ?').get(userId) as any;
    if (!adminUser) {
      res.status(404).json({ error: 'Admin user not found.' });
      return;
    }

    const matches = bcrypt.compareSync(current_password, adminUser.password_hash);
    if (!matches) {
      res.status(400).json({ error: 'Incorrect current password. Please check your credentials.' });
      return;
    }

    // Hash new password securely with bcrypt (12 rounds)
    const newHash = bcrypt.hashSync(new_password, 12);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(newHash, now, userId);

    res.json({
      success: true,
      message: 'Admin password changed successfully. The new password is now active.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password due to server error.' });
  }
});

// List applications with masked phone numbers for list view
adminRouter.get('/applications', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const scheme_id = req.query.scheme_id as string;
    const search = req.query.search as string;
    const sort_by = (req.query.sort_by as any) || 'created_at';
    const sort_order = (req.query.sort_order as any) || 'DESC';

    const result = listApplications({
      page,
      limit,
      status,
      scheme_id,
      search,
      sort_by,
      sort_order,
    });

    // Mask mobile numbers in administrative list view for privacy
    const maskedApplications = result.applications.map((app) => ({
      ...app,
      mobile_number: maskMobileNumber(app.mobile_number),
    }));

    res.json({
      success: true,
      applications: maskedApplications,
      total: result.total,
      page: result.page,
      total_pages: result.total_pages,
      stats: result.stats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
});

// Get single application detail - unmasked for authorized admin verification
adminRouter.get('/applications/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid application ID.' });
      return;
    }

    const application = db.prepare(`
      SELECT a.*, s.name as scheme_name, s.ltv_ratio, s.repayment_type, s.interest_rate
      FROM applications a
      LEFT JOIN loan_schemes s ON a.scheme_id = s.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    res.json({
      success: true,
      application,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve application details.' });
  }
});

// Update application status
adminRouter.patch('/applications/:id/status', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid application ID.' });
      return;
    }

    const parseResult = StatusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Invalid status update parameters.',
      });
      return;
    }

    const updated = updateApplicationStatus(id, parseResult.data.status as ApplicationStatus, parseResult.data.remarks);

    res.json({
      success: true,
      message: `Application status successfully updated to '${updated.status}'.`,
      application: updated,
    });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update application status.';
    res.status(500).json({ error: message });
  }
});
