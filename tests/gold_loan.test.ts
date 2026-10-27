import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/app.ts';
import { db } from '../server/db/database.ts';
import { calculateQuote } from '../server/services/calculationService.ts';
import { normalizeIndianMobile, maskMobileNumber } from '../server/services/validationService.ts';
import { createApplication, checkRecentApplication } from '../server/services/applicationService.ts';
import {
  executeGetLoanSchemes,
  executeCalculateLoanQuote,
  executeSubmitLoanApplication,
  handleOfflineAssistantResponse,
} from '../server/services/aiService.ts';

describe('1. Financial Calculation Engine', () => {
  it('Case 1: 45 g net gold, 22K, EMI Plan (75% LTV) -> ₹2,16,563', () => {
    const quote = calculateQuote(45, 0, 22, 'emi_plan', 7000);
    expect(quote.net_weight).toBe(45);
    expect(quote.purity_karat).toBe(22);
    expect(quote.purity_adjusted_gold_value).toBe(288750);
    expect(quote.eligible_loan_amount_raw).toBe(216562.5);
    expect(quote.eligible_loan_amount).toBe(216563);
    expect(quote.formatted_loan_amount).toBe('₹2,16,563');
  });

  it('Case 2: 45 g net gold, 22K, Bullet Plan (70% LTV) -> ₹2,02,125', () => {
    const quote = calculateQuote(45, 0, 22, 'bullet_plan', 7000);
    expect(quote.net_weight).toBe(45);
    expect(quote.purity_karat).toBe(22);
    expect(quote.purity_adjusted_gold_value).toBe(288750);
    expect(quote.eligible_loan_amount_raw).toBe(202125);
    expect(quote.eligible_loan_amount).toBe(202125);
    expect(quote.formatted_loan_amount).toBe('₹2,02,125');
  });

  it('Case 3: 10 g net gold, 18K, EMI Plan (75% LTV) -> ₹39,375', () => {
    const quote = calculateQuote(10, 0, 18, 'emi_plan', 7000);
    expect(quote.net_weight).toBe(10);
    expect(quote.purity_karat).toBe(18);
    expect(quote.purity_adjusted_gold_value).toBe(52500);
    expect(quote.eligible_loan_amount_raw).toBe(39375);
    expect(quote.eligible_loan_amount).toBe(39375);
    expect(quote.formatted_loan_amount).toBe('₹39,375');
  });

  it('Case 4: Gross weight equal to stone weight must be rejected', () => {
    expect(() => calculateQuote(20, 20, 22, 'emi_plan')).toThrow(
      /Stone weight.*must be strictly less than gross weight/
    );
  });

  it('Case 5: Stone weight greater than gross weight must be rejected', () => {
    expect(() => calculateQuote(15, 25, 22, 'emi_plan')).toThrow(
      /Stone weight.*must be strictly less than gross weight/
    );
  });

  it('Case 6: Unsupported purity (e.g. 14K, 20K) must be rejected', () => {
    expect(() => calculateQuote(10, 0, 14 as any, 'emi_plan')).toThrow(
      /Unsupported gold purity/
    );
  });

  it('Case 7: Unsupported scheme ID must be rejected', () => {
    expect(() => calculateQuote(10, 0, 22, 'unknown_scheme' as any)).toThrow(
      /Unsupported scheme ID/
    );
  });

  it('Case 8: Negative or invalid numerical inputs must be rejected', () => {
    expect(() => calculateQuote(-5, 0, 22, 'emi_plan')).toThrow(
      /Gross weight must be strictly greater than 0/
    );
    expect(() => calculateQuote(10, -2, 22, 'emi_plan')).toThrow(
      /Stone.*weight cannot be negative/
    );
  });

  it('Case 9: Rounding behavior rounds to nearest rupee', () => {
    const quote = calculateQuote(17, 0, 22, 'emi_plan', 7000);
    expect(quote.eligible_loan_amount_raw).toBe(81812.5);
    expect(quote.eligible_loan_amount).toBe(81813);
  });
});

