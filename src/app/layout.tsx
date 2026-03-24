import "./globals.css";
import "./components/theme-fix.css";
import { metadata, viewport } from "./metadata";
import RootLayoutClient from "./layout-client";
import JsonLd from "@/components/seo/JsonLd";

export { metadata, viewport };

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://echoops.dev";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EchoOps",
  url: baseUrl,
  logo: `${baseUrl}/EchoOps logo.png`,
  description:
    "AI-powered platform that transforms Project Managers into Product Builders through Azure DevOps integration and multi-AI insights.",
  sameAs: [],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "EchoOps",
  url: baseUrl,
  description:
    "AI-Powered Product Building for Azure DevOps",
  publisher: {
    "@type": "Organization",
    name: "EchoOps",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "EchoOps",
  url: baseUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Transform Project Managers into Product Builders with AI-driven insights. Seamlessly integrate with Azure DevOps and leverage multi-AI capabilities.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        <JsonLd data={softwareSchema} />
      </head>
      <RootLayoutClient>{children}</RootLayoutClient>
    </html>
  );
}
