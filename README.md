# SmartExpense AI

Smart personal finance and expense tracking web application with persistent local IndexedDB storage, budget intelligence, recurring payment automation, and server-side Google Gemini AI capabilities.

Built with **React 19 + TypeScript + Vite + Tailwind CSS + Dexie + Recharts + React Router (HashRouter)**.

---

## 🌟 Key Architecture & Highlights

- **100% Client-Side Privacy with IndexedDB (Dexie):**
  All accounts, transactions, categories, budgets, recurring rules, and savings goals are stored locally in your browser. No cloud database or credentials required for core expense tracking.
- **Zero Floating-Point Inaccuracy:**
  All currency math is calculated in integer minor currency units (paise/cents) to eliminate JavaScript precision bugs.
- **Independent Static Frontend (GitHub Pages Ready):**
  Built with `HashRouter` and configurable base path so the static frontend can be deployed directly to GitHub Pages without server-side routing failures.
- **Secure Server-Side Gemini AI Backend:**
  The `GEMINI_API_KEY` is kept strictly server-side on Node.js/Express. It is never bundled into client source code, browser localStorage, or public environment variables.
- **Graceful Offline / No-AI Fallbacks:**
  If the backend or Gemini API key is absent, the app remains fully functional. Categorization falls back to a fast rule-based local dictionary, and financial insights are calculated deterministically.
- **Multi-Account & Real Accounting:**
  Support for Bank accounts, Cash, UPI Wallets (GPay/PhonePe), Savings, and Credit Cards (properly tracked as liabilities rather than income).
- **Idempotent Recurring Processor:**
  Automatically evaluates due subscriptions on app open without creating duplicate records or claiming background workers when closed.
- **Complete Data Portability:**
  Full JSON backup/restore with schema version validation, CSV transaction export, and CSV statement import with preview and duplicate detection.

---

## 🧭 Application Modules & Navigation

1. **Dashboard:** Net worth summary, Income vs Expense 6-month trajectory, category spending donut chart, recent transactions ledger, budget usage indicators, and automated smart insights.
2. **Transactions Ledger:** Complete CRUD table with full-text search, multi-filters (type, category, account, period), sorting, quick multi-add ledger, receipt scanning, and CSV export.
3. **Accounts & Wallets:** Real balances, opening balances, transaction history per account, and inter-account funds transfer.
4. **Budgets:** Category and total spending envelopes, configurable warning (75%) and danger (90%) thresholds, remaining buffers, and month-over-month comparisons.
5. **Analytics & Reports:** Spend velocity area charts, ranked category breakdown, top merchants by spend and frequency, financial health metrics, and print-ready summary.
6. **Recurring Payments:** Active and paused subscriptions (Netflix, rent, internet, salaries), frequency rules, monthly cost projections, and one-click manual processing.
7. **Savings Goals:** Emergency fund and target trackers, visual progress percentages, pace calculations, and deposit/withdrawal logs.
8. **AI Financial Assistant:** Grounded chat copilot (using strictly computed factual context), transparent deterministic month-end spending forecast, and Gemini multimodal receipt scanner.
9. **Settings:** Profile preferences, currency selection (INR, USD, EUR, GBP, AED, CAD, AUD, SGD, JPY), custom categories manager, JSON backup/restore, and CSV import.

---

## 🏗️ Architecture Clarification

| Component | Role | Hosting Solution |
| :--- | :--- | :--- |
| **GitHub Repository** | Source code hosting, version control, issue tracking, and CI/CD pipelines. | GitHub |
| **GitHub Pages** | Static client-side frontend hosting. Serves HTML, JS, CSS. Does **not** host Node.js or run backend code. | GitHub Pages (`.github/workflows/deploy.yml`) |
| **AI Backend (Optional)** | Node.js Express server that proxies Gemini AI calls using `@google/genai` with `GEMINI_API_KEY`. | Google Cloud Run, Railway, or VPS |
| **IndexedDB (Dexie)** | Local in-browser database for privacy-first, zero-latency financial data storage on the user's device. | Browser client storage (not cloud synchronization) |

---

## 🚀 Local Development

### 1. Prerequisites
- Node.js 20+
- npm 10+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/smartexpense-ai.git
cd smartexpense-ai

# Install dependencies
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your optional Gemini API key (optional for local expense tracking, required for AI chat & receipt scanning):
```env
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
VITE_BASE_PATH="./"
```

### 4. Run Development Server
```bash
# Runs full-stack dev server with Express API + Vite middlewares
npm run dev
```
Open your browser at `http://localhost:3000`.

### 5. Run Verification Unit Tests
```bash
npm test
```
Validates the financial calculation engine, balances, transfers, budgets, and recurrence math across all required test flows.

### 6. Build Static Frontend
```bash
npm run build
```
Generates production-ready static assets in `/dist`.

