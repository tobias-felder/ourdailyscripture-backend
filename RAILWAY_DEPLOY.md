# Railway Deployment Guide for OurDailyScripture Backend

## Quick Start

This backend is ready to deploy to Railway. Follow these steps:

### Option 1: Deploy via Railway CLI (Recommended)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link to your Railway project
railway link
# Select: accurate-playfulness
# Select service: dependable-exploration

# 4. Deploy
railway up

# 5. Add PostgreSQL database
railway add --database postgres

# 6. Initialize database schema
railway run psql $DATABASE_URL -f schema.sql

# 7. Get your deployment URL
railway domain
```

### Option 2: Deploy via Railway Dashboard

1. Go to https://railway.app
2. Click on your project "accurate-playfulness"
3. Click "New Service" → "Empty Service"
4. Click "Deploy from GitHub repo"
5. Select `ourdailyscripture-backend` repository
6. Railway will auto-detect Node.js and deploy

### Option 3: Deploy with Docker

```bash
# Railway will automatically detect the Dockerfile and use it
railway up --dockerfile
```

## Environment Variables

Set these in Railway Dashboard (Project → Variables):

### Required Variables

```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.netlify.app
DATABASE_URL=<Auto-set by Railway when you add PostgreSQL>
JWT_SECRET=<Generate with: openssl rand -base64 64>
ADMIN_SETUP_KEY=<Generate with: openssl rand -base64 32>
```

### Stripe Configuration

```bash
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

### Email Configuration (Gmail)

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=OurDailyScripture <your-email@gmail.com>
ADMIN_EMAIL=admin@ourdailyscripture.com
```

**Note**: For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" at https://myaccount.google.com/apppasswords

### Optional Variables

```bash
ADMIN_URL=https://your-backend-url.railway.app
PRINTIFY_API_KEY=your-printify-api-key
PRINTIFY_SHOP_ID=your-shop-id
```

## Database Setup

### 1. Add PostgreSQL to Railway

```bash
railway add --database postgres
```

Or via Dashboard:
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically set `DATABASE_URL`

### 2. Initialize Database Schema

```bash
# Via Railway CLI
railway run psql $DATABASE_URL -f schema.sql

# Or connect directly
railway run psql $DATABASE_URL
# Then paste the contents of schema.sql
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check if API is running
curl https://your-app.railway.app/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-21T..."}
```

### 2. Test Endpoints

```bash
# Test root endpoint
curl https://your-app.railway.app/

# Test API documentation
curl https://your-app.railway.app/api/docs
```

### 3. Create Admin User

1. Open: `https://your-app.railway.app/admin.html`
2. Use your `ADMIN_SETUP_KEY` to create the first admin account

### 4. Update Frontend

Update your frontend `.env` file:

```bash
VITE_API_URL=https://your-app.railway.app
```

Then redeploy your frontend.

## Monitoring

### View Logs

```bash
# Via CLI
railway logs

# Or via Dashboard
# Project → Service → Logs tab
```

### Check Metrics

- Dashboard → Service → Metrics
- Monitor CPU, Memory, Network usage

## Troubleshooting

### Deployment Fails

```bash
# Check logs
railway logs

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port not set correctly
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set
railway variables

# Test database connection
railway run psql $DATABASE_URL -c "SELECT version();"
```

### CORS Errors

Make sure `FRONTEND_URL` is set correctly:
```bash
railway variables set FRONTEND_URL=https://your-frontend.netlify.app
```

## Scaling

### Increase Resources

1. Dashboard → Service → Settings
2. Adjust:
   - Memory limit
   - CPU allocation
   - Restart policy

### Enable Auto-Scaling

Railway automatically scales based on traffic.

## Custom Domain (Optional)

1. Dashboard → Service → Settings → Domains
2. Click "Add Domain"
3. Enter your custom domain
4. Update DNS records as shown

## Backup Strategy

### Database Backups

Railway automatically backs up PostgreSQL databases.

To create manual backup:
```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

## Cost Estimation

- **Hobby Plan**: $5/month
- **Pro Plan**: $20/month + usage
- **PostgreSQL**: ~$5-10/month depending on size

## Security Checklist

- [ ] All environment variables set
- [ ] JWT_SECRET is random and secure
- [ ] ADMIN_SETUP_KEY is random and secure
- [ ] Stripe keys are production keys (sk_live_)
- [ ] Email credentials are secure
- [ ] CORS configured for production frontend only
- [ ] Database has strong password
- [ ] HTTPS enabled (automatic on Railway)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- OurDailyScripture Issues: https://github.com/tobias-felder/ourdailyscripture-backend/issues

---

**Ready to deploy!** 🚀

