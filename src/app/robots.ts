import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://echoops.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/blog", "/how-to", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/settings",
          "/projects/",
          "/test-email",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
