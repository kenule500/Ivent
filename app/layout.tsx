import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Toaster } from "@/components/ui/sonner";
import AdminAwareLayout from "@/components/AdminAwareLayout";
import { LiveRegionProvider } from "@/components/a11y/live-region";
import { LocaleProvider } from "@/components/locale-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { getLocaleResolution } from "@/lib/i18n/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ivent",
    template: "%s | Ivent",
  },
  description: "Discover and create amazing events",
  applicationName: "Ivent",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ivent",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, requested } = await getLocaleResolution();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-linear-to-br from-gray-950 via-zinc-900 to-stone-900 text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider initialLocale={locale} unsupportedLocale={requested}>
            <ClerkProvider appearance={{ theme: dark }}>
              <ConvexClientProvider>
                <LiveRegionProvider>
                  <AdminAwareLayout>{children}</AdminAwareLayout>
                </LiveRegionProvider>
                <Toaster position="top-center" richColors />
                <ServiceWorkerRegister />
              </ConvexClientProvider>
            </ClerkProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


// 1/ check the layers you have in each part 
//  a- check and make clean code 
// b - recheck each time the time in network