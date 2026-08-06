import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// The tab icon comes from src/app/icon.png and src/app/apple-icon.png, which
// Next wires up by file convention. They are generated from public/logo.png by
// `yarn icons` — do not add an `icons` key here, it would override them.
export const metadata: Metadata = {
  title: "Focus List — Personal Task Manager",
  description:
    "A calm, local-only personal task manager. Track progress with a slider and keep all your work in one unified list.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-app text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" theme="light" richColors closeButton />
      </body>
    </html>
  );
}
