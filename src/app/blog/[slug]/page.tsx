import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPost, getPosts, formatPostDate } from "@/lib/blog";
import { CalendarIcon, UserIcon, TagIcon } from "@heroicons/react/20/solid";
import type { Metadata } from "next";

// ─── Static params for incremental static regeneration ───────────────────────

export async function generateStaticParams() {
    const posts = await getPosts();
    return posts.map((p) => ({ slug: p.slug }));
}

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: "Post not found | EchoOps Blog" };

    return {
        title: `${post.title} | EchoOps Blog`,
        description: post.excerpt ?? post.description ?? post.title,
        openGraph: {
            title: post.title,
            description: post.excerpt ?? post.description,
            images: post.coverImage ? [{ url: post.coverImage }] : [],
        },
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) notFound();

    const publishDate = formatPostDate(post.publishedAt ?? post.createdAt);

    return (
        <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
            {/* Floating decoration elements */}
            <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl" />
            <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl" />

            <div className="w-full max-w-3xl space-y-8">
                {/* Back nav */}
                <div className="flex justify-between items-center">
                    <Link
                        href="/blog"
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
                        <span>All posts</span>
                    </Link>
                </div>

                {/* Cover image */}
                {post.coverImage && (
                    <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden">
                        <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            priority
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 800px"
                        />
                    </div>
                )}

                <article className="card-spatial relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2" />

                    <div className="relative z-10 space-y-6">
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <TagIcon className="h-4 w-4 text-muted-foreground" />
                                {post.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Title */}
                        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                            {post.title}
                        </h1>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border/30 pb-6">
                            {post.author && (
                                <div className="flex items-center gap-1.5">
                                    <UserIcon className="h-4 w-4" />
                                    <span>{post.author}</span>
                                </div>
                            )}
                            {publishDate && (
                                <div className="flex items-center gap-1.5">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>{publishDate}</span>
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        {post.content ? (
                            <div
                                className="prose prose-lg max-w-none text-foreground/80
                           prose-headings:font-display prose-headings:text-foreground
                           prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                           prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                           prose-pre:bg-muted prose-pre:rounded-xl
                           prose-img:rounded-xl"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                        ) : (
                            <p className="text-muted-foreground italic">
                                No content available for this post.
                            </p>
                        )}
                    </div>
                </article>

                {/* Back to blog CTA */}
                <div className="text-center pb-8">
                    <Link href="/blog" className="button-neo inline-flex items-center gap-2 text-foreground hover:bg-primary/10 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to all posts
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full max-w-3xl mt-auto pt-4">
                <div className="border-t border-border/30 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-muted-foreground mb-4 md:mb-0">
                            © {new Date().getFullYear()} EchoOps. All rights reserved.
                        </div>
                        <div className="flex space-x-6">
                            <Link href="/about" className="text-muted-foreground hover:text-primary">About</Link>
                            <Link href="/blog" className="text-muted-foreground hover:text-primary">Blog</Link>
                            <Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy</Link>
                            <Link href="/terms" className="text-muted-foreground hover:text-primary">Terms</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
