import type { Metadata, Viewport } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://echoops.dev";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "EchoOps — AI-Powered Product Building for Azure DevOps",
    template: "%s | EchoOps",
  },
  description:
    "Transform Project Managers into Product Builders with AI-driven insights. Integrate Azure DevOps, leverage multi-AI capabilities, and turn project data into actionable product strategies.",
  manifest: "/favicon/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "EchoOps",
    title: "EchoOps — AI-Powered Product Building for Azure DevOps",
    description:
      "Transform Project Managers into Product Builders with AI-driven insights. Integrate Azure DevOps, leverage multi-AI capabilities, and turn project data into actionable product strategies.",
    images: [
      {
        url: "/EchoOps logo.png",
        width: 1200,
        height: 630,
        alt: "EchoOps — AI-Powered Product Building",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EchoOps — AI-Powered Product Building for Azure DevOps",
    description:
      "Transform Project Managers into Product Builders with AI-driven insights.",
    images: ["/EchoOps logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon/favicon.ico", type: "image/x-icon" }],
    apple: [
      {
        url: "/favicon/apple-icon-57x57.png",
        sizes: "57x57",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-60x60.png",
        sizes: "60x60",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-76x76.png",
        sizes: "76x76",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-114x114.png",
        sizes: "114x114",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-120x120.png",
        sizes: "120x120",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        url: "/favicon/apple-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};
