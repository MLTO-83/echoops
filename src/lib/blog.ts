/**
 * Server-side helper for fetching blog posts from the EchoSEO Blog Center.
 * Uses the REST API directly (no SDK required on the server side).
 */

import { getSecret } from "./secrets";

const API_BASE = "https://echoseo-f8cb0.web.app/api";
const SITE_ID = "echoops";

async function getHeaders() {
    let token = process.env.ECHOSEO_CONSUMER_TOKENS;
    if (!token) {
        try {
            token = await getSecret("projects/83155172875/secrets/ECHOSEO_CONSUMER_TOKENS");
        } catch (err) {
            console.warn("[blog] Could not fetch token from Secret Manager, using fallback.", err);
            token = "d1167e5f759ca1b0957d37f84d019af7b32a986ca62dba3bfad2efe8348b1709";
        }
    }
    return {
        "x-consumer-token": token,
        "Content-Type": "application/json",
    };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlogPost {
    slug: string;
    title: string;
    excerpt?: string;
    description?: string;
    publishedAt?: string;
    createdAt?: string;
    coverImage?: string;
    author?: string;
    tags?: string[];
}

export interface BlogPostDetail extends BlogPost {
    content: string; // HTML body
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the list of all published blog posts.
 */
export async function getPosts(): Promise<BlogPost[]> {
    try {
        const res = await fetch(`${API_BASE}/posts/?siteId=${SITE_ID}`, {
            headers: await getHeaders(),
            // Revalidate every 5 minutes in production
            next: { revalidate: 300 },
        });

        if (!res.ok) {
            console.error(`[blog] getPosts failed: ${res.status} ${res.statusText}`);
            return [];
        }

        const data = await res.json();

        // The API may return { posts: [...] } or an array directly
        let postsData = [];
        if (Array.isArray(data)) postsData = data;
        else if (Array.isArray(data?.posts)) postsData = data.posts;

        return postsData.map((post: any) => ({
            ...post,
            coverImage: post.heroImageUrl || post.coverImage,
            description: post.metaDescription || post.description,
            tags: post.keywords || post.tags,
        }));
    } catch (err) {
        console.error("[blog] getPosts error:", err);
        return [];
    }
}

/**
 * Fetch a single blog post by slug.
 * Returns null if not found or on error.
 */
export async function getPost(slug: string): Promise<BlogPostDetail | null> {
    try {
        const res = await fetch(
            `${API_BASE}/posts/${encodeURIComponent(slug)}/?siteId=${SITE_ID}`,
            {
                headers: await getHeaders(),
                next: { revalidate: 300 },
            }
        );

        if (res.status === 404) return null;

        if (!res.ok) {
            console.error(`[blog] getPost failed: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json();

        // The API may return { post: {...} } or the object directly
        const post = data?.post ?? data;
        return {
            ...post,
            content: post.content_html || post.content,
            coverImage: post.heroImageUrl || post.coverImage,
            description: post.metaDescription || post.description,
            tags: post.keywords || post.tags,
        } as BlogPostDetail;
    } catch (err) {
        console.error("[blog] getPost error:", err);
        return null;
    }
}

/**
 * Format a date string for display.
 */
export function formatPostDate(dateStr?: string): string {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return dateStr;
    }
}
