# Fleetly - Deployment & Recovery Guide

## Prerequisites
- Node.js 24+
- MongoDB Atlas cluster or managed MongoDB
- Reverse proxy with HTTPS (nginx/Cloudflare/ALB)
- Domain for frontend and backend

## Environment Configuration

### Backend (.env)
Required in production:
- `NODE_ENV=production`
- `PORT`
- `MONGO_URI` (MongoDB Atlas with auth)
- `JWT_SECRET` (>=32 chars, rotate regularly)
- `JWT_EXPIRES_IN`
- `CLIENT_PRODUCTION_DOMAIN` (HTTPS)
- `CLIENT_ALLOWED_ORIGINS` (comma-separated HTTPS origins)
- `TRUST_PROXY_HOPS` (set behind proxy/load balancer)

OAuth (if enabled):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (HTTPS)
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL` (HTTPS)

Invitations:
- `INVITATION_WEBHOOK_URL` (optional HTTPS mail adapter endpoint). Invitation
  tokens are hashed in MongoDB and are never returned by the API.

See `backend/.env.example` for full list.

### Frontend (.env)
- `VITE_API_URL` (backend API URL)

## MongoDB Atlas Setup
1. Create cluster and database user
2. Whitelist IPs or use VPC peering
3. Use connection string with TLS
4. Enable backups/snapshots

## CORS Configuration
CORS is enforced via `CLIENT_ALLOWED_ORIGINS`. In production:
- Origins must be HTTPS
- No wildcards
- Only production domains

## OAuth Callbacks
Update OAuth provider redirect URIs to production HTTPS callbacks:
- Google: `https://api.example.com/api/auth/google/callback`
- Facebook: `https://api.example.com/api/auth/facebook/callback`

## Seeding Staging
```bash
cd backend
NODE_ENV=staging node seed/demo.js
```

## Deployment
1. Install dependencies: `npm ci` (backend and frontend)
2. Run checks: `npm run check` (backend), `npm run lint` (frontend)
3. Run tests: `npm test` (both)
4. Build frontend: `npm run build`
5. Start backend: `NODE_ENV=production node server.js`

## Health Checks
- Liveness: `GET /health/live` - process alive
- Readiness: `GET /health/ready` or `GET /ready` - DB connected
- Health: `GET /health` - combined check

## Logging & Rotation
- Logs written to `backend/logs/` with rotation (5-10MB, maxFiles)
- In production, logs go to stdout for log aggregation
- Request IDs tracked via `X-Request-ID` header
- No sensitive data logged (redacted)

## Secrets Rotation
1. Generate new secrets (JWT_SECRET >=32 chars)
2. Update environment variables
3. Restart services with zero-downtime if possible
4. Invalidate old tokens if needed

## Backups
- MongoDB Atlas automated backups enabled
- Test restore procedures regularly
- Document backup retention policy

## Database index migration (bookings)

The booking index `(customer, idempotencyKey)` was replaced by a partial unique index named `customer_idempotency_unique`. The old index blocked a customer from holding more than one booking without an idempotency key, so it must be removed on any database created before this change:

```javascript
// mongosh, on the production database, after deploying the new code
db.bookings.getIndexes()                       // confirm customer_1_idempotencyKey_1 is listed
db.bookings.dropIndex('customer_1_idempotencyKey_1')
db.bookings.getIndexes()                       // confirm customer_idempotency_unique is listed
```

Drop the old index before routing traffic to the new version: while it exists, a customer's second key-less booking is refused. Mongoose creates the new index at startup.

## Rollback
1. Identify previous working version
2. Deploy previous build/artifacts
3. Restore database from backup if schema changed
4. Verify health checks
5. Monitor logs for errors
