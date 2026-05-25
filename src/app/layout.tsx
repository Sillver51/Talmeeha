import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const tajawal = Tajawal({
  weight: ["300", "400", "500", "700", "800", "900"],
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تلميحة 🍇",
  description: "لعبة الفرق والكلمات",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "تلميحة", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions inject attributes (e.g. crxemulator)
    // onto <html> before React hydrates; this scopes the suppression to this element only.
    <html lang="ar" dir="rtl" suppressHydrationWarning className={tajawal.variable}>
      <body className={tajawal.variable}>
        {/* TooltipProvider is required by shadcn Tooltip; Sonner <Toaster/> is
            additive — the existing brand <Toast> keeps working alongside it. */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
