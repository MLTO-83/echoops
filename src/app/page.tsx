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
} from "@heroicons/react/24/outline";
import { getPosts, formatPostDate, BlogPost } from "@/lib/blog";

const features = [
  { icon: LightBulbIcon, text: "AI-driven product strategy and roadmap generation" },
  { icon: LinkIcon, text: "Smart Azure DevOps integration with intelligent insights" },
  { icon: CpuChipIcon, text: "Multi-AI provider support (OpenAI, Claude, Gemini)" },
  { icon: ChartBarIcon, text: "Transform project data into product decisions" },
  { icon: UserGroupIcon, text: "Automated resource allocation and team optimization" },
  { icon: HeartIcon, text: "Real-time product health monitoring and predictions" },
];

export default async function Home() {
  const posts = await getPosts();
  const latestPosts = posts.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-6xl space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="flex items-center">
            <Image
              src="/EchoOps logo.png"
              alt="EchoOps Logo"
              width={180}
              height={60}
              priority
              className="rounded-lg"
              style={{ width: "180px", height: "auto" }}
            />
            <div className="ml-4 hidden md:block">
              <h1 className="text-xl font-display font-bold text-primary">
                EchoOps. AI-Powered Product Building.
              </h1>
            </div>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/auth/signin"
              className="button-neo bg-muted text-foreground hover:bg-muted/80 transition-all duration-200 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="button-primary transition-all duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* For mobile display - show tagline below the logo */}
        <div className="md:hidden -mt-4 mb-2">
          <h1 className="text-xl font-display font-bold text-primary">
            EchoOps. AI-Powered Product Building.
          </h1>
        </div>

        {/* Hero section */}
        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2"></div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-8 relative z-10">
            <div className="lg:col-span-6">
              <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl tracking-tight">
                Transform PMs into{" "}
                <span className="text-primary">Product Builders</span>
              </h2>
              <p className="mt-6 text-xl text-muted-foreground">
                EchoOps empowers Project Managers to become strategic Product
                Builders through AI-driven insights.
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                Seamlessly integrate with Azure DevOps, leverage multi-AI
                capabilities, and transform project data into actionable product
                strategies that drive innovation and market success.
              </p>
              <div className="mt-8">
                <Link
                  href="/auth/signin"
                  className="button-primary inline-flex items-center group"
                >
                  <span>Start Building Products</span>
                  <ArrowRightIcon className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-6">
              <div className="card-neo overflow-hidden">
                <div className="px-4 py-8 sm:px-6 sm:py-12 bg-purple-800 text-center">
                  <h3 className="text-2xl font-display font-bold text-white">
                    AI-Powered Product Building
                  </h3>
                </div>
                <div className="px-4 py-8 sm:px-6 sm:py-10">
                  <ul className="space-y-4 text-left">
                    {features.map((feature, i) => (
                      <li className="flex items-start gap-3" key={i}>
                        <feature.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-card-foreground font-medium">
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Latest from our Blog */}
        {latestPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Latest from our Blog
              </h2>
              <Link
                href="/blog"
                className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all"
              >
                View all posts
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestPosts.map((post: BlogPost) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group card-neo flex flex-col overflow-hidden hover:scale-[1.02] transition-transform duration-200"
                >
                  {/* Cover image */}
                  {post.coverImage && (
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  <div className="flex flex-col flex-1 p-6">
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    {(post.excerpt ?? post.description) && (
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                        {post.excerpt ?? post.description}
                      </p>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>
                          {formatPostDate(post.publishedAt ?? post.createdAt)}
                        </span>
                      </div>
                      {/* Read more */}
                      <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read more
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-auto pt-8">
        <div className="border-t border-border/30 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-muted-foreground mb-4 md:mb-0">
              © {new Date().getFullYear()} EchoOps. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link
                href="/about"
                className="text-muted-foreground hover:text-primary"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-primary"
              >
                Blog
              </Link>
              <Link
                href="/how-to"
                className="text-muted-foreground hover:text-primary"
              >
                How To
              </Link>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-primary"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-primary"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
