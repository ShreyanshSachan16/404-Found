# 404 FOUND — Production Deployment Guide & Architecture

This document outlines the architecture, persistent storage guarantees, security requirements, and step-by-step launch procedures for deploying **404 FOUND (Campus Lost & Found Intelligent Recovery Network)** to public production.

---

## 1. System Architecture & Topology

```
                  ┌──────────────────────────────────────────┐
                  │          End Users / Students            │
                  └────────────────────┬─────────────────────┘
                                       │ HTTPS (443)
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │ Reverse Proxy / Ingress (Nginx / Caddy)   │
                  │ - TLS Termination (Let's Encrypt SSL)    │
                  │ - Gzip/Brotli Compression                │
                  │ - Rate Limiting & DDOS Shield            │
                  └────────────┬──────────────────┬──────────┘
                               │                  │
               Static Assets   │                  │ /api/* & /uploads/*
                               ▼                  ▼
     ┌───────────────────────────────┐  ┌──────────────────────────────────┐
     │ Vite React Frontend (SPA)     │  │ Node.js Express Backend API      │
     │ - Obsidian / Amber / Ivory UI │  │ - Multi-Signal AI Matching Engine│
     │ - Client Hash Routing         │  │ - Natural Language Search Parser │
     │ - Static Dist Bundle          │  │ - Rate Limiting & Auth Controls  │
     └───────────────────────────────┘  └─────────────────┬────────────────┘
                                                          │ WAL Mode
                                                          ▼
                                        ┌──────────────────────────────────┐
                                        │ Persistent Block Volume (/data)  │
                                        │ ├── lost_and_found.db (SQLite)   │
                                        │ ├── lost_and_found.db-wal        │
                                        │ └── uploads/ (Item Photos & Ev.) │
                                        └──────────────────────────────────┘
```

### Component Roles:
1. **Frontend**: High-performance React SPA built with Vite. Compiles down to static HTML/JS/CSS assets with zero server-side rendering overhead.
2. **Backend**: Express 5 REST API running in Node.js (v18+). Hosts NLP search, tokenization/cosine similarity matching, QR generation, rate limiting, and zero-knowledge ownership verification workflows.
3. **Storage Engine**: SQLite in Write-Ahead-Logging (`WAL`) mode via `better-sqlite3`. Provides zero-latency ACID transactions with immediate read/write concurrency.

---

## 2. Persistent Storage Guarantees (Crucial)

> [!CAUTION]
> **NEVER deploy SQLite or user photo uploads on ephemeral containers without a mounted persistent volume!**
> Cloud containers (such as default Heroku dynos or unattached Render/Fly.io instances) wipe their local filesystem on each redeployment or container restart.

### How to Guarantee Persistence:
- **Mount Path**: Mount a persistent block storage volume at `/data` (e.g. 5GB–20GB SSD volume).
- **Environment Configuration**:
  ```bash
  DB_PATH=/data/lost_and_found.db
  UPLOAD_DIR=/data/uploads
  ```
- **Survival on Redeployment**:
  - `lost_and_found.db`, `lost_and_found.db-wal`, and `lost_and_found.db-shm` remain untouched on the volume across Docker/container rebuilds.
  - Uploaded item photographs and claim verification receipts remain intact in `/data/uploads/`.
  - The application automatically ensures `/data` subdirectories exist on boot without overwriting existing data.

---

## 3. Environment Variables

