import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";
import ToastViewport from "@/components/common/ToastViewport";
import { AppShellProvider } from "@/context/AppShellContext";
import { I18nClientBridge } from "@/i18n/I18nClientBridge";

// Noto keeps English and Devanagari visually consistent across Hindi,
// Bundeli and the English technical terms used throughout a university course.
const fontSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: "variable",
  display: "swap",
  variable: "--font-sans",
});

// A restrained serif is reserved for institutional headings and lesson titles;
// body copy stays in the more legible Noto Sans family.
const fontSerif = Noto_Serif_Devanagari({
  subsets: ["latin", "devanagari"],
  weight: "variable",
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Drona",
  description: "Agent-native intelligent learning companion",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${fontSans.variable} ${fontSerif.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body
        className="font-sans bg-[var(--background)] text-[var(--foreground)]"
        suppressHydrationWarning
      >
        <AppShellProvider>
          <I18nClientBridge>{children}</I18nClientBridge>
          <ToastViewport />
        </AppShellProvider>
      </body>
    </html>
  );
}
