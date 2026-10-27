# T Global Gold Loan Portal - Architectural Documentation (ARCHITECTURE.md)

This document outlines the system architecture, component relationships, data models, security boundaries, and execution flows of the **T Global Gold Loan Portal**.

---

## 1. System Overview & Component Diagram

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER (React 19)                            |
|                                                                                         |
|  +-------------------+  +-----------------------+  +---------------------------------+  |
|  |  Home & Overview  |  |  Scheme Catalog & Cmp |  |  Valuation Calculator (Presets) |  |
|  +-------------------+  +-----------------------+  +---------------------------------+  |
|                                                                                         |
|  +-----------------------------+  +----------------------------+  +------------------+  |
|  | 3-Step Application Wizard   |  | AI Loan Assistant (Chat)   |  | Admin Dashboard  |  |
|  | (Gold -> Personal -> Review)|  | (Streaming/Tool Execution) |  | (Masked / Filter)|  |
|  +-----------------------------+  +----------------------------+  +------------------+  |
+--------------------------------------------|--------------------------------------------+
                                             | HTTP / REST (JSON)
                                             v
+-----------------------------------------------------------------------------------------+
|                                  EXPRESS 4 BACKEND API                                  |
|                                                                                         |
|  [Middleware]: JSON Parser, CORS, Request Logger, Error Handler, JWT Auth Middleware   |
|                                                                                         |
|  +-----------------------+   +------------------------+   +--------------------------+  |
|  | /api/schemes          |   | /api/quote/calculate   |   | /api/applications        |  |
|  | - List loan schemes   |   | - Authoritative quote  |   | - 3-step submission      |  |
|  | - Interest & LTV meta |   | - Pure financial math  |   | - 7-day duplicate guard  |  |
|  +-----------------------+   +------------------------+   +--------------------------+  |
|                                                                                         |
|  +-----------------------+   +-------------------------------------------------------+  |
|  | /api/admin/*          |   | /api/ai/chat (Gemini 2.5 Flash Agent)                 |  |
|  | - JWT Login           |   | - get_loan_schemes                                    |  |
|  | - Filtered search     |   | - calculate_loan_quote                                |  |
|  | - Status transitions  |   | - submit_loan_application (User Confirmation Guard)   |  |
|  +-----------------------+   +-------------------------------------------------------+  |
+--------------------------------------------|--------------------------------------------+
                                             | Parameterized SQL
                                             v
+-----------------------------------------------------------------------------------------+
|                               SQLITE PERSISTENCE LAYER                                  |
|                                                                                         |
|  Database: `data/gold_loan.sqlite`  |  Journal Mode: WAL (Write-Ahead Logging)          |
|                                                                                         |
|  +-------------------+   +---------------------------+   +---------------------------+  |
|  | `loan_schemes`    |   | `applications`            |   | `admin_users`             |  |
|  | - Scheme ID (PK)  |   | - Reference No (Unique)   |   | - Email (Unique)          |  |
|  | - Interest, LTV   |   | - Applicant info          |   | - Argon2/Bcrypt hash      |  |
|  | - Tenure, Terms   |   | - Weights, Purity, Quote  |   | - Role & permissions      |  |
|  +-------------------+   +---------------------------+   +---------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Request Lifecycles & Execution Flows

### 2.1 Authoritative Gold Valuation Flow
```
User selects inputs (Gross: 20g, Stone: 2g, Purity: 22K, Scheme: EMI Plan)
                              │
                              ▼
        POST /api/quote/calculate with payload
                              │
                              ▼
            Zod Validation (`QuoteCalculationSchema`)
                              │
                              ▼
            Calculation Service (`calculateLoanQuote`):
            1. Net Weight = 20 - 2 = 18.0g
            2. Purity Ratio = 22 / 24 = 0.9166666666666666
            3. Purity-Adjusted Value = round(18.0 * 7000 * (22/24)) = ₹1,15,500
            4. Max Loan = round(1,15,500 * 0.75) = ₹86,625
                              │
                              ▼
        Returns JSON with exact values and visual breakdown steps
                              │
                              ▼
         Frontend displays interactive quote card and charts
```

### 2.2 Customer 3-Step Loan Application Flow
1. **Step 1: Gold Details & Scheme**
   - Inputs gross weight, stone weight, and karat.
   - Fetches authoritative quote from backend.
2. **Step 2: Applicant Information**
   - Applicant full name, Indian mobile number, and email.
   - Mandatory consent checkbox.
3. **Step 3: Review & Submit**
   - Summary of entered gold weights, calculated valuations, scheme terms, and applicant details.
   - User clicks **"Confirm & Submit Application"**.
   - **Backend Processing**:
     - Normalizes mobile number to `+91XXXXXXXXXX`.
     - Validates net weight $\ge 0.5\text{g}$ and stone weight $<$ gross weight.
     - Performs duplicate check: queries SQLite for existing application with same mobile created within past 7 days (`datetime('now', '-7 days')`).
     - If duplicate exists: returns HTTP `409 Conflict` with message and existing reference code.
     - If clear: recomputes authoritative quote, generates unique reference code `TG-GL-YYYYMM-XXXX`, inserts record with status `submitted`.
     - Returns HTTP `201 Created` with reference ID.
4. **Success Screen**:
   - Reference ID display, copy button, next steps timeline, and home navigation.

### 2.3 Gemini AI Loan Agent Tool-Calling Flow
```
Customer: "I have 20 grams of 22K gold ornaments with 2g stones. What can I get?"
                              │
                              ▼
        POST /api/ai/chat with conversation history
                              │
                              ▼
        Gemini 2.5 Flash analyzes prompt and tools:
        Tool Call 1: `calculate_loan_quote({
          grossWeight: 20,
          stoneWeight: 2,
          purityKarat: 22,
          schemeId: 'emi_plan'
        })`
                              │
                              ▼
        Backend executes local calculation service:
        Returns: { netWeight: 18, purityAdjustedValue: 115500, maxEligibleLoan: 86625 }
                              │
                              ▼
        AI receives tool result, generates customer reply:
        "Based on our current rate of ₹7,000/g, your 18g net 22K gold is valued
        at ₹1,15,500. Under our EMI Plan (75% LTV), you are eligible for up to
        ₹86,625 at 9.5% p.a.
        
        Would you like me to submit a loan application for you?"
                              │
             (Customer explicitly confirms: "Yes please, submit it")
                              │
                              ▼
        Tool Call 2: `submit_loan_application({
          applicantName: '...',
          mobileNumber: '...',
          grossWeight: 20,
          stoneWeight: 2,
          purityKarat: 22,
          schemeId: 'emi_plan',
          consentGiven: true
        })`
                              │
                              ▼
        Backend creates application in SQLite and returns reference code:
        AI outputs final confirmation with reference number: TG-GL-202610-0042.
```

### 2.4 Administrative Review & Audit Flow
1. **Authentication**:
   - Admin submits credentials to `POST /api/admin/login`.
   - Backend verifies against `admin_users` table and issues a signed JWT token valid for 24 hours.
2. **Dashboard Overview**:
   - `GET /api/admin/applications` with `Bearer <token>`.
   - SQL query aggregates counts for `total`, `submitted`, `under_review`, `approved`, `rejected`, `disbursed`, and sum of `max_eligible_loan`.
   - List results return masked mobile numbers (`+91 98*** **210`) to prevent unauthorized contact harvesting.
3. **Inspection & Status Change**:
   - Admin clicks on an application card or table row.
   - Detail modal opens, displaying full audit history, unmasked telephone number, stone weight breakdown, and scheme terms.
   - Admin transitions status: `submitted` $\rightarrow$ `under_review` $\rightarrow$ `approved` (or `rejected`) $\rightarrow$ `disbursed`.
   - Updates `status` and `updated_at` in SQLite transaction, instantly updating dashboard KPIs.

---

## 3. Database Schema (`SQLite`)

### Table: `loan_schemes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Scheme identifier (`emi_plan`, `bullet_plan`) |
| `name` | TEXT | NOT NULL | Human-readable name |
| `interest_rate_percent` | REAL | NOT NULL | Annual interest rate (e.g., 9.5, 10.25) |
| `ltv_ratio` | REAL | NOT NULL | Loan-to-value decimal (0.75, 0.70) |
| `min_tenure_months` | INTEGER | NOT NULL | Minimum tenure in months (e.g., 3) |
| `max_tenure_months` | INTEGER | NOT NULL | Maximum tenure in months (e.g., 36) |
| `repayment_type` | TEXT | NOT NULL | `Monthly EMI` or `Bullet Repayment at Maturity` |
| `description` | TEXT | NOT NULL | Scheme summary |
| `key_terms` | TEXT | NOT NULL | JSON string array of scheme conditions |
| `is_active` | INTEGER | NOT NULL DEFAULT 1 | Active scheme flag |

### Table: `applications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal primary key |
| `reference_number` | TEXT | UNIQUE NOT NULL | External reference (`TG-GL-YYYYMM-XXXX`) |
| `applicant_name` | TEXT | NOT NULL | Full name of applicant |
| `mobile_number` | TEXT | NOT NULL | Normalized E.164 (`+91XXXXXXXXXX`) |
| `email` | TEXT | NULLABLE | Email address |
| `gross_weight` | REAL | NOT NULL | Gross gold weight (g) |
| `stone_weight` | REAL | NOT NULL | Deducted stone/gem weight (g) |
| `net_weight` | REAL | NOT NULL | Computed net gold weight (g) |
| `purity_karat` | INTEGER | NOT NULL | Karat (18, 22, 24) |
| `scheme_id` | TEXT | NOT NULL | Foreign key -> `loan_schemes(id)` |
| `gold_rate_per_gram` | REAL | NOT NULL | Gold rate applied (₹7,000) |
| `purity_adjusted_value` | INTEGER | NOT NULL | Value of gold in rupees |
| `max_eligible_loan` | INTEGER | NOT NULL | Max loan amount in rupees |
| `interest_rate_percent` | REAL | NOT NULL | Fixed scheme interest rate at submission |
| `ltv_ratio` | REAL | NOT NULL | Fixed scheme LTV ratio at submission |
| `status` | TEXT | NOT NULL DEFAULT 'submitted' | `submitted`, `under_review`, `approved`, `rejected`, `disbursed` |
| `admin_notes` | TEXT | NULLABLE | Reviewer notes |
| `source` | TEXT | NOT NULL DEFAULT 'web' | Source channel: `web` or `ai_assistant` |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 update timestamp |

**Indexes**:
- `idx_applications_reference`: On `reference_number`
- `idx_applications_mobile_date`: On `(mobile_number, created_at)` for high-performance 7-day duplicate checks
- `idx_applications_status`: On `status` for fast dashboard filtering

### Table: `admin_users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | User ID |
| `email` | TEXT | UNIQUE NOT NULL | Admin email |
| `password_hash` | TEXT | NOT NULL | Salted password hash |
| `name` | TEXT | NOT NULL | Admin full name |
| `role` | TEXT | NOT NULL DEFAULT 'admin' | Role |
| `created_at` | TEXT | NOT NULL | Creation timestamp |

---

## 4. Security & Compliance Highlights

1. **Authentication & Session Security**:
   - Admin authentication utilizes JsonWebToken (JWT) with HMAC-SHA256 signature and 24-hour expiration.
   - Non-authenticated requests to `/api/admin/*` are rejected with HTTP 401 Unauthorized.
2. **Mobile Privacy Safeguard**:
   - List and search endpoints return masked mobile numbers (`+91 98*** **210`), protecting customer contact details from broad exposure.
3. **SQL Injection Defense**:
   - 100% of database queries use parameterized SQL via `better-sqlite3`. No dynamic string concatenation is permitted in queries.
4. **Authoritative Backend Pricing**:
   - The client UI never dictates the loan value. The backend calculation engine recalculates and validates all figures upon application submission, preventing client-side price tampering.
5. **Rate Limiting & Duplicate Guard**:
   - 7-day mobile duplication restriction prevents spam and repeated simultaneous submissions from the same applicant.
