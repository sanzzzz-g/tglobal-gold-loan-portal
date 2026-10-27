# T Global Gold Loan Portal with AI Agent

A production-ready, full-stack Gold Loan Portal built for the **T Global Full Stack Developer Intern assignment**. The application enables retail borrowers to explore gold loan schemes, compute authoritative gold valuations and loan quotes, complete a 3-step loan application, interact with a Gemini-powered conversational AI agent with real tool calling, and allows administrators to review, filter, and transition applications with full audit integrity.

---

## 🌟 Executive Summary

- **Authoritative Backend Calculations**: All financial valuations, net weights, purity multipliers, and eligible loan amounts are computed exclusively on the backend via deterministic arithmetic (`/api/quote/calculate`), validated again upon application submission.
- **Strict Customer Confirmation Safeguard**: The AI Loan Assistant uses Google Gemini 2.5 Flash via `@google/genai` on the backend with 3 real functional tools (`get_loan_schemes`, `calculate_loan_quote`, `submit_loan_application`). Crucially, the AI will **never** submit an application without explicit user consent; it prepares and presents the full quote, requests confirmation, and only calls `submit_loan_application` once confirmed.
- **7-Day Duplicate Application Guard**: Mobile numbers are normalized to E.164 (`+91XXXXXXXXXX`). Attempting to submit another application for the same mobile within 7 days returns an HTTP `409 Conflict` with the existing reference code.
- **Security & Privacy**: Admin list views mask applicant phone numbers (e.g., `+91 98*** **210`). The full unmasked number is only revealed inside an authenticated detail modal.
- **Robust Persistence**: Powered by SQLite with Write-Ahead Logging (`WAL` mode) and indexes on application reference numbers, mobile numbers, creation timestamps, and statuses.
- **Comprehensive Automated Tests**: 27 unit and integration tests passing in Vitest covering all assignment edge cases, calculations, validations, and duplicate prevention.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion |
| **Backend** | Node.js, Express, TypeScript, Zod, Better-SQLite3, JsonWebToken |
| **AI Engine** | Google Gemini API (`gemini-2.5-flash`) via `@google/genai` TypeScript SDK (server-side only) |
| **Database** | SQLite3 (`data/gold_loan.sqlite`) with WAL journal mode, parameterized SQL queries |
| **Testing** | Vitest, Supertest, TypeScript compiler (`tsc --noEmit`) |

---

## 📐 Financial Calculation Specification

The backend enforces the exact assignment formulas:

1. **Net Gold Weight**:
   $$\text{Net Weight (g)} = \text{Gross Weight} - \text{Stone Weight}$$
   *(Requires $\text{Gross Weight} > 0$ and $\text{Stone Weight} \ge 0$, with $\text{Net Weight} \ge 0.5\text{g}$)*

2. **Purity Ratio**:
   - $18\text{K} = \frac{18}{24} = 0.75$
   - $22\text{K} = \frac{22}{24} = 0.9166666666666666$
   - $24\text{K} = \frac{24}{24} = 1.00$

3. **Purity-Adjusted Gold Value**:
   $$\text{Purity Adjusted Value (₹)} = \text{round}\left(\text{Net Weight} \times \text{Gold Rate (₹7,000/g)} \times \frac{\text{Karat}}{24}\right)$$

4. **Maximum Eligible Loan Amount**:
   $$\text{Max Eligible Loan (₹)} = \text{round}\left(\text{Purity Adjusted Value} \times \text{LTV Ratio}\right)$$

### Verified Test Cases

