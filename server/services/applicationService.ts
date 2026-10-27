import { db } from '../db/database.ts';
import { calculateQuote, DEMO_GOLD_RATE_PER_GRAM } from './calculationService.ts';
import { normalizeIndianMobile, ApplicationSubmissionSchema } from './validationService.ts';
import type { ApplicationRecord, ApplicationSubmissionInput, ApplicationStatus, SchemeId } from '../types/index.ts';

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function generateApplicationReference(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `TG-GL-${year}${month}-${randomPart}`;
}

export function checkRecentApplication(mobileNumber: string, referenceDate: Date = new Date()): ApplicationRecord | null {
  const normalizedMobile = normalizeIndianMobile(mobileNumber);
  const cutoffTime = new Date(referenceDate.getTime() - SEVEN_DAYS_MS).toISOString();

  const stmt = db.prepare(`
    SELECT * FROM applications
    WHERE mobile_number = ? AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  return (stmt.get(normalizedMobile, cutoffTime) as ApplicationRecord) || null;
}

export function createApplication(input: ApplicationSubmissionInput): {
  application: ApplicationRecord;
  breakdown: ReturnType<typeof calculateQuote>;
} {
  // Validate schema first
  const parsed = ApplicationSubmissionSchema.parse(input);

  const normalizedMobile = parsed.mobile_number;
  const grossWeight = parsed.gross_weight;
  const stoneWeight = parsed.stone_weight ?? 0;
  const purityKarat = parsed.purity_karat;
  const schemeId = parsed.scheme_id as SchemeId;

  // Authoritative financial calculation
  const quote = calculateQuote(grossWeight, stoneWeight, purityKarat, schemeId, DEMO_GOLD_RATE_PER_GRAM);

  // Transaction for duplicate protection and atomic insertion
  const createTx = db.transaction(() => {
    const existingRecent = checkRecentApplication(normalizedMobile);
    if (existingRecent) {
      throw new ConflictError(
        'An application from this mobile number is already in progress within the last 7 days. Under T Global policy, repeat applications are permitted only after 7 days.'
      );
    }

    const now = new Date().toISOString();
    let applicationReference = generateApplicationReference();

    // Ensure reference uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const existingRef = db.prepare('SELECT id FROM applications WHERE application_reference = ?').get(applicationReference);
      if (!existingRef) break;
      applicationReference = generateApplicationReference();
      attempts++;
    }

    const insertStmt = db.prepare(`
      INSERT INTO applications (
        application_reference, applicant_name, mobile_number, email, scheme_id,
        gross_weight, stone_weight, net_weight, purity_karat, gold_rate,
        calculated_gold_value, eligible_loan_amount, status, consent_timestamp,
        created_at, updated_at
      ) VALUES (
        @application_reference, @applicant_name, @mobile_number, @email, @scheme_id,
        @gross_weight, @stone_weight, @net_weight, @purity_karat, @gold_rate,
        @calculated_gold_value, @eligible_loan_amount, @status, @consent_timestamp,
        @created_at, @updated_at
      )
    `);

    const result = insertStmt.run({
      application_reference: applicationReference,
      applicant_name: parsed.applicant_name,
      mobile_number: normalizedMobile,
      email: parsed.email || null,
      scheme_id: schemeId,
      gross_weight: quote.gross_weight,
      stone_weight: quote.stone_weight,
      net_weight: quote.net_weight,
      purity_karat: quote.purity_karat,
      gold_rate: quote.gold_rate_per_gram,
      calculated_gold_value: quote.purity_adjusted_gold_value,
      eligible_loan_amount: quote.eligible_loan_amount,
      status: 'Pending',
      consent_timestamp: now,
      created_at: now,
      updated_at: now,
    });

    const newRecord = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid) as ApplicationRecord;

    return {
      application: newRecord,
      breakdown: quote,
    };
  });

  return createTx();
}

export function getApplicationByReference(reference: string): ApplicationRecord | null {
  const stmt = db.prepare(`
    SELECT a.*, s.name as scheme_name, s.ltv_ratio
    FROM applications a
    LEFT JOIN loan_schemes s ON a.scheme_id = s.id
    WHERE a.application_reference = ?
  `);
  return (stmt.get(reference) as ApplicationRecord) || null;
}

export function listApplications(options: {
  status?: string;
  scheme_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'eligible_loan_amount' | 'applicant_name';
  sort_order?: 'ASC' | 'DESC';
}): {
  applications: ApplicationRecord[];
  total: number;
  page: number;
  total_pages: number;
  stats: {
    total: number;
    pending: number;
    under_review: number;
    approved: number;
    rejected: number;
    total_requested_amount: number;
  };
} {
  const {
    status,
    scheme_id,
    search,
    page = 1,
    limit = 10,
    sort_by = 'created_at',
    sort_order = 'DESC',
  } = options;

  const validSortColumns = ['created_at', 'eligible_loan_amount', 'applicant_name'];
  const column = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
  const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (status && status !== 'all') {
    whereClauses.push('a.status = ?');
    params.push(status);
  }

  if (scheme_id && scheme_id !== 'all') {
    whereClauses.push('a.scheme_id = ?');
    params.push(scheme_id);
  }

  if (search && search.trim() !== '') {
    whereClauses.push('(a.application_reference LIKE ? OR a.applicant_name LIKE ? OR a.mobile_number LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.join(' AND ');

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM applications a WHERE ${whereSql}`);
  const totalCount = (countStmt.get(...params) as { count: number }).count;

  const offset = (Math.max(1, page) - 1) * limit;

  const queryStmt = db.prepare(`
    SELECT a.*, s.name as scheme_name, s.ltv_ratio
    FROM applications a
    LEFT JOIN loan_schemes s ON a.scheme_id = s.id
    WHERE ${whereSql}
    ORDER BY a.${column} ${order}
    LIMIT ? OFFSET ?
  `);

  const rows = queryStmt.all(...params, limit, offset) as ApplicationRecord[];

  // Global status statistics
  const statsRows = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) as under_review,
      SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
      COALESCE(SUM(eligible_loan_amount), 0) as total_requested_amount
    FROM applications
  `).get() as {
    total: number;
    pending: number;
    under_review: number;
    approved: number;
    rejected: number;
    total_requested_amount: number;
  };

  return {
    applications: rows,
    total: totalCount,
    page: Math.max(1, page),
    total_pages: Math.ceil(totalCount / limit) || 1,
    stats: statsRows,
  };
}

export function updateApplicationStatus(
  id: number,
  newStatus: ApplicationStatus,
  remarks?: string
): ApplicationRecord {
  const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as ApplicationRecord | undefined;
  if (!existing) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  // Allowed transitions
  const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    'Pending': ['Under Review', 'Rejected'],
    'Under Review': ['Approved', 'Rejected', 'Pending'],
    'Approved': ['Under Review'], // restricted reassessment
    'Rejected': ['Under Review'], // restricted appeal
  };

  if (!allowedTransitions[existing.status]?.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition application status from '${existing.status}' to '${newStatus}'. Allowed next statuses: ${allowedTransitions[existing.status]?.join(', ') || 'None'}`
    );
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE applications
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, now, id);

  return db.prepare(`
    SELECT a.*, s.name as scheme_name, s.ltv_ratio
    FROM applications a
    LEFT JOIN loan_schemes s ON a.scheme_id = s.id
    WHERE a.id = ?
  `).get(id) as ApplicationRecord;
}
