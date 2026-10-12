# 404 FOUND — Campus AI Lost & Found Management System

A production-grade, full-stack AI-driven Lost & Found recovery platform engineered specifically for university campuses and colleges. Built with Express 5, React 19, Vite, and SQLite (WAL mode).

---

## 🌟 Core System Capabilities

1. **Multi-Signal AI Matching Engine**
   - Automatically compares reported lost and found items against opposing reports using a weighted multi-factor scoring model:
     - **Semantic & Text Similarity (35%)**: TF-IDF tokenization, bigram analysis, and cosine distance across titles and descriptions.
     - **Perceptual Visual Signatures (25%)**: Color palette distributions and image feature vectors.
     - **Campus Proximity Graph (15%)**: Zone adjacency mapping (e.g., Main Library, Student Union, Athletics Gym).
     - **Temporal Decay Alignment (10%)**: Exponential decay curve modeling chronological closeness.
     - **Category & Brand Hierarchy (15%)**: Strict and related-category cross-evaluation.
2. **Natural Language Semantic Search**
   - Parses unstructured natural speech (e.g. *"I lost a black backpack near the library yesterday"*) into structured search criteria (object, color, location, timeframe, category).
3. **Pre-Flight Duplicate Detection**
   - Flags potentially duplicate reports before database insertion to prevent clutter and duplicate claims.
4. **Tamper-Proof Ownership Verification Claims**
   - Enforces zero-knowledge verification (hidden serial numbers, inner pocket contents, secret markings) reviewed by campus administrators before approving release.
5. **Masked Anonymous Relay Communication**
   - Protects student privacy by masking phone numbers and email addresses during finder-claimant coordination.
6. **Physical Recovery QR Code Tags**
   - Generates printable high-density QR code labels for physical items deposited at campus security desks.
7. **Dual-Role Dashboards & Real-Time Analytics**
   - **Student Dashboard**: Live KPI tiles, active report statuses, potential match alerts, and claim trackers.
   - **Admin Moderation Center**: System-wide recovery statistics, campus hotspot tracking, user suspensions, claim approvals, and adjustable AI similarity thresholds.

---

## 📁 Project Directory Structure

```text
Lost And Found/
├── .env.example              # Production environment template for root deployment
├── .gitignore                # Root Git safety rules (protects DB, uploads, .env, builds)
├── package.json              # Unified root package manager with one-command scripts
├── README.md                 # Complete system documentation and operation guide
├── DEPLOYMENT.md             # Production hosting, Docker, systemd, and VPS guide
├── scripts/
│   └── test-runner.js        # Automated test orchestrator (auto-boots local test server)
├── client/                   # Frontend SPA (React 19 + Vite)
│   ├── .env.example          # Client environment template
│   ├── .gitignore            # Client-specific Git exclusion rules
│   ├── index.html            # Vite HTML shell
│   ├── package.json          # Frontend scripts and UI dependencies
│   ├── vite.config.js        # Vite dev server (port 5173 with proxy to :5001)
│   ├── public/               # Public static assets
│   └── src/                  # React components, pages, context, and styles
│       ├── components/       # Modals, badges, navigation, and QR generator
│       ├── context/          # Auth context and session management
│       ├── pages/            # Browse, Report, Claim, Item Detail, and Dashboards
│       └── ...
├── server/                   # Backend REST API (Node.js + Express 5 + SQLite)
│   ├── .env.example          # Server environment template
│   ├── .gitignore            # Server-specific Git exclusion rules
│   ├── lost_and_found.db     # SQLite production database (WAL mode; git-ignored)
│   ├── package.json          # Server scripts and dependencies
│   ├── test-flow.js          # 13-step full lifecycle integration test suite
│   ├── test-production-audit.js # 16-check security, privacy, and KPI audit suite
│   ├── backups/              # Atomic database backup snapshots (git-ignored)
│   ├── uploads/              # Item photos and generated claim receipts (git-ignored)
│   │   ├── .gitkeep          # Retains directory structure in Git
│   │   └── receipts/
│   │       └── .gitkeep
│   ├── scripts/              # Database management utilities (backup/restore)
│   │   ├── backup.js
│   │   └── restore.js
│   └── src/                  # Express controllers, routes, models, and AI engine
│       ├── config.js         # Configuration loader & defaults
│       ├── index.js          # Express app entrypoint & single-origin static host
│       ├── db/               # SQLite connection and migration schema
│       ├── middleware/       # JWT auth, role validation, rate limiting
│       ├── routes/           # Modular endpoints (/auth, /items, /claims, /admin)
│       └── utils/            # Multi-signal AI scoring & NLP extraction algorithms
└── design-reference/         # UI design references and specifications
```

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **npm**: v9.0.0 or higher
- **Operating System**: Windows, macOS, or Linux

