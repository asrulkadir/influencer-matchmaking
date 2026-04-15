# CreatorMatch — Micro-Influencer Matchmaking Platform

A full-stack SaaS marketplace that connects brands with micro-influencers using AI-powered matching, escrow-based milestone payments, and real-time social media analytics.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green?logo=supabase)
![Stripe](https://img.shields.io/badge/Stripe-Connect-purple?logo=stripe)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (Frontend)                   │
│  Landing Page │ Brand Dashboard │ Creator Dashboard │ Admin  │
├─────────────────────────────────────────────────────────────┤
│                   Next.js API Routes (Backend)               │
│  Auth │ Campaigns │ Matching │ Escrow │ Analytics │ Webhooks │
├────────────┬──────────────┬──────────────┬──────────────────┤
│  Supabase  │ Stripe       │ TikTok API   │ Instagram        │
│  PostgreSQL│ Connect      │ (OAuth +     │ Graph API        │
│  (Direct)  │ (Payments)   │  Analytics)  │ (Meta OAuth)     │
└────────────┴──────────────┴──────────────┴──────────────────┘
```

## Key Features

### 1. Authentication & Role-Based Access Control
- **Google OAuth** sign-in via NextAuth.js with JWT strategy
- **Role selection** during sign-in (Brand or Creator)
- **Onboarding wizard** — 2-step flow to create a BrandProfile or CreatorProfile
- **Route protection** via `proxy.ts` (Next.js 16 convention) with role-aware guards
- Helper functions: `getSession()`, `getCurrentUser()`, `requireRole()`

### 2. AI-Powered Creator Matching Algorithm
Weighted multi-criteria scoring engine:
| Criteria | Weight | Description |
|----------|--------|-------------|
| Niche Relevance | 40% | Jaccard similarity between creator and campaign niche tags |
| Engagement Rate | 30% | Sigmoid-normalized score against campaign target |
| Follower Fit | 15% | Bell-curve scoring favoring micro-influencer sweet spots |
| Availability | 10% | Whether creator is currently accepting campaigns |
| Platform Match | 5% | Active on campaign's target platforms (TikTok/Instagram) |

```typescript
// Example: Run matching for a campaign
const matches = await runCampaignMatching(campaignId);
// Returns: [{ creatorId, matchScore: 87.5, breakdown: {...} }, ...]
```

### 3. Milestone-Based Escrow Payment System
Built on Stripe Connect for split payments:

```
Brand funds escrow → Platform holds funds → Creator submits content
      ↓                                           ↓
  PaymentIntent              Brand approves → Transfer to Creator
  (manual capture)                          (Stripe Connect payout)
                                                   ↓
                                           Platform keeps 10% fee
```

- `createEscrow()` — Creates PaymentIntent with manual capture
- `fundEscrow()` — Captures held funds after brand payment
- `releaseEscrow()` — Transfers payout to creator's Connect account
- `refundEscrow()` — Returns funds to brand if content rejected
- `disputeEscrow()` — Flags for admin resolution

### 4. Tiered Subscription System
| Feature | Starter ($49/mo) | Growth ($149/mo) | Enterprise ($399/mo) |
|---------|:-:|:-:|:-:|
| Campaigns/month | 3 | 10 | Unlimited |
| Creator Outreach | 10 | 50 | Unlimited |
| Analytics Dashboard | ✗ | ✓ | ✓ |
| AI Campaign Briefs | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✗ | ✓ |

Managed via Stripe Checkout + webhooks for automatic tier transitions. Includes a pricing page, subscription management in brand settings, and usage tracking with visual progress bars.

### 5. Social Media API Integrations
- **TikTok**: OAuth2 flow, profile stats, video analytics, engagement rate calculation
- **Instagram**: Meta OAuth, Business Account insights, media-level metrics, audience demographics
- Automated sync job updates creator stats and stores monthly analytics reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2, React 19, TypeScript 6.0, Tailwind CSS 4.2 |
| Backend | Next.js API Routes (REST), Zod 4 validation |
| Database | PostgreSQL via Supabase (direct client, manually typed) |
| Auth | NextAuth.js 4 (JWT strategy), Google OAuth |
| Payments | Stripe Connect, PaymentIntents, Checkout Sessions, Webhooks |
| Social APIs | TikTok Content API, Instagram Graph API (Meta) |
| UI Components | Radix UI primitives, Recharts, Lucide icons |
| Package Manager | pnpm |

## Database Schema

15 tables with manually defined TypeScript types in `src/lib/database.types.ts`:

- **Users & Auth**: User, Account, Session (custom NextAuth adapter)
- **Profiles**: BrandProfile (subscription tier, Stripe customer), CreatorProfile (social stats, Connect account)
- **Campaigns**: Campaign, CampaignCreator (matching + milestones), CampaignNicheTag
- **Payments**: EscrowPayment (full lifecycle), SubscriptionPlan
- **Analytics**: AnalyticsReport (per-platform monthly snapshots)
- **Discovery**: NicheTag, CreatorNicheTag, PortfolioItem
- **Notifications**: Notification (in-app alerts)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/       # NextAuth handlers
│   │   ├── campaigns/                # Campaign CRUD + matching
│   │   ├── payments/escrow/          # Escrow lifecycle
│   │   ├── analytics/                # Reports + social sync
│   │   ├── subscriptions/            # Stripe Checkout + status
│   │   ├── onboarding/               # Profile creation for new users
│   │   └── webhooks/stripe/          # Stripe event handlers
│   ├── auth/
│   │   ├── signin/                   # Sign-in page (Google OAuth + role)
│   │   └── signout/                  # Auto sign-out
│   ├── onboarding/                   # 2-step onboarding wizard
│   ├── pricing/                      # Subscription tier selection
│   ├── dashboard/
│   │   ├── page.tsx                  # Role-based redirect
│   │   └── brand/
│   │       ├── payments/             # Escrow payment management
│   │       └── settings/             # Subscription & account settings
│   ├── admin/                        # Admin panel
│   └── page.tsx                      # Landing page
├── components/
│   ├── auth/                         # AuthProvider (SessionProvider)
│   ├── dashboard/                    # Brand & Creator dashboards
│   ├── campaigns/                    # Campaign form, match results
│   ├── payments/                     # Escrow manager
│   └── analytics/                    # Analytics dashboard
├── lib/
│   ├── auth.ts                       # NextAuth config + custom Supabase adapter
│   ├── database.types.ts             # All table types + Database type map
│   ├── db.ts                         # Supabase client singleton
│   ├── supabase.ts                   # Supabase browser client
│   ├── stripe.ts                     # Stripe config + subscription tiers
│   ├── escrow.ts                     # Escrow payment service
│   ├── matching-algorithm.ts         # Creator matching engine
│   ├── seed.ts                       # Seed niche tags + subscription plans
│   └── social-media/
│       ├── tiktok.ts                 # TikTok API integration
│       └── instagram.ts              # Instagram Graph API
└── proxy.ts                          # Role-based route protection (Next.js 16)
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (free tier works)
- A [Stripe](https://stripe.com) account with Connect enabled
- A [Google Cloud](https://console.cloud.google.com) project with OAuth 2.0 credentials

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Create a `.env.local` file at the project root:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Social Media (optional — needed for creator analytics sync)
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
```

### 3. Set up the database

Create the required tables in your Supabase project. The schema is defined in `src/lib/database.types.ts` — create matching tables in the Supabase SQL editor or dashboard.

### 4. Seed initial data

```bash
pnpm db:seed
```

This seeds niche tags and subscription plans.

### 5. Set up Stripe webhooks (for local development)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 6. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Auth Flow

```
Landing Page → /auth/signin → Google OAuth → NextAuth callback
  ↓
New user? → /onboarding (select role → fill profile) → /dashboard
Existing user? → /dashboard (role-based redirect)
```

## Payment Flow

```
Brand visits /pricing → Selects plan → POST /api/subscriptions
  ↓
Stripe Checkout → Payment → Webhook → Tier updated in DB
  ↓
Brand redirected to /dashboard/brand/settings?session_id=...
  ↓
Settings page shows plan, usage bars, and feature access
```

For campaign payments, brands use the escrow system via `/dashboard/brand/payments`.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/campaigns` | Brand/Admin | List brand's campaigns |
| POST | `/api/campaigns` | Brand | Create new campaign |
| POST | `/api/campaigns/[id]/match` | Brand/Admin | Run matching algorithm |
| POST | `/api/payments/escrow` | Brand | Create escrow payment |
| PATCH | `/api/payments/escrow` | Brand/Admin | Release/Refund/Dispute escrow |
| GET | `/api/analytics` | All roles | Get analytics reports |
| POST | `/api/analytics` | Creator/Admin | Sync social media stats |
| POST | `/api/subscriptions` | Brand | Create Stripe Checkout session |
| GET | `/api/subscriptions` | Brand/Admin | Get subscription status + usage |
| POST | `/api/onboarding` | Authenticated | Create brand/creator profile |
| POST | `/api/webhooks/stripe` | Public | Handle Stripe webhook events |

## Future Roadmap
- [ ] AI-generated campaign briefs (OpenAI integration)
- [ ] Automated contract generation (PDF)
- [ ] Real-time chat between brands and creators
- [ ] YouTube API integration
- [ ] Advanced audience overlap analysis
- [ ] White-label solution for agencies
