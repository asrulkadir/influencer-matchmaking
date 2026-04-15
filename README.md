# CreatorMatch — Micro-Influencer Matchmaking Platform

A full-stack SaaS marketplace that connects brands with micro-influencers using AI-powered matching, escrow-based milestone payments, and real-time social media analytics.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
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
│  (Prisma)  │ (Payments)   │  Analytics)  │ (Meta OAuth)     │
└────────────┴──────────────┴──────────────┴──────────────────┘
```

## Key Features

### 1. Role-Based Access Control (Brand / Creator / Admin)
- **Brands**: Create campaigns, discover creators, manage escrow payments, view analytics
- **Creators**: Receive invitations, submit content, track earnings, connect social accounts
- **Admin**: Resolve disputes, overview platform metrics, manage users
- JWT-based auth with NextAuth.js + role-aware middleware protecting all API routes and pages

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

### 4. Social Media API Integrations
- **TikTok**: OAuth2 flow, profile stats, video analytics, engagement rate calculation
- **Instagram**: Meta OAuth, Business Account insights, media-level metrics, audience demographics
- Automated sync job updates creator stats and stores monthly analytics reports

### 5. Tiered Subscription System
| Feature | Starter ($49/mo) | Growth ($149/mo) | Enterprise ($399/mo) |
|---------|:-:|:-:|:-:|
| Campaigns/month | 3 | 10 | Unlimited |
| Creator Outreach | 10 | 50 | Unlimited |
| Analytics Dashboard | ✗ | ✓ | ✓ |
| AI Campaign Briefs | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✗ | ✓ |

Managed via Stripe Checkout + webhooks for automatic tier transitions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (REST), Zod validation |
| Database | PostgreSQL via Supabase, Prisma ORM |
| Auth | NextAuth.js (JWT strategy), Google OAuth |
| Payments | Stripe Connect, PaymentIntents, Webhooks |
| Social APIs | TikTok Content API, Instagram Graph API (Meta) |
| Deployment | Vercel (frontend), Supabase (database) |

## Database Schema

15+ models covering the full domain:
- **Users & Auth**: User, Account, Session (NextAuth adapter)
- **Profiles**: BrandProfile (subscription tier, Stripe customer), CreatorProfile (social stats, Connect account)
- **Campaigns**: Campaign, CampaignCreator (matching + milestones), CampaignNicheTag
- **Payments**: EscrowPayment (full lifecycle), SubscriptionPlan
- **Analytics**: AnalyticsReport (per-platform monthly snapshots)
- **Discovery**: NicheTag, CreatorNicheTag, PortfolioItem

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   ├── campaigns/            # Campaign CRUD + matching
│   │   ├── payments/escrow/      # Escrow lifecycle
│   │   ├── analytics/            # Reports + social sync
│   │   ├── subscriptions/        # Stripe Checkout
│   │   └── webhooks/stripe/      # Stripe event handlers
│   ├── dashboard/                # Role-based dashboard
│   ├── admin/                    # Admin panel
│   └── page.tsx                  # Landing page
├── components/
│   ├── dashboard/                # Brand & Creator dashboards
│   ├── campaigns/                # Campaign form, match results
│   ├── payments/                 # Escrow manager
│   └── analytics/                # Analytics dashboard
├── lib/
│   ├── auth.ts                   # Auth config + role helpers
│   ├── db.ts                     # Prisma client singleton
│   ├── stripe.ts                 # Stripe config + subscription tiers
│   ├── escrow.ts                 # Escrow payment service
│   ├── matching-algorithm.ts     # Creator matching engine
│   └── social-media/
│       ├── tiktok.ts             # TikTok API integration
│       └── instagram.ts          # Instagram Graph API
├── middleware.ts                  # Role-based route protection
└── types/
prisma/
├── schema.prisma                 # Full database schema
└── seed.ts                       # Seed niche tags + subscription plans
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in Supabase, Stripe, and social media API credentials

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Seed initial data
npx prisma db seed

# Run development server
npm run dev
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/campaigns` | Brand/Admin | List brand's campaigns |
| POST | `/api/campaigns` | Brand | Create new campaign |
| POST | `/api/campaigns/[id]/match` | Brand/Admin | Run matching algorithm |
| POST | `/api/payments/escrow` | Brand | Create escrow payment |
| PATCH | `/api/payments/escrow` | Brand/Admin | Release/Refund/Dispute |
| GET | `/api/analytics` | All roles | Get analytics reports |
| POST | `/api/analytics` | Creator/Admin | Sync social media stats |
| POST | `/api/subscriptions` | Brand | Create subscription checkout |
| GET | `/api/subscriptions` | Brand/Admin | Get subscription status |
| POST | `/api/webhooks/stripe` | Public | Handle Stripe webhooks |

## Future Roadmap
- [ ] AI-generated campaign briefs (OpenAI integration)
- [ ] Automated contract generation (PDF)
- [ ] Real-time chat between brands and creators
- [ ] YouTube API integration
- [ ] Advanced audience overlap analysis
- [ ] White-label solution for agencies
