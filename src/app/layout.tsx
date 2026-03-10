import "./globals.css";
import "./components/theme-fix.css";
import { metadata, viewport } from "./metadata";
import RootLayoutClient from "./layout-client";

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <RootLayoutClient>{children}</RootLayoutClient>
    </html>
  );
}
