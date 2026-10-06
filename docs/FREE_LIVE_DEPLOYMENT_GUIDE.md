# 🚀 100% Free Live Deployment Guide (Zero Cost, No Credit Card)

This guide walks you through deploying the complete **WorkMate AI** full-stack platform live to the internet **completely free** with zero upfront costs and no credit cards required.

---

## 🏗️ Free Production Architecture Overview

| Component | Cloud Provider | Free Tier Details | Live Role |
| :--- | :--- | :--- | :--- |
| **Database** | **Neon Postgres** | 0.5 GiB, autoscaling compute, 100% free forever | Stores users, tickets, tasks, metrics |
| **Backend REST API** | **Render.com** | 750 free instance hours/month, free HTTPS, zero credit card | Express API server, Prisma ORM, AI triage |
| **Frontend Web Portal** | **Vercel** | Unlimited deployments, worldwide edge CDN, free HTTPS | Next.js 15 App Router web dashboard |
| **Demo Walkthrough** | **GitHub Releases** | 2 GB per file, zero bandwidth limits | High-definition project video demo |

---

## ⚡ Step 1: Deploy Backend API on Render (2 Minutes)

Render provides a completely free tier for Node.js web services with free automatic HTTPS.

1. **Open Render**: Go to [dashboard.render.com](https://dashboard.render.com) and click **Sign in with GitHub**.
2. **Create New Web Service**:
   - In the top navigation, click **New +** ➔ **Web Service**.
   - Select **Build and deploy from a Git repository** ➔ Click **Next**.
   - Choose your repository: `AnkitoshK/WorkMate_AI`.
3. **Configure Service Settings**:
   - **Name**: `workmate-api` (or any name you like)
   - **Region**: Choose `Ohio (US East)` (closest to your Neon database in `us-east-2`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root of repository)
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm build:api`
   - **Start Command**: `pnpm start:api`
   - **Instance Type**: Select **Free** ($0/month)
4. **Add Environment Variables**:
   Click **Advanced** ➔ **Add Environment Variable**:
   - `DATABASE_URL`: *(Paste your Neon database connection string)*
     ```text
     postgresql://neondb_owner:npg_neALG1IV8DqT@ep-frosty-dream-b589tv8j-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - `NODE_ENV`: `production`
5. **Deploy**:
   - Click **Create Web Service**.
   - Render will run `pnpm install`, generate the Prisma client, compile TypeScript, and boot your server.
   - When finished, Render displays your live public HTTPS URL:
     `https://workmate-api-xxxx.onrender.com`
6. **Verify Health**:
   - Open in your browser: `https://workmate-api-xxxx.onrender.com/health`
   - You should see:
     ```json
     { "ok": true, "service": "workmate-api", "version": "1.0.0" }
     ```

*(Note: On the free tier, Render puts the service to sleep after 15 minutes of inactivity. The first request after sleep takes ~30-40 seconds to wake up, which is standard for free web hosting).*

---

## ⚡ Step 2: Deploy Frontend Web Dashboard on Vercel (2 Minutes)

Vercel is the creator of Next.js and provides the fastest, most reliable free hosting with global CDN.

1. **Open Vercel**: Go to [vercel.com](https://vercel.com) and click **Sign Up** or **Log In** with **GitHub**.
2. **Import Project**:
   - Click **Add New...** ➔ **Project**.
   - Find your repository `AnkitoshK/WorkMate_AI` and click **Import**.
3. **Configure Monorepo Settings**:
   - Under **Root Directory**, click **Edit** and select:
     `apps/web`
   - **Framework Preset**: Auto-detected as **Next.js**.
4. **Add Environment Variable**:
   - Expand the **Environment Variables** section:
     - **Key**: `NEXT_PUBLIC_API_URL`
     - **Value**: Your Render live URL from Step 1 (e.g., `https://workmate-api-xxxx.onrender.com`)
5. **Deploy**:
   - Click **Deploy**.
   - Vercel builds the Next.js app in ~40 seconds and provides your live public domain:
     `https://workmate-ai-xxxx.vercel.app`

---

## ⚡ Step 3: Test Full System Live

1. Open your live Vercel link (`https://workmate-ai-xxxx.vercel.app`).
2. The dashboard will load with live statistics fetched from your Render backend and Neon PostgreSQL database.
3. Test logging in as:
   - **Ravi Kumar** (`ravi@gmail.com`)
   - **Sarah Chen** (`admin@workmate.ai`)
4. Create a new incident ticket, run AI triage, and verify that the ticket persists in the cloud database!

---

## 📱 Mobile App (Expo) Live Access

To let anyone test the mobile app without downloading an APK:
1. Anyone with **Expo Go** (free on Google Play Store or iOS App Store) on their phone can connect.
2. In the mobile app's **Connection Settings** modal, they can paste your live Render URL:
   `https://workmate-api-xxxx.onrender.com`
   and test the entire mobile app live anywhere in the world!
