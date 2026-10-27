import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.NODE_ENV === 'test'
  ? path.resolve(DB_DIR, 'test_gold_loan.sqlite')
  : path.resolve(DB_DIR, 'gold_loan.sqlite');

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  // 1. loan_schemes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loan_schemes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repayment_type TEXT NOT NULL,
      interest_rate REAL NOT NULL,
      ltv_ratio REAL NOT NULL,
      description TEXT NOT NULL,
      min_tenure_months INTEGER NOT NULL,
      max_tenure_months INTEGER NOT NULL,
      key_terms TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. applications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_reference TEXT UNIQUE NOT NULL,
      applicant_name TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      email TEXT,
      scheme_id TEXT NOT NULL REFERENCES loan_schemes(id),
      gross_weight REAL NOT NULL,
      stone_weight REAL NOT NULL,
      net_weight REAL NOT NULL,
      purity_karat INTEGER NOT NULL,
      gold_rate REAL NOT NULL,
      calculated_gold_value REAL NOT NULL,
      eligible_loan_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      consent_timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_applications_mobile_created ON applications(mobile_number, created_at);
    CREATE INDEX IF NOT EXISTS idx_applications_ref ON applications(application_reference);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_scheme ON applications(scheme_id);
  `);

  // 3. admin_users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // Ensure updated_at column exists for existing tables
  try {
    const tableInfo = db.pragma('table_info(admin_users)') as Array<{ name: string }>;
    if (!tableInfo.some((col) => col.name === 'updated_at')) {
      db.exec('ALTER TABLE admin_users ADD COLUMN updated_at TEXT;');
    }
  } catch {
    // Column already exists or handled by table creation
  }

  seedInitialData();
}

function seedInitialData(): void {
  const now = new Date().toISOString();

  // Seed loan schemes
  const insertScheme = db.prepare(`
    INSERT INTO loan_schemes (
      id, name, repayment_type, interest_rate, ltv_ratio, description,
      min_tenure_months, max_tenure_months, key_terms, active, created_at, updated_at
    ) VALUES (
      @id, @name, @repayment_type, @interest_rate, @ltv_ratio, @description,
      @min_tenure_months, @max_tenure_months, @key_terms, @active, @created_at, @updated_at
    ) ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      repayment_type = excluded.repayment_type,
      interest_rate = excluded.interest_rate,
      ltv_ratio = excluded.ltv_ratio,
      description = excluded.description,
      min_tenure_months = excluded.min_tenure_months,
      max_tenure_months = excluded.max_tenure_months,
      key_terms = excluded.key_terms,
      active = excluded.active,
      updated_at = excluded.updated_at
  `);

  const emiTerms = JSON.stringify([
    'Maximum Loan-to-Value (LTV) of 75%',
    'Fixed monthly principal and interest installments',
    'Part-payment permitted with no penalty charges',
    'Secure custodial locker storage at no additional fee',
    'Demonstration interest rate: 9.50% p.a.',
  ]);

  const bulletTerms = JSON.stringify([
    'Loan-to-Value (LTV) ratio of 70%',
    'Lumpsum repayment of principal and interest at tenure completion',
    'No monthly principal repayment burden',
    'Ideal for short-term working capital needs',
    'Demonstration interest rate: 10.25% p.a.',
  ]);

  const seedTransaction = db.transaction(() => {
    insertScheme.run({
      id: 'emi_plan',
      name: 'EMI Gold Advantage Plan',
      repayment_type: 'EMI',
      interest_rate: 9.5,
      ltv_ratio: 0.75,
      description: 'Equated Monthly Installment plan for systematic loan repayment with our highest loan-to-value ratio of 75%.',
      min_tenure_months: 3,
      max_tenure_months: 36,
      key_terms: emiTerms,
      active: 1,
      created_at: now,
      updated_at: now,
    });

    insertScheme.run({
      id: 'bullet_plan',
      name: 'Bullet Repayment Flexi Plan',
      repayment_type: 'Bullet',
      interest_rate: 10.25,
      ltv_ratio: 0.70,
      description: 'Flexible repayment structure where principal and interest can be settled at maturity. Designed for business cash-flow alignment.',
      min_tenure_months: 3,
      max_tenure_months: 12,
      key_terms: bulletTerms,
      active: 1,
      created_at: now,
      updated_at: now,
    });

    // Seed default admin user if not exists
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tglobal.com').toLowerCase().trim();
    const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;

    const checkAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(adminEmail);
    if (!checkAdmin) {
      if (!adminInitialPassword && process.env.NODE_ENV === 'production') {
        console.warn(
          '⚠️ [SECURITY NOTICE] No admin user exists and ADMIN_INITIAL_PASSWORD is not set in production. Admin provisioning required.'
        );
      } else {
        const passwordToUse = adminInitialPassword || 'Admin@123_ChangeMeInProd';
        const passwordHash = bcrypt.hashSync(passwordToUse, 12);
        db.prepare(`
          INSERT INTO admin_users (email, password_hash, name, role, created_at, updated_at)
          VALUES (?, ?, ?, 'admin', ?, ?)
        `).run(adminEmail, passwordHash, 'T Global Loan Officer', now, now);
      }
    }
  });

  seedTransaction();
}

// Auto-initialize schema on import
initDatabase();
