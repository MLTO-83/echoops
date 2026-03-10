import Link from "next/link";
import Image from "next/image";

export default function HowTo() {
  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-6xl space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="space-y-1">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              How To Use EchoOps
            </h1>
            <p className="text-muted-foreground">
              A guide to getting started with our platform
            </p>
          </div>

          <Link
            href="/"
            className="button-neo text-foreground hover:bg-primary/10 
                     transition-all duration-300 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transform transition-transform duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Home</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2"></div>

          <div className="prose prose-lg max-w-none relative z-10 text-foreground/80">
            <p className="text-lg">
              Welcome to EchoOps! This guide will help you get started and make
              the most of our project management platform.
            </p>

            <div className="mb-12 border-b border-border/30 pb-8">
              <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
                Getting Started
              </h2>

              <div className="card-neo p-6 mb-8">
                <h3 className="text-xl font-display font-medium text-foreground mb-3">
                  1. Create Your Account
                </h3>
                <p className="mb-3">
                  Begin by signing up for a EchoOps account. You&apos;ll need to
                  provide your email address and create a password.
                </p>
                <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Pro Tip:</strong> If your organization already uses
                    EchoOps, ask your administrator for an invitation link to
                    join your team directly.
                  </p>
                </div>
              </div>

              <div className="card-neo p-6 mb-8">
                <h3 className="text-xl font-display font-medium text-foreground mb-3">
                  2. Set Up Your Organization
                </h3>
                <p className="mb-3">
                  Once you&apos;ve created your account, you can set up your
                  organization profile. This will help you manage all your
                  projects in one place.
                </p>
                <ul className="list-none pl-0 space-y-2">
                  {[
                    "Navigate to Settings > Organization",
                    "Add your organization name and details",
                    "Invite team members to join your organization",
                  ].map((step, i) => (
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
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-neo p-6 mb-8">
                <h3 className="text-xl font-display font-medium text-foreground mb-3">
                  3. Connect Your Services
                </h3>
                <p className="mb-3">
                  EchoOps works best when connected to your development
                  services. Set up integrations with:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["Azure DevOps", "GitHub", "Jira", "And more..."].map(
                    (service, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-background-secondary/30 dark:bg-background-secondary/20 p-2 rounded-md"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>{service}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mb-12 border-b border-border/30 pb-8">
              <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
                Managing Projects
              </h2>

              <div className="card-neo p-6 mb-8">
                <h3 className="text-xl font-display font-medium text-foreground mb-3">
                  Adding Projects
                </h3>
                <p className="mb-3">
                  You can add projects either manually or by importing them from
                  connected services.
                </p>
                <ol className="list-none pl-0 space-y-3">
                  {[
                    "Go to the Projects dashboard",
                    'Click "Add New Project"',
                    "Choose to import or create a new project",
                    "Fill in the project details",
                  ].map((step, i) => (
                    <li className="flex items-start gap-3" key={i}>
                      <div className="flex-shrink-0 bg-primary/20 dark:bg-primary/30 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                        {i + 1}
                      </div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card-neo p-6 mb-8">
                <h3 className="text-xl font-display font-medium text-foreground mb-3">
                  Using Tags
                </h3>
                <p className="mb-3">
                  Tags help you categorize and filter your projects effectively.
                </p>
                <ul className="list-none pl-0 space-y-2">
                  {[
                    'Create tags that reflect your project types (e.g., "Internal", "Client", "Open Source")',
                    "Apply multiple tags to each project for better organization",
                    "Use the filter system to quickly find projects with specific tags",
                  ].map((tip, i) => (
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
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-12 border-b border-border/30 pb-8">
              <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
                Advanced Features
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="card-neo p-6">
                  <h3 className="text-xl font-display font-medium text-foreground mb-3">
                    Reporting
                  </h3>
                  <p className="mb-3">
                    EchoOps provides detailed reporting features to help track
                    project progress and team performance.
                  </p>
                  <ul className="list-none pl-0 space-y-2">
                    {[
                      "Generate activity reports to see team engagement",
                      "Track project milestones and deadlines",
                      "Monitor integration status across platforms",
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
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-neo p-6">
                  <h3 className="text-xl font-display font-medium text-foreground mb-3">
                    Collaboration Tools
                  </h3>
                  <p className="mb-3">
                    Enhance team collaboration with built-in communication
                    tools.
                  </p>
                  <ul className="list-none pl-0 space-y-2">
                    {[
                      "Project-specific discussion boards",
                      "Comment directly on project elements",
                      "Share project status with stakeholders",
                    ].map((tool, i) => (
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
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <span>{tool}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">
                Need More Help?
              </h2>
              <p className="mb-6">
                If you have additional questions or need support, our team is
                here to help.
              </p>
              <div className="card-neo p-6">
                <h3 className="text-lg font-display font-medium text-foreground mb-3">
                  Support Resources
                </h3>
                <ul className="list-none pl-0 space-y-3">
                  <li className="flex items-start gap-3">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>
                      Check our{" "}
                      <span className="text-primary">
                        detailed documentation
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>
                      Contact support at{" "}
                      <span className="text-primary">support@echoops.org</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
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
                        d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                      />
                    </svg>
                    <span>
                      Join our community forum for tips from other users
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12">
              <Link
                href="/auth/signin"
                className="button-primary inline-flex items-center group"
              >
                <span>Get Started with EchoOps</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
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
