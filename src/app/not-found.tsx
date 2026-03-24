import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for could not be found.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="text-8xl font-display font-bold text-primary/30">
          404
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Page Not Found
        </h1>
        <p className="text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link href="/" className="button-primary">
            Go Home
          </Link>
          <Link
            href="/blog"
            className="button-neo text-foreground hover:bg-primary/10 transition-all"
          >
            Read the Blog
          </Link>
        </div>
        <div className="pt-6 border-t border-border/30">
          <p className="text-sm text-muted-foreground mb-3">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/about" className="text-sm text-primary hover:underline">
              About
            </Link>
            <Link href="/how-to" className="text-sm text-primary hover:underline">
              How To
            </Link>
            <Link href="/privacy" className="text-sm text-primary hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-primary hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
