import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focus List — Personal Task Manager",
  description:
    "A calm, local-only personal task manager. Track progress with a slider and keep all your work in one unified list.",
  icons: {
    icon: "/logo.svg",
  },
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
