import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSession } from "@/lib/auth";
import "./globals.css";

/* Load fonts (still useful even with monochrome palette) */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conciergo",
  description: "Your complete insurance dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white text-black antialiased`}
      >
        <header className="border-b border-black/10">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-semibold tracking-tight text-lg hover:opacity-80"
            >
              Conciergo
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {session ? (
                <>
                  <Link href="/dashboard" className="hover:underline">
                    Dashboard
                  </Link>
                  {/* Sign-out uses a server action form to avoid client bundle */}
                  <form action="/api/auth/signout" method="post">
                    <button className="underline">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/api/auth/signin" className="underline">
                  Sign in with Google
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
