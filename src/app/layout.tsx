import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import MotionProviders from "@/components/system/MotionProviders";

const tajawal = Tajawal({
  weight: ["300", "400", "500", "700", "800", "900"],
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "تلميحة — لعبة عربية جماعية لتخمين الكلمات في الوقت الفعلي. فريقان، لكل فريق قائد يعطي تلميحة من كلمة واحدة، والباقي يخمّنون الكلمات على اللوحة. تجنّبوا القاتل!";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "تلميحة 🍇", template: "%s · تلميحة" },
  description,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "تلميحة", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "تلميحة 🍇",
    description,
    siteName: "تلميحة",
    locale: "ar_AR",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "تلميحة 🍇",
    description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/", languages: { ar: "/" } },
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
      <body>
        {/* TooltipProvider is required by shadcn Tooltip. Sonner <Toaster/> is the
            single toast system; RTL + bottom-center matches the old brand toast UX.
            MotionProviders sets up LazyMotion + reduced-motion-aware MotionConfig. */}
        <MotionProviders>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionProviders>
        <Toaster dir="rtl" position="bottom-center" />
      </body>
    </html>
  );
}