### Backend (`server/.env`)
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | Yes | `production` | Enables production error sanitization and security policies |
| `PORT` | Yes | `5001` | HTTP listening port for Express backend |
| `JWT_SECRET` | **YES** | None | Cryptographic secret for signing session tokens (min. 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry duration |
| `CORS_ORIGIN` | Yes | App domain | Allowed origin(s), e.g. `https://found.campus.edu` |
| `CLIENT_URL` | Yes | App domain | Base URL used for printable recovery QR code tags |
| `DB_PATH` | Yes | `/data/lost_and_found.db` | Path to persistent SQLite database |
| `UPLOAD_DIR` | Yes | `/data/uploads` | Path to persistent uploads directory |

### Frontend (`client/.env`)
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_ENABLE_DEMO_LOGIN` | No | `false` | When `false`, demo login pills and switcher are stripped |

---

## 4. Production Build & Start Commands

### 1. Build Client:
```bash
cd client
npm ci
npm run build
# Compiles to: client/dist/
```

### 2. Prepare & Launch Backend:
```bash
cd server
npm ci --omit=dev
npm start
# Runs: node src/index.js on configured PORT
```

---

## 5. Deployment Options

### Option A: Docker & Docker Compose (Recommended)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=5001
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=https://found.campus.edu
      - CLIENT_URL=https://found.campus.edu
      - DB_PATH=/data/lost_and_found.db
      - UPLOAD_DIR=/data/uploads
    volumes:
      - app_data:/data
    expose:
      - "5001"

  web:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./client/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - certs:/etc/letsencrypt
    depends_on:
      - server

volumes:
  app_data:
  certs:
```

### Option B: Linux VPS / systemd Deployment

1. **Install Node.js 18+ and Nginx**:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm nginx
   ```
2. **Create persistent directory**:
   ```bash
   sudo mkdir -p /var/lib/404found/uploads
   sudo chown -R www-data:www-data /var/lib/404found
   ```
3. **Configure systemd service (`/etc/systemd/system/404found-server.service`)**:
   ```ini
   [Unit]
   Description=404 FOUND Lost and Found API Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/404found/server
   ExecStart=/usr/bin/node src/index.js
   Restart=always
   RestartSec=5
   Environment=NODE_ENV=production
   Environment=PORT=5001
   Environment=JWT_SECRET=YOUR_RANDOM_SECRET_KEY_HERE
   Environment=DB_PATH=/var/lib/404found/lost_and_found.db
   Environment=UPLOAD_DIR=/var/lib/404found/uploads
   Environment=CLIENT_URL=https://found.campus.edu
   Environment=CORS_ORIGIN=https://found.campus.edu

   [Install]
   WantedBy=multi-user.target
   ```
4. **Enable and start**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now 404found-server
   ```

---

## 6. Backup & Restore Procedures

Online database backups can be taken **without downtime** using the included scripts:

### Taking a Backup:
```bash
cd server
npm run backup
# Output: backups/backup-YYYY-MM-DDTHH-MM-SS.db
```
The backup script invokes `wal_checkpoint(TRUNCATE)` and SQLite's atomic online backup API, ensuring complete transaction consistency.

### Restoring a Backup:
```bash
cd server
# Restore latest backup:
npm run restore

# Or restore a specific backup file:
node scripts/restore.js backups/backup-2026-10-12T04-40-30-345Z.db
```

### Automated Nightly Cron:
```bash
0 2 * * * cd /var/www/404found/server && /usr/bin/node scripts/backup.js >> /var/log/404found-backup.log 2>&1
```

---

## 7. Cost, Dependencies & Limitations

- **External AI API Costs**: **$0.00 / month**. The system utilizes an in-process, self-contained multi-signal neural matching and semantic TF-IDF NLP pipeline. No third-party LLM or vector database subscriptions (OpenAI, Pinecone, etc.) are needed.
- **Compute Requirements**: Very low footprint. Runs smoothly on a basic 1 vCPU / 1GB RAM virtual server ($5–$6/month on Hetzner, DigitalOcean, or Linode).
- **Storage**: ~5GB SSD volume recommended to store photo uploads and SQLite database.
- **Email/SMS Relay (Optional Future Enhancement)**: In-app notifications are natively supported out of the box. If campus-wide SMTP or Twilio SMS alerts are desired, configure standard Node.js nodemailer or webhook transports.

---

## 8. Production Smoke-Test Checklist

Before opening the site to campus students:

- [ ] **1. Health Check**: Visit `https://your-domain.com/api/health` and verify `status: ok` and `database: ok`.
- [ ] **2. Security Headers**: Inspect HTTP response headers in DevTools Network tab to verify `X-Content-Type-Options: nosniff` and `X-Frame-Options` are present.
- [ ] **3. Rate Limiting**: Verify rapid requests receive `X-RateLimit-Limit` headers and throttle if abused.
- [ ] **4. Registration**: Register a test student account. Verify account role defaults to `student` and cannot be escalated.
- [ ] **5. Report Flow**:
  - Report a Lost item with photos and specific identifying marks.
  - Report an opposing Found item matching the description.
  - Verify pre-flight duplicate check detects similar items.
- [ ] **6. AI Matching Engine**:
  - Open the report and verify the **Neural Vector Telemetry** breakdown (Text, Visual, Geo-Spatial, Timestamp).
  - Verify confidence score reflects real computed values.
- [ ] **7. Ownership Verification Claim**:
  - Submit a claim answering secret questions and attaching proof.
  - Verify that the item finder **cannot** see the claimant's secret answers or student ID.
  - Log in as admin and verify the **Custody Moderation Review** modal displays claimant answers alongside on-file marks.
- [ ] **8. QR Code Handover**:
  - View found item QR code and scan with a smartphone camera.
  - Verify the link opens the recovery dossier directly on mobile.
- [ ] **9. Return Handover**:
  - Mark item as returned.
  - Confirm dashboard **Success Rate** and **Recovered Items** count update with real database metrics.
- [ ] **10. Persistence Validation**:
  - Restart the backend service.
  - Confirm reports, claims, and photos remain intact without data loss.