---

## 🌐 Deploying to GitHub Pages (Static Frontend)

1. Ensure `vite.config.ts` has `base: process.env.VITE_BASE_PATH || './'`.
2. Push your code to the `main` branch on GitHub.
3. In your GitHub repository:
   - Navigate to **Settings > Pages**.
   - Under **Build and deployment > Source**, choose **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish your static applet.
5. In the deployed GitHub Pages app, go to **Settings > Custom AI Backend URL** if you want to connect it to an external server-side Gemini backend.

---

## ☁️ Deploying the Optional AI Backend (e.g. Google Cloud Run)

To enable Gemini AI features (receipt scanning and chat) for a static GitHub Pages deployment, deploy the `server.ts` entry point to Cloud Run:

```bash
# Build and deploy to Google Cloud Run
gcloud run deploy smartexpense-backend \
  --source . \
  --region asia-southeast1 \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --allow-unauthenticated
```

After deployment, copy the generated Cloud Run service URL and paste it into **Settings > Custom AI Backend URL** in your SmartExpense AI frontend.

---

## 🔐 Supabase Authentication & Cloud PostgreSQL Sync

SmartExpense AI features a hybrid architecture combining offline-first local storage (IndexedDB) with **Supabase Authentication and Supabase PostgreSQL Database with Row Level Security (RLS)**.

### Features
1. **User Authentication:**
   - Registration with email validation, password strength requirements, and confirmation match.
   - Login with session persistence and show/hide password option.
   - Password reset via secure email links.
   - Automatic local data isolation on logout to ensure multi-user privacy on shared computers.
2. **PostgreSQL Cloud Storage with Row Level Security (RLS):**
   - 8 normalized tables: `profiles`, `accounts`, `categories`, `transactions`, `budgets`, `recurring_rules`, `savings_goals`, and `savings_contributions`.
   - Strict Row Level Security: Every table enforces `auth.uid() = user_id` for SELECT, INSERT, UPDATE, and DELETE. User A can never read or mutate User B's financial records.
   - Strict integer minor unit storage (paise/cents) in `BIGINT` columns to eliminate rounding drift.
3. **Local-to-Cloud Migration & Deduplication:**
   - Seamlessly prompts guest users to upload local IndexedDB records when signing in for the first time.
   - Primary key conflict resolution avoids duplicating transactions, accounts, or budgets.

### Setting Up Supabase

1. **Create a Supabase Project:**
   - Sign up or log in at [supabase.com](https://supabase.com) and create a new project.
2. **Execute Database Migration:**
   - In your Supabase Dashboard, open the **SQL Editor**.
   - Copy and paste the contents of `supabase/migrations/20261104000000_smartexpense_schema.sql` and click **Run**.
   - This creates all 8 tables, indexes, automatic signup triggers, and enables Row Level Security with strict user-isolation policies.
3. **Configure Authentication Redirects (For GitHub Pages):**
   - In Supabase Dashboard, navigate to **Authentication > URL Configuration**.
   - Set **Site URL** to your GitHub Pages URL (e.g. `https://<username>.github.io/<repo>/`).
   - Add redirect URLs (e.g. `https://<username>.github.io/<repo>/#/reset-password`).
4. **Configure Frontend Credentials:**
   - Copy your **Project URL** and **anon / public key** from **Project Settings > API**.
   - Add them to your `.env` or repository GitHub Actions secrets:
     ```env
     VITE_SUPABASE_URL="https://your-project-id.supabase.co"
     VITE_SUPABASE_ANON_KEY="your-anon-public-key"
     ```
   - Alternatively, you can enter and test your Supabase Project URL and Anon Key directly inside the app under **Settings > Supabase Connection Settings**.

---

## 🧪 Verified Test Flows

SmartExpense AI includes automated verification suites for both financial calculation math and Supabase cloud security.

Run all tests:
```bash
npm test
```

Or run the Supabase and RLS verification suite individually:
```bash
npm run test:supabase
```

### Verified Test Suite Summary
- **Financial Calculation Tests:**
  - Opening balance creation in integer minor units (₹20,000 = 2,000,000 paise).
  - Expense and income balance deductions and additions.
  - Inter-account transfers with exact net worth preservation.
  - Budget thresholds (safe 17%, warning 83%, danger 110%).
  - Recurring processor date advancement (daily, weekly, monthly, yearly).
  - Rule-based offline categorization dictionary.
- **Supabase & Authentication Tests:**
  - User registration validation (email regex, password length >= 8, digits, password match).
  - Domain <-> Database snake_case converters preserving exact integer paise.
  - PostgreSQL Row Level Security (RLS) simulation: User A cannot read or mutate User B records.
  - Data migration deduplication logic (upsert resolving overlapping IDs without corrupting totals).

---

## 📄 License
Apache-2.0
