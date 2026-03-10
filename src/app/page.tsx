import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

export default function Home() {
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
                Builders through AI-driven insights. Seamlessly integrate with
                Azure DevOps, leverage multi-AI capabilities, and transform
                project data into actionable product strategies that drive
                innovation and market success.
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
                    {[
                      "AI-driven product strategy and roadmap generation",
                      "Smart Azure DevOps integration with intelligent insights",
                      "Multi-AI provider support (OpenAI, Claude, Gemini)",
                      "Transform project data into product decisions",
                      "Automated resource allocation and team optimization",
                      "Real-time product health monitoring and predictions",
                    ].map((feature, i) => (
                      <li className="flex items-start gap-3" key={i}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-card-foreground font-medium">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
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
