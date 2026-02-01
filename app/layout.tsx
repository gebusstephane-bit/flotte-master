import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./globals-mobile.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { LayoutShell } from "@/components/LayoutShell";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/branding";
import { ThemeProvider } from "next-themes";
import { PWAProvider } from "@/components/PWAProvider";
import { RealTimeNotifications } from "@/components/notifications/RealTimeNotifications";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PWAProvider>
            <AuthProvider>
              <LayoutShell>
                {children}
                <RealTimeNotifications />
              </LayoutShell>
            </AuthProvider>
            <Toaster />
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