| Test Case | Gross (g) | Stone (g) | Net (g) | Purity | Scheme | LTV | Purity-Adjusted Value | Max Eligible Loan |
|---|---|---|---|---|---|---|---|---|
| **Case 1** | 20.0 | 2.0 | 18.0 | 22 Karat | EMI Plan (9.5% p.a.) | 75% | ₹1,15,500 | **₹86,625** |
| **Case 2** | 50.0 | 0.0 | 50.0 | 24 Karat | Bullet Plan (10.25% p.a.) | 70% | ₹3,50,000 | **₹2,45,000** |
| **Case 3** | 10.0 | 1.5 | 8.5 | 18 Karat | EMI Plan (9.5% p.a.) | 75% | ₹44,625 | **₹33,469** |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or bun

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
# GEMINI_API_KEY: Server-side Gemini API key for the AI Loan Assistant
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Optional: Port (defaults to 3000)
PORT=3000
```

*Note: If no Gemini API key is configured, the AI Assistant automatically falls back to an offline deterministic financial rule engine so the application remains 100% testable and operational without external credentials.*

### 2. Development Mode

Runs the unified Vite dev server with integrated Express backend middleware on port 3000:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Execution

Compile frontend assets and start the standalone production server:

```bash
npm run build
npm start
```

### 4. Running the Test Suite

Execute all 27 unit, integration, and security tests via Vitest:

```bash
npm test
```

To run with coverage or watch mode:
```bash
npx vitest run
```

---

## 🔐 Admin Dashboard Credentials

The database automatically seeds an initial administrative account upon startup:

- **Email**: `admin@tglobal.com`
- **Password**: `Admin@123_ChangeMeInProd`
- **Quick-Fill Button**: On the Admin Login page, a 1-click **"Fill Demo Admin Credentials"** button is provided for easy evaluation.

### Admin Capabilities:
- View summary metrics: Total Applications, Pending Verification, Approved, Total Loan Volume (₹).
- Filter applications by status (`submitted`, `under_review`, `approved`, `rejected`, `disbursed`) or loan scheme.
- Full-text search by Applicant Name, Reference Code (`TG-GL-YYYYMM-XXXX`), or Mobile number.
- Privacy-safe mobile number masking (`+91 98*** **210`) in list views.
- Deep-dive Modal inspecting full purity breakdowns, stone weight deductions, applicant email, unmasked phone, and historical audit timestamps.
- One-click workflow state updates with instant badge and metric synchronization.

---

## 🤖 AI Assistant Capabilities & Tools

The AI assistant is accessible from the top navigation bar or the floating action launcher on any page. It is backed by Gemini 2.5 Flash with server-side tool calling:

1. `get_loan_schemes()`: Returns active schemes, interest rates, LTVs, tenure limits, and repayment terms.
2. `calculate_loan_quote(grossWeight, stoneWeight, purityKarat, schemeId)`: Invokes the backend calculation engine and returns the exact rupee breakdown.
3. `submit_loan_application(applicantName, mobileNumber, email, grossWeight, stoneWeight, purityKarat, schemeId, consentGiven)`: Creates an application with transactional duplicate prevention.

### Safety Guarantee
The AI assistant's system instructions strictly prohibit submitting an application prematurely. It will first present the calculated quote to the user, verify details, ask: *"Would you like me to go ahead and submit this application for you?"*, and only invoke the submission tool upon affirmative confirmation.

---

## 📂 Project Structure

```
├── data/
│   └── gold_loan.sqlite        # SQLite persistent database (WAL mode)
├── server/
│   ├── db/
│   │   └── database.ts         # SQLite schema, migrations & seeders
│   ├── middleware/
│   │   └── auth.ts             # JWT authentication middleware
│   ├── routes/
│   │   ├── admin.ts            # Admin auth, listing, and status updates
│   │   ├── ai.ts               # Gemini AI assistant endpoint
│   │   ├── applications.ts     # Customer application submission & tracking
│   │   ├── health.ts           # Health check endpoint
│   │   ├── quote.ts            # Authoritative calculation endpoint
│   │   └── schemes.ts          # Loan scheme catalog endpoint
│   ├── services/
│   │   ├── aiService.ts        # Gemini tool-calling engine & fallback
│   │   ├── applicationService.ts # Application logic & 7-day duplicate guard
│   │   ├── calculationService.ts # Financial calculation engine
│   │   └── validationService.ts  # Zod schemas & mobile normalizers
│   ├── types/
│   │   └── index.ts            # Shared domain types and interfaces
│   ├── app.ts                  # Express app setup and middleware routing
│   └── server.ts               # Standalone server entry point
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Brand header with live gold rate ticker
│   │   └── Footer.tsx          # Footer with regulatory disclaimers
│   ├── pages/
│   │   ├── HomePage.tsx        # Hero, process guide, scheme highlights, FAQs
│   │   ├── SchemesPage.tsx     # Comprehensive scheme comparison matrix
│   │   ├── CalculatorPage.tsx  # Valuation calculator with test-case presets
│   │   ├── ApplicationPage.tsx # 3-step application wizard with review
│   │   ├── AIAssistantPage.tsx # Chat interface with tool execution indicator
│   │   └── AdminPage.tsx       # Secure admin dashboard with search & audit
│   ├── api.ts                  # Typed client-side API layer
│   ├── types.ts                # Frontend TypeScript types
│   ├── App.tsx                 # Tab navigation & persistent state handling
│   └── main.tsx                # React 19 entry point
├── tests/
│   └── gold_loan.test.ts       # 27 automated unit and integration tests
├── vite.config.ts              # Vite config with Express middleware
├── metadata.json               # Applet metadata
└── package.json
```

---

## 🛡️ Security, Privacy, and Edge Cases

- **Mobile Number Normalization**: Handles formats `9876543210`, `+919876543210`, `09876543210`, and spaced inputs `+91 98765 43210`, standardizing to `+91XXXXXXXXXX`.
- **Duplicate Prevention**: Re-applying with the same mobile number within 7 days is rejected with HTTP `409 Conflict` and informs the user of their existing application.
- **SQL Injection Prevention**: All queries use parameterized statements (`better-sqlite3`).
- **XSS & Input Sanitization**: Strict Zod type validations on all incoming payloads.
- **Data Protection**: Admin list views mask sensitive personal telephone numbers.
