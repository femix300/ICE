# ICE — Infrastructure for Collections & Exchange

> Built for the Nomba Hackathon 2026 — Infrastructure Track

ICE is a production-grade middleware infrastructure layer built on top of Nomba's Dedicated Virtual Account (DVA) APIs. It abstracts Nomba's raw primitives into a multi-tenant, developer-friendly platform that marketplace operators and their vendors can integrate in minutes.

## Documentation
- **Product Requirements**: [`ICE_PRD.md`](./ICE_PRD.md)
- **Engineering Standards & Git Workflow**: [`ICE_ENGINEERING.md`](./ICE_ENGINEERING.md)

## Tech Stack
- **Language**: TypeScript (strict mode)
- **API Server**: Node.js + Express
- **Frontend**: Next.js + Tailwind CSS
- **Database**: PostgreSQL
- **Cache & Queues**: Redis + BullMQ

## Quick Start (Local Setup)

To test the current progress of the API and Dashboard locally:

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally)
- Redis (running locally)

### 2. Environment Variables
Copy the `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` and `REDIS_URL` are correct for your local setup.

### 3. Backend (API Server)
Install dependencies and run the server:
```bash
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

### 4. Frontend (Dashboard)
In a new terminal window, start the Next.js UI:
```bash
cd dashboard
npm install
npm run dev
```
The dashboard will be available at `http://localhost:3001`.

## API Documentation

The REST API is fully documented and interactive. While the backend server (`npm run dev`) is running, you can access:

1. **Swagger UI (Interactive API Explorer)**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
2. **ReDoc (Reading View)**: [http://localhost:3000/redoc](http://localhost:3000/redoc)

All endpoints are fully authenticated via API Keys. You can retrieve an initial API Key by interacting with the `POST /v1/merchants/register` endpoint in the Swagger UI.
