import Link from "next/link";
import Image from "next/image";
import { getPosts, formatPostDate, BlogPost } from "@/lib/blog";
import { CalendarIcon, ArrowRightIcon } from "@heroicons/react/20/solid";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/seo/Breadcrumbs";

export async function generateStaticParams() {
    const posts = await getPosts();
    const tags = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).map((tag) => ({ tag }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ tag: string }>;
}): Promise<Metadata> {
    const { tag } = await params;
    const decoded = decodeURIComponent(tag);
    return {
        title: `Posts tagged "${decoded}"`,
        description: `Browse all EchoOps blog posts tagged with "${decoded}" — insights on AI-powered product building.`,
        alternates: { canonical: `/blog/tag/${tag}` },
    };
}

export default async function TagPage({
    params,
}: {
    params: Promise<{ tag: string }>;
}) {
    const { tag } = await params;
    const decoded = decodeURIComponent(tag);
    const allPosts = await getPosts();
    const filtered = allPosts.filter(
        (p) => p.tags?.some((t) => t.toLowerCase() === decoded.toLowerCase())
    );

    return (
        <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
            <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl" />
            <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl" />

            <div className="w-full max-w-6xl space-y-8">
                <Breadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Blog", href: "/blog" },
                        { label: `Tag: ${decoded}` },
                    ]}
                />

                <div className="space-y-1">
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                        Posts tagged &ldquo;{decoded}&rdquo;
                    </h1>
                    <p className="text-muted-foreground">
                        {filtered.length} {filtered.length === 1 ? "post" : "posts"} found
                    </p>
                </div>

                {filtered.length === 0 ? (
                    <div className="card-spatial flex flex-col items-center justify-center py-24 text-center">
                        <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                            No posts found
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            No posts match this tag.
                        </p>
                        <Link href="/blog" className="button-primary">
                            Browse all posts
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((post: BlogPost) => (
                            <Link
                                key={post.slug}
                                href={`/blog/${post.slug}`}
                                className="group card-neo flex flex-col overflow-hidden hover:scale-[1.02] transition-transform duration-200"
                            >
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
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {post.tags.slice(0, 3).map((t) => (
                                                <span
                                                    key={t}
                                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        t.toLowerCase() === decoded.toLowerCase()
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-primary/10 text-primary"
                                                    }`}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                        {post.title}
                                    </h2>
                                    {(post.excerpt ?? post.description) && (
                                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                                            {post.excerpt ?? post.description}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <CalendarIcon className="h-3.5 w-3.5" />
                                            <span>{formatPostDate(post.publishedAt ?? post.createdAt)}</span>
                                        </div>
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

            <footer className="w-full max-w-6xl mt-auto pt-8">
                <div className="border-t border-border/30 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-muted-foreground mb-4 md:mb-0">
                            &copy; {new Date().getFullYear()} EchoOps. All rights reserved.
                        </div>
                        <div className="flex space-x-6">
                            <Link href="/about" className="text-muted-foreground hover:text-primary">About</Link>
                            <Link href="/blog" className="text-muted-foreground hover:text-primary">Blog</Link>
                            <Link href="/how-to" className="text-muted-foreground hover:text-primary">How To</Link>
                            <Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy</Link>
                            <Link href="/terms" className="text-muted-foreground hover:text-primary">Terms</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
