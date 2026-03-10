import Link from "next/link";
import Image from "next/image";

export default function About() {
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
              About EchoOps
            </h1>
            <p className="text-muted-foreground">
              Our story and mission
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
              EchoOps is a comprehensive project management platform designed to
              streamline workflows for development teams and organizations.
            </p>

            <h2 className="text-2xl font-display font-semibold text-foreground mt-10 mb-4">
              Our Mission
            </h2>
            <p>
              Our mission at EchoOps is to simplify project management by
              providing a central hub that integrates seamlessly with the tools
              developers already use. We believe in making project oversight
              accessible and intuitive, allowing teams to focus on what they do
              best: building great software.
            </p>

            <h2 className="text-2xl font-display font-semibold text-foreground mt-10 mb-4">
              The Team
            </h2>
            <p>
              EchoOps was built by a team of experienced developers who
              experienced first-hand the challenges of managing complex projects
              across multiple systems. Our collective experience spans decades
              in software development, project management, and team leadership.
            </p>

            <h2 className="text-2xl font-display font-semibold text-foreground mt-10 mb-4">
              Our Approach
            </h2>
            <p>We've designed EchoOps around several core principles:</p>
            <ul className="list-none pl-0 mb-6 space-y-4">
              {[
                {
                  title: "Integration First",
                  desc: "We connect with the development tools you already use rather than forcing you to adopt new systems.",
                },
                {
                  title: "Simplicity",
                  desc: "Clean interfaces and intuitive workflows help teams get started quickly.",
                },
                {
                  title: "Flexibility",
                  desc: "Customizable tagging and organization systems adapt to your team's unique needs.",
                },
                {
                  title: "Security",
                  desc: "Your project data remains private and secure with robust protection measures.",
                },
              ].map((item, i) => (
                <li className="flex items-start gap-3" key={i}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary mt-1 flex-shrink-0"
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
                  <div>
                    <span className="font-medium text-foreground">
                      {item.title}:
                    </span>{" "}
                    <span>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>

            <h2 className="text-2xl font-display font-semibold text-foreground mt-10 mb-4">
              Get Started Today
            </h2>
            <p>
              Ready to streamline your project workflow? Sign up for EchoOps
              today and experience a new way to manage your development
              projects.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/signin"
                className="button-primary inline-flex items-center group"
              >
                <span>Get Started</span>
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
