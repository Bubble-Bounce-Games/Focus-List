import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focus List — Personal Task Manager",
  description:
    "A calm, local-only personal task manager. Track progress with a slider and keep all your work in one unified list.",
  icons: {
    icon: "/Favicon.png",
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
        className={`${ibmPlexSans.variable} font-sans antialiased bg-app text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" theme="light" richColors closeButton />
      </body>
    </html>
  );
}
