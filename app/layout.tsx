import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketflow",
  description: "Business growth and marketing dashboard for Zambian businesses."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
