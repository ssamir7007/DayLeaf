import "./global.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Dayleaf · Habit journal",
  description: "A quiet space to keep track of your daily habits.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Dayleaf" },
  icons: { apple: "/apple-icon" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