describe('2. Validation & Mobile Normalization', () => {
  it('Normalizes standard 10-digit, +91, 0, and punctuated Indian mobile numbers', () => {
    expect(normalizeIndianMobile('9876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('+919876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('+91 98765-43210')).toBe('9876543210');
    expect(normalizeIndianMobile('(98765) 43210')).toBe('9876543210');
  });

  it('Rejects invalid mobile numbers', () => {
    expect(() => normalizeIndianMobile('1234567890')).toThrow(/valid 10-digit Indian mobile/);
    expect(() => normalizeIndianMobile('98765')).toThrow(/valid 10-digit Indian mobile/);
    expect(() => normalizeIndianMobile('abcdefghij')).toThrow(/valid 10-digit Indian mobile/);
  });

  it('Masks mobile numbers appropriately for administrative list views', () => {
    expect(maskMobileNumber('9876543210')).toBe('+91 98*** **210');
  });
});

describe('3. Application Submissions & 7-Day Duplicate Rule', () => {
  const testMobile = '9812345670';

  it('Case 10 & 15: Valid application creation succeeds and starts in Pending status', async () => {
    db.prepare('DELETE FROM applications WHERE mobile_number = ?').run(testMobile);

    const res = await request(app)
      .post('/api/applications')
      .send({
        applicant_name: 'Rajesh Sharma',
        mobile_number: '+91 98123-45670',
        email: 'rajesh.sharma@example.com',
        gross_weight: 45,
        stone_weight: 0,
        purity_karat: 22,
        scheme_id: 'emi_plan',
        consent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('Pending');
    expect(res.body.application.eligible_loan_amount).toBe(216563);
    expect(res.body.application.application_reference).toMatch(/^TG-GL-\d{6}-\d{4}$/);
  });

  it('Case 11: Missing required fields is rejected with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        applicant_name: 'Rajesh Sharma',
        consent: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('Case 12: Invalid mobile number is rejected with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        applicant_name: 'Rajesh Sharma',
        mobile_number: '12345',
        gross_weight: 30,
        purity_karat: 22,
        scheme_id: 'emi_plan',
        consent: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid 10-digit Indian mobile/);
  });

  it('Case 13: Duplicate application from same mobile within 7 days is rejected with HTTP 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        applicant_name: 'Rajesh Sharma',
        mobile_number: '9812345670',
        gross_weight: 20,
        stone_weight: 0,
        purity_karat: 22,
        scheme_id: 'bullet_plan',
        consent: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_APPLICATION_WINDOW');
    expect(res.body.error).toMatch(/within the last 7 days/);
  });

  it('Case 14: Repeat application after 7 days is permitted', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE applications SET created_at = ? WHERE mobile_number = ?').run(eightDaysAgo, testMobile);

    const check = checkRecentApplication(testMobile);
    expect(check).toBeNull();

    const result = createApplication({
      applicant_name: 'Rajesh Sharma',
      mobile_number: testMobile,
      gross_weight: 15,
      stone_weight: 0,
      purity_karat: 24,
      scheme_id: 'emi_plan',
      consent: true,
    });

    expect(result.application.id).toBeDefined();
    expect(result.application.status).toBe('Pending');
  });

  it('Case 16: Submitted loan amount from client cannot override backend authoritative calculation', async () => {
    const newMobile = '9870001122';
    db.prepare('DELETE FROM applications WHERE mobile_number = ?').run(newMobile);

    const res = await request(app)
      .post('/api/applications')
      .send({
        applicant_name: 'Anita Verma',
        mobile_number: newMobile,
        gross_weight: 10,
        stone_weight: 0,
        purity_karat: 18,
        scheme_id: 'emi_plan',
        eligible_loan_amount: 9999999,
        calculated_gold_value: 8888888,
        consent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.application.eligible_loan_amount).toBe(39375);
    expect(res.body.quote_breakdown.eligible_loan_amount).toBe(39375);
  });
});

describe('4. AI Agent Real Tools & Confirmation Safeguard', () => {
  it('Case 18: Scheme lookup invokes real database-backed schemes tool', () => {
    const toolResult = executeGetLoanSchemes();
    expect(toolResult.schemes).toHaveLength(2);
    expect(toolResult.schemes[0].name).toBe('EMI Gold Advantage Plan');
    expect(toolResult.schemes[0].ltv_ratio_percent).toBe('75%');
    expect(toolResult.schemes[1].name).toBe('Bullet Repayment Flexi Plan');
    expect(toolResult.schemes[1].ltv_ratio_percent).toBe('70%');
  });

  it('Case 19: Quote request invokes authoritative calculation service', () => {
    const toolQuote = executeCalculateLoanQuote({
      gross_weight: 45,
      stone_weight: 0,
      purity_karat: 22,
      scheme_id: 'emi_plan',
    });

    expect(toolQuote.eligible_loan_amount).toBe('₹2,16,563');
    expect(toolQuote.eligible_loan_amount_number).toBe(216563);
    expect(toolQuote.purity_adjusted_gold_value).toBe('₹2,88,750');
  });

  it('Case 17 & 21: Application submission tool requires explicit customer confirmation', () => {
    // 1. Without confirmation: rejected
    const unconfirmed = executeSubmitLoanApplication({
      applicant_name: 'Ramesh Patel',
      mobile_number: '9899112233',
      gross_weight: 30,
      stone_weight: 0,
      purity_karat: 22,
      scheme_id: 'emi_plan',
      customer_confirmed_explicitly: false,
    });

    expect(unconfirmed.status).toBe('REQUIRES_EXPLICIT_CONFIRMATION');
    expect(unconfirmed.message).toContain('Security checkpoint: Application NOT submitted');

    // 2. With explicit confirmation: succeeds
    db.prepare('DELETE FROM applications WHERE mobile_number = ?').run('9899112233');

    const confirmed = executeSubmitLoanApplication({
      applicant_name: 'Ramesh Patel',
      mobile_number: '9899112233',
      gross_weight: 30,
      stone_weight: 0,
      purity_karat: 22,
      scheme_id: 'emi_plan',
      customer_confirmed_explicitly: true,
    });

    expect(confirmed.status).toBe('SUCCESS');
    expect(confirmed.application_reference).toMatch(/^TG-GL-\d{6}-\d{4}$/);
  });

  it('Case 20: Submission tool validates duplicate rules', () => {
    // Attempting repeat submission immediately
    const duplicate = executeSubmitLoanApplication({
      applicant_name: 'Ramesh Patel',
      mobile_number: '9899112233',
      gross_weight: 30,
      stone_weight: 0,
      purity_karat: 22,
      scheme_id: 'emi_plan',
      customer_confirmed_explicitly: true,
    });

    expect(duplicate.status).toBe('ERROR');
    expect(duplicate.error).toMatch(/within the last 7 days/);
  });

  it('Case 22: Model/API errors or questions handled gracefully with structured response', () => {
    const res = handleOfflineAssistantResponse('Explain the difference between the available repayment plans.');
    expect(res.reply).toContain('EMI Plan');
    expect(res.reply).toContain('Bullet Plan');
  });
});

describe('5. Admin Operations & Authentication', () => {
  let adminToken = '';

  it('Case 23: Unauthenticated admin requests are rejected with HTTP 401', async () => {
    const res = await request(app).get('/api/admin/applications');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('Case 24: Authenticated admin can log in and retrieve application records', async () => {
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@tglobal.com',
        password: 'Admin@123_ChangeMeInProd',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    adminToken = loginRes.body.token;

    const listRes = await request(app)
      .get('/api/admin/applications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.applications).toBeInstanceOf(Array);
    expect(listRes.body.stats).toBeDefined();

    if (listRes.body.applications.length > 0) {
      expect(listRes.body.applications[0].mobile_number).toMatch(/^\+91 \d{2}\*\*\* \*\*\d{3}$/);
    }
  });

  it('Case 25: Unauthorized users cannot update application status', async () => {
    const res = await request(app)
      .patch('/api/admin/applications/1/status')
      .send({ status: 'Under Review' });

    expect(res.status).toBe(401);
  });

  it('Case 26: Invalid status updates are rejected', async () => {
    const firstApp = db.prepare('SELECT id, status FROM applications LIMIT 1').get() as any;
    if (firstApp) {
      const res = await request(app)
        .patch(`/api/admin/applications/${firstApp.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'InvalidStatus' });

      expect(res.status).toBe(400);
    }
  });
});

describe('6. AI Chat API Endpoint Integration', () => {
  it('POST /api/ai/chat handles loan questions and calls tools', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        prompt: 'What are the available loan schemes and what is the difference between EMI and Bullet?',
        messages: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toBeDefined();
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(20);
  }, 20000);

  it('POST /api/ai/chat rejects empty prompt with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({
        prompt: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('7. Admin Password Management & Security', () => {
  let activeToken = '';
  const initialPassword = 'Admin@123_ChangeMeInProd';
  const newStrongPassword = 'NewSecurePassword2026!#';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@tglobal.com',
        password: initialPassword,
      });

    if (loginRes.status === 200 && loginRes.body.token) {
      activeToken = loginRes.body.token;
    } else {
      // If password was already rotated in a previous run, log in with new password
      const retryLogin = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@tglobal.com',
          password: newStrongPassword,
        });
      activeToken = retryLogin.body.token;
    }
  });

  it('Case 27: Unauthenticated request to /api/admin/change-password is rejected with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/admin/change-password')
      .send({
        current_password: initialPassword,
        new_password: newStrongPassword,
        confirm_password: newStrongPassword,
      });

    expect(res.status).toBe(401);
  });

  it('Case 28: Reject weak password with fewer than 12 characters with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/admin/change-password')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        current_password: initialPassword,
        new_password: 'Short123!',
        confirm_password: 'Short123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 12 characters/i);
  });

  it('Case 29: Reject password change when new password and confirm password do not match', async () => {
    const res = await request(app)
      .post('/api/admin/change-password')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        current_password: initialPassword,
        new_password: newStrongPassword,
        confirm_password: 'MismatchedPassword2026!#',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/do not match/i);
  });

  it('Case 30: Reject password change with incorrect current password', async () => {
    const res = await request(app)
      .post('/api/admin/change-password')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        current_password: 'WrongCurrentPassword999!',
        new_password: newStrongPassword,
        confirm_password: newStrongPassword,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect current password/i);
  });

  it('Case 31: Successfully change password with valid credentials and strong password', async () => {
    const res = await request(app)
      .post('/api/admin/change-password')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({
        current_password: initialPassword,
        new_password: newStrongPassword,
        confirm_password: newStrongPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/changed successfully/i);
  });

  it('Case 32: Immediate invalidation of old password and authentication succeeds with new password', async () => {
    // 1. Old password must immediately fail with HTTP 401
    const oldLoginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@tglobal.com',
        password: initialPassword,
      });

    expect(oldLoginRes.status).toBe(401);
    expect(oldLoginRes.body.token).toBeUndefined();

    // 2. New password immediately succeeds with HTTP 200 and issues valid JWT
    const newLoginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@tglobal.com',
        password: newStrongPassword,
      });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.token).toBeDefined();
    expect(newLoginRes.body.user).toBeDefined();
    expect(newLoginRes.body.user.email).toBe('admin@tglobal.com');

    // 3. Reset back to initial password for subsequent test idempotency
    const resetRes = await request(app)
      .post('/api/admin/change-password')
      .set('Authorization', `Bearer ${newLoginRes.body.token}`)
      .send({
        current_password: newStrongPassword,
        new_password: initialPassword,
        confirm_password: initialPassword,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
  });
});

