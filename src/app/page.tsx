import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, CalendarIcon } from "@heroicons/react/20/solid";
import {
  LightBulbIcon,
  LinkIcon,
  CpuChipIcon,
  ChartBarIcon,
  UserGroupIcon,
  HeartIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  PresentationChartLineIcon,
  CheckCircleIcon,
  BoltIcon,
  ShieldCheckIcon,
  ClockIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { getPosts, formatPostDate, BlogPost } from "@/lib/blog";

/* ─── Data ──────────────────────────────────────────────────────────────────── */

const features = [
  {
    icon: LightBulbIcon,
    title: "AI Strategy Engine",
    description:
      "Generate product roadmaps and strategic recommendations powered by AI analysis of your project data.",
  },
  {
    icon: LinkIcon,
    title: "Azure DevOps Sync",
    description:
      "Deep two-way integration with Azure DevOps. Work items, repos, pipelines, and sprints — all connected.",
  },
  {
    icon: CpuChipIcon,
    title: "Multi-AI Providers",
    description:
      "Choose from OpenAI, Claude, or Gemini. Switch providers per task or let EchoOps pick the best model.",
  },
  {
    icon: ChartBarIcon,
    title: "Product Analytics",
    description:
      "Transform raw project metrics into product health dashboards with trend analysis and predictions.",
  },
  {
    icon: UserGroupIcon,
    title: "Team Optimization",
    description:
      "AI-driven resource allocation and workload balancing to keep your teams productive and unblocked.",
  },
  {
    icon: HeartIcon,
    title: "Health Monitoring",
    description:
      "Real-time health scores across sprints, releases, and team velocity with early warning alerts.",
  },
];

const steps = [
  {
    icon: CloudArrowUpIcon,
    step: "01",
    title: "Connect Azure DevOps",
    description:
      "Link your Azure DevOps organization in seconds. EchoOps securely syncs your projects, work items, and team data.",
  },
  {
    icon: SparklesIcon,
    step: "02",
    title: "AI Analyzes Your Data",
    description:
      "Our multi-AI engine processes your project history, identifies patterns, bottlenecks, and opportunities for improvement.",
  },
  {
    icon: PresentationChartLineIcon,
    step: "03",
    title: "Get Actionable Insights",
    description:
      "Receive strategic recommendations, automated reports, and predictive analytics to drive better product decisions.",
  },
];

const stats = [
  { value: "10x", label: "Faster Insights", icon: BoltIcon },
  { value: "85%", label: "Less Manual Reporting", icon: ClockIcon },
  { value: "3", label: "AI Providers", icon: CpuChipIcon },
  { value: "100%", label: "Azure DevOps Coverage", icon: ShieldCheckIcon },
];

const aiProviders = [
  { name: "OpenAI", description: "GPT-4o & GPT-4o mini" },
  { name: "Claude", description: "Anthropic Claude 4" },
  { name: "Gemini", description: "Google Gemini Pro" },
];

const benefits = [
  "No credit card required",
  "Set up in under 5 minutes",
  "Full Azure DevOps integration",
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default async function Home() {
  const posts = await getPosts();
  const latestPosts = posts.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col items-center">
      {/* ── Sticky Nav ──────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="EchoOps home">
            <Image
              src="/EchoOps logo.png"
              alt="EchoOps Logo"
              width={140}
              height={46}
              priority
              className="rounded-lg"
              style={{ width: "140px", height: "auto" }}
            />
            <span className="hidden font-display text-sm font-bold text-primary sm:block">
              AI-Powered Product Building
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              Blog
            </Link>
            <Link
              href="/how-to"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              How It Works
            </Link>
            <div className="ml-2 flex gap-2">
              <Link
                href="/auth/signin"
                className="button-neo bg-muted text-foreground hover:bg-muted/80 text-sm transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="button-neo button-primary text-sm transition-all duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl animate-float" />
          <div className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-secondary/15 blur-3xl animate-float" style={{ animationDelay: "2.5s" }} />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <SparklesIcon className="h-4 w-4" />
              <span>AI-Powered Product Intelligence</span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up animate-fade-up-delay-1 font-display text-5xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Transform PMs into{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient">
                Product Builders
              </span>
            </h1>

            {/* Subheadline */}
            <p className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              EchoOps connects to Azure DevOps and uses AI to turn your project
              data into strategic product insights — so you spend less time
              reporting and more time building.
            </p>

            {/* CTAs */}
            <div className="animate-fade-up animate-fade-up-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signup"
                className="button-neo button-primary group inline-flex items-center gap-2 px-8 py-3 text-base"
              >
                <RocketLaunchIcon className="h-5 w-5" />
                <span>Start Free</span>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/how-to"
                className="button-neo bg-card text-foreground hover:bg-muted/60 inline-flex items-center gap-2 px-8 py-3 text-base"
              >
                See How It Works
              </Link>
            </div>

            {/* Trust signals */}
            <div className="animate-fade-up animate-fade-up-delay-4 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {benefits.map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-primary" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up animate-fade-up-delay-5 mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="card-spatial flex flex-col items-center py-6 text-center"
              >
                <s.icon className="mb-2 h-6 w-6 text-primary/70" />
                <span className="font-display text-3xl font-black text-foreground">
                  {s.value}
                </span>
                <span className="mt-1 text-xs font-medium text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────────────────── */}
      <section className="w-full px-6 py-20 md:py-28" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-primary">
              Capabilities
            </span>
            <h2
              id="features-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Everything you need to build better products
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powerful features that bridge the gap between project management
              and product strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className="card-neo group overflow-hidden p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden px-6 py-20 md:py-28"
        aria-labelledby="how-it-works-heading"
      >
        {/* Subtle background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-secondary">
              How It Works
            </span>
            <h2
              id="how-it-works-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              From data to decisions in three steps
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get started in minutes, not days. EchoOps does the heavy lifting.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line (visible on md+) */}
                {i < steps.length - 1 && (
                  <div
                    className="pointer-events-none absolute right-0 top-16 hidden h-0.5 w-8 translate-x-full bg-gradient-to-r from-primary/40 to-transparent md:block"
                    aria-hidden="true"
                  />
                )}

                <article className="card-spatial relative h-full overflow-hidden p-8 text-center">
                  {/* Step number watermark */}
                  <span
                    className="pointer-events-none absolute -right-2 -top-4 font-display text-8xl font-black text-primary/[0.06]"
                    aria-hidden="true"
                  >
                    {s.step}
                  </span>

                  <div className="relative z-10">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <s.icon className="h-8 w-8 text-primary" />
                    </div>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary">
                      Step {s.step}
                    </span>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Providers ────────────────────────────────────────────────────── */}
      <section className="w-full px-6 py-20 md:py-28" aria-labelledby="integrations-heading">
        <div className="mx-auto max-w-6xl">
          <div className="card-spatial relative overflow-hidden p-8 md:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />

            <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div>
                <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-accent">
                  Integrations
                </span>
                <h2
                  id="integrations-heading"
                  className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                  Powered by the best AI,{" "}
                  <span className="text-primary">connected to your stack</span>
                </h2>
                <p className="mt-4 text-muted-foreground">
                  EchoOps integrates natively with Azure DevOps and lets you
                  choose from three leading AI providers. Switch models per task
                  or let EchoOps auto-select the best one.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                    <LinkIcon className="h-4 w-4 text-accent" />
                    Azure DevOps
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                    <CpuChipIcon className="h-4 w-4 text-primary" />
                    Work Items &amp; Boards
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                    <ChartBarIcon className="h-4 w-4 text-secondary" />
                    Pipelines &amp; Repos
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {aiProviders.map((p) => (
                  <div
                    key={p.name}
                    className="card-neo flex items-center gap-4 p-5 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <SparklesIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        {p.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    </div>
                    <CheckCircleIcon className="ml-auto h-5 w-5 flex-shrink-0 text-primary/60" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof / Why EchoOps ──────────────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden px-6 py-20 md:py-28"
        aria-labelledby="why-heading"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-primary">
              Why EchoOps
            </span>
            <h2
              id="why-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Built for teams that ship
            </h2>
            <p className="mt-4 text-muted-foreground">
              Stop drowning in status updates and manual reports. EchoOps gives
              you the strategic clarity to make bold product decisions.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                icon: BoltIcon,
                title: "Instant Intelligence",
                desc: "AI processes your entire Azure DevOps history and surfaces insights that would take weeks of manual analysis.",
              },
              {
                icon: ShieldCheckIcon,
                title: "Enterprise-Grade Security",
                desc: "Your data never leaves your control. SOC 2 compliant architecture with encrypted connections and role-based access.",
              },
              {
                icon: ClockIcon,
                title: "Minutes, Not Months",
                desc: "Connect your Azure DevOps org and get your first AI-generated insights in under 5 minutes. No migration required.",
              },
              {
                icon: UserGroupIcon,
                title: "Team-Centric Design",
                desc: "Built by PMs, for PMs. Every feature is designed around real product management workflows and pain points.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="card-spatial group flex gap-5 p-6 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="w-full px-6 py-20 md:py-28" aria-labelledby="cta-heading">
        <div className="mx-auto max-w-6xl">
          <div className="card-neo relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-accent p-10 text-center md:p-16">
            {/* Decorative rings */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-2 border-white/10" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full border-2 border-white/10" aria-hidden="true" />

            <div className="relative z-10">
              <h2
                id="cta-heading"
                className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                Ready to build products,
                <br className="hidden sm:block" /> not just manage projects?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
                Join teams already using EchoOps to turn Azure DevOps data into
                strategic product insights.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="button-neo inline-flex items-center gap-2 border-white/40 bg-white px-8 py-3 text-base font-bold text-primary shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] transition-all hover:-translate-y-1"
                >
                  <RocketLaunchIcon className="h-5 w-5" />
                  Get Started Free
                </Link>
                <Link
                  href="/how-to"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-8 py-3 text-base font-bold text-white transition-all hover:bg-white/10"
                >
                  Learn More
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Blog Section ────────────────────────────────────────────────────── */}
      {latestPosts.length > 0 && (
        <section className="w-full px-6 py-20 md:py-28" aria-labelledby="blog-heading">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-primary">
                  From the Blog
                </span>
                <h2
                  id="blog-heading"
                  className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                  Latest insights
                </h2>
              </div>
              <Link
                href="/blog"
                className="hidden items-center gap-1.5 text-sm font-medium text-primary transition-all hover:gap-2.5 sm:flex"
              >
                View all posts
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post: BlogPost) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group card-neo flex flex-col overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                >
                  {post.coverImage && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    {post.tags && post.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3 className="font-display text-lg font-bold text-foreground transition-colors group-hover:text-primary line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                    {(post.excerpt ?? post.description) && (
                      <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {post.excerpt ?? post.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t border-border/30 pt-4">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatPostDate(post.publishedAt ?? post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-primary transition-all group-hover:gap-2">
                        Read more
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                View all posts
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-border/30 px-6" aria-label="Site footer">
        <div className="mx-auto max-w-6xl py-12">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <Image
                src="/EchoOps logo.png"
                alt="EchoOps Logo"
                width={120}
                height={40}
                className="rounded-lg"
                style={{ width: "120px", height: "auto" }}
              />
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                AI-powered platform that transforms project managers into
                strategic product builders.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-foreground">Product</h4>
              <ul className="space-y-2">
                {[
                  { href: "/about", label: "About" },
                  { href: "/how-to", label: "How It Works" },
                  { href: "/blog", label: "Blog" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-foreground">Legal</h4>
              <ul className="space-y-2">
                {[
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-border/30 pt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} EchoOps. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
