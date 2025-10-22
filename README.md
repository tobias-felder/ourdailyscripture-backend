# OurDailyScripture E-Commerce Backend

Complete backend API for OurDailyScripture with Stripe payment processing, order management, discount code tracking, and admin dashboard.

## Features

- ✅ **Stripe Payment Processing** - Secure credit card payments
- ✅ **Order Management** - Complete order tracking and history
- ✅ **Discount Codes** - Affiliate tracking with usage statistics
- ✅ **Admin Dashboard** - Beautiful web interface
- ✅ **Email Notifications** - Automatic order confirmations
- ✅ **Theme Management** - Change website colors dynamically
- ✅ **Product Management** - CRUD operations for products
- ✅ **Analytics** - Sales reports and affiliate performance

## Tech Stack

- **Node.js** + **Express** - Backend framework
- **PostgreSQL** - Database
- **Stripe** - Payment processing
- **JWT** - Authentication
- **Nodemailer** - Email notifications

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Initialize Database

```bash
npm run setup-db
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3001`

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - Admin login
- `POST /api/payment/create-intent` - Create Stripe payment intent
- `POST /api/orders/create` - Create order after payment
- `GET /api/discounts/validate/:code` - Validate discount code
- `GET /api/theme/current` - Get current theme

### Protected Endpoints (Require Authentication)

**Orders:**
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/analytics` - Get sales analytics

**Discount Codes:**
- `GET /api/discounts` - Get all discount codes
- `POST /api/discounts` - Create discount code
- `PATCH /api/discounts/:id` - Update discount code
- `DELETE /api/discounts/:id` - Delete discount code
- `GET /api/discounts/stats` - Get affiliate statistics

**Products:**
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PATCH /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

**Theme:**
- `GET /api/theme/presets` - Get theme presets
- `POST /api/theme/apply` - Apply theme preset
- `POST /api/theme/custom` - Apply custom theme

## Admin Dashboard

Access the admin dashboard at: `http://localhost:3001/admin.html`

Features:
- 📊 Overview with sales statistics
- 📦 Order management
- 💰 Discount code tracking with affiliate stats
- 🛍️ Product management
- 🎨 Theme switcher

## Database Schema

### Tables

- `orders` - Customer orders
- `discount_codes` - Discount codes for affiliates
- `products` - Product catalog
- `admins` - Admin users
- `theme_settings` - Website theme configuration

## Deployment

See [BACKEND_SETUP_GUIDE.md](../../BACKEND_SETUP_GUIDE.md) for detailed deployment instructions.

### Recommended Hosting

- **Backend:** Railway.app or Render.com
- **Database:** Supabase or ElephantSQL
- **Email:** Gmail with App Password

## Environment Variables

Required environment variables:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ADMIN_SETUP_KEY=your-setup-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=OurDailyScripture <your-email@gmail.com>
ADMIN_EMAIL=admin@ourdailyscripture.com
FRONTEND_URL=https://ourdailyscripture.com
```

## Security

- JWT-based authentication
- Bcrypt password hashing
- CORS protection
- Environment variable secrets
- Stripe webhook signature verification (recommended)

## License

ISC

## Support

For issues or questions, contact the development team.

