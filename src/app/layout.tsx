import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ComplxSimple",
  description: "Interactive Tech learning platform by Cassandra Carter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}
        data-scroll-behavior="smooth"
        suppressHydrationWarning
      >
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