---

## ⚙️ Installation & Setup

1. **Clone or navigate into the repository root**:
   ```bash
   cd "Lost And Found"
   ```

2. **Install all dependencies (root, backend, and frontend) in one command**:
   ```bash
   npm run install:all
   ```
   *(Alternatively, run `npm install` in the root, `server/`, and `client/` directories individually).*

3. **Configure Environment Variables (Optional for Development)**:
   The application runs out of the box in development mode with safe, pre-configured defaults.
   
   To customize settings for production:
   - Copy `.env.example` to `.env`:
     ```bash
     # Root / Server
     cp server/.env.example server/.env
     # Client (if overriding API URL)
     cp client/.env.example client/.env
     ```
   - Generate a cryptographically strong JWT secret for production:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Update `JWT_SECRET`, `PORT`, and `CLIENT_URL` in `server/.env`.

---

## 🚀 One-Command Launch

### Development Mode (Concurrent Frontend & Backend)
Run both the Node.js API server and the Vite React frontend together with unified color-coded logging and clean shutdown:
```bash
npm run dev
```
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- Press `Ctrl + C` in the terminal to cleanly shut down both servers.

### Production Build & Single-Origin Hosting
Build the optimized React frontend bundle and host both the API and client from a single origin on port 5001:
```bash
# 1. Build frontend and start the production server
npm run start:prod
```
- Open [http://localhost:5001](http://localhost:5001) in your browser.
- Express serves the compiled static SPA assets with automatic client-side routing fallback and handles all `/api` and `/uploads` requests from the same origin without CORS hurdles.

---

## 🧪 Testing & Verification

The project includes end-to-end integration test suites and security audit checks. The automated test runner automatically checks whether the server is running; if not, it temporarily spins up a local test instance, runs the checks, and shuts down cleanly.

```bash
# Run both test suites (29 automated checks total)
npm test

# Run only the 13 core lifecycle & AI matching tests
npm run test:flow

# Run only the 16 security, rate-limiting, and privacy audit checks
npm run test:audit

# Run client linter (Oxlint)
npm run lint
```

---

## 👥 Demo Accounts (Seed Data)

The system includes pre-seeded demo campus accounts with the shared password **`Password123!`**:

| Role | Name | Email | Password | Details |
|------|------|-------|----------|---------|
| **Campus Admin** | Campus Security & Admin Office | `admin@campus.edu` | `Password123!` | Complete administrative authority, claims review queue, user suspensions, and AI weight controls |
| **Student** | Alex Chen | `alex.chen@campus.edu` | `Password123!` | Reporter of lost Nike backpack (active AI match) |
| **Student** | Sarah Jenkins | `sarah.jenkins@campus.edu` | `Password123!` | Reporter of found Nike backpack (with active claim) |
| **Student** | Marcus Williams | `marcus.williams@campus.edu` | `Password123!` | Engineering student (lost Casio calculator) |

> 💡 **Quick Role Switcher**: Click the **Demo Role** button in the navigation bar to switch between user accounts instantly.

---

## 💾 Database Management & Backups

The SQLite database (`server/lost_and_found.db`) operates in WAL mode (Write-Ahead Logging) to ensure high concurrency and zero corruption.

```bash
# Seed the database with sample campus data (preserves table schemas)
npm run seed

# Create a zero-downtime atomic backup in server/backups/
npm run backup

# Safely restore from the latest backup snapshot
npm run restore
```

---

## 🔒 Git & GitHub Upload Safety

All sensitive assets (database files, WAL logs, uploaded images, receipts, backups, and live `.env` files) are strictly protected by root and sub-level `.gitignore` configurations.

### Uploading to a New GitHub Repository

1. **Initialize Git (if not already initialized)**:
   ```bash
   git init
   ```

2. **Verify Git exclusion rules (Ensure no sensitive files are staged)**:
   ```bash
   git status
   ```
   *Verify that `lost_and_found.db`, `uploads/`, `backups/`, and `.env` do NOT appear in the untracked files list. Only template files like `.env.example` and source code should be present.*

3. **Stage tracked project files**:
   ```bash
   git add .
   ```

4. **Double-check staged files for sensitive data**:
   ```bash
   git status
   # Or inspect the exact list of staged files:
   git diff --cached --name-only
   ```

5. **Commit the project**:
   ```bash
   git commit -m "feat: initial commit for 404 FOUND platform"
   ```

6. **Link and push to your GitHub repository**:
   ```bash
   # Set main branch
   git branch -M main

   # Add your GitHub remote repository URL
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git

   # Push code to GitHub
   git push -u origin main
   ```
