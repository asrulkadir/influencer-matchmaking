import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">CreatorMatch</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Find Your Perfect
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            {" "}
            Creator Match
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          AI-powered matchmaking connects brands with micro-influencers based on
          engagement rate, niche expertise, and audience demographics. Secure
          escrow payments. Real-time analytics.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/auth/signin?role=brand"
            className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary/90"
          >
            I&apos;m a Brand
          </Link>
          <Link
            href="/auth/signin?role=creator"
            className="rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            I&apos;m a Creator
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold">
          Everything You Need to Run Influencer Campaigns
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border bg-white p-8 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold">
          Simple, Transparent Pricing
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          Choose the plan that scales with your brand
        </p>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.popular
                  ? "border-primary bg-white shadow-lg ring-2 ring-primary"
                  : "bg-white shadow-sm"
              }`}
            >
              {plan.popular && (
                <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={`/auth/signin?plan=${plan.name.toLowerCase()}`}
                className={`mt-8 block rounded-lg px-6 py-3 text-center text-sm font-semibold ${
                  plan.popular
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-primary text-primary hover:bg-primary/5"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 CreatorMatch. Micro-Influencer Matchmaking Platform.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "🤖",
    title: "AI-Powered Matching",
    description:
      "Our algorithm analyzes engagement rates, niche tags, audience demographics, and content style to find the perfect creator-brand pairing.",
  },
  {
    icon: "🔒",
    title: "Escrow Payments",
    description:
      "Milestone-based escrow system via Stripe Connect. Funds are held securely until brands approve the delivered content.",
  },
  {
    icon: "📊",
    title: "Real-Time Analytics",
    description:
      "Pull live data from TikTok and Instagram APIs. Track impressions, engagement, reach, and ROI across all campaigns.",
  },
  {
    icon: "🎯",
    title: "Campaign Management",
    description:
      "Create briefs, set budgets, invite matched creators, track content submissions, and manage approvals in one place.",
  },
  {
    icon: "👥",
    title: "Role-Based Access",
    description:
      "Three distinct roles (Brand, Creator, Admin) with tailored dashboards, permissions, and workflows for each.",
  },
  {
    icon: "📈",
    title: "Tiered Subscriptions",
    description:
      "Flexible plans from Starter to Enterprise. Scale your campaign limits, creator outreach, and analytics access as you grow.",
  },
];

const plans = [
  {
    name: "Starter",
    price: 49,
    popular: false,
    features: [
      "3 campaigns per month",
      "10 creator outreach",
      "Basic matching algorithm",
      "Standard escrow payments",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: 149,
    popular: true,
    features: [
      "10 campaigns per month",
      "50 creator outreach",
      "Advanced matching algorithm",
      "Full analytics dashboard",
      "Priority matching",
      "Chat support",
    ],
  },
  {
    name: "Enterprise",
    price: 399,
    popular: false,
    features: [
      "Unlimited campaigns",
      "Unlimited creator outreach",
      "AI campaign brief generation",
      "Advanced analytics & reports",
      "Dedicated account manager",
      "Custom contract generation",
      "API access",
    ],
  },
];
