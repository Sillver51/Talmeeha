import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  weight: ["300", "400", "500", "700", "800", "900"],
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تلميحة 🍇",
  description: "لعبة الفرق والكلمات",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions inject attributes (e.g. crxemulator)
    // onto <html> before React hydrates; this scopes the suppression to this element only.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={tajawal.variable}>{children}</body>
    </html>
  );
}
