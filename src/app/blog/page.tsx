import Link from "next/link";
import Image from "next/image";
import { getPosts, formatPostDate, BlogPost } from "@/lib/blog";
import { CalendarIcon, ArrowRightIcon } from "@heroicons/react/20/solid";

export const metadata = {
    title: "Blog | EchoOps",
    description:
        "Insights, guides, and updates from the EchoOps team on AI-powered product building.",
};

export default async function BlogPage() {
    const posts = await getPosts();

    return (
        <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
            {/* Floating decoration elements */}
            <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl" />
            <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl" />

            <div className="w-full max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                    <div className="space-y-1">
                        <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                            Blog
                        </h1>
                        <p className="text-muted-foreground">
                            Insights and updates from the EchoOps team
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="button-neo text-foreground hover:bg-primary/10 transition-all duration-300 flex items-center gap-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
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

                {/* Posts grid */}
                {posts.length === 0 ? (
                    <div className="card-spatial flex flex-col items-center justify-center py-24 text-center">
                        <div className="text-5xl mb-4">📝</div>
                        <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                            No posts yet
                        </h2>
                        <p className="text-muted-foreground">
                            Check back soon — articles are on their way.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post: BlogPost) => (
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
                            <Link href="/about" className="text-muted-foreground hover:text-primary">About</Link>
                            <Link href="/blog" className="text-muted-foreground hover:text-primary">Blog</Link>
                            <Link href="/how-to" className="text-muted-foreground hover:text-primary">How To</Link>
                            <Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy</Link>
                            <Link href="/terms" className="text-muted-foreground hover:text-primary">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
