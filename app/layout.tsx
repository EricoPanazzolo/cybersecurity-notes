import type { Metadata } from "next";
import { Google_Sans, JetBrains_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cybersecurity Personal Notes",
  description: "A recon, enumeration, and web-security-testing tool reference.",
};

// GitHub Pages has no server to answer live search queries, so the search
// dialog is switched to the "static" client, which downloads the whole
// prebuilt index (app/api/search/route.ts) and searches it in the browser.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? "/cybersecurity-notes" : "";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider
          search={
            isGithubPages
              ? { options: { type: "static", api: `${basePath}/api/search` } }
              : undefined
          }
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
