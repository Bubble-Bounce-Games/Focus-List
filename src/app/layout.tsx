import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const siteUrl = "https://focus-list.abhijeet-anand.com";
const title = "Focus-List — Personal Task Manager & Daily Task Tracker";
const description =
  "Organize projects, manage daily tasks, track progress, and review your habits with Focus-List, your personal task manager.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Focus-List",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Focus-List",
    title,
    description,
    images: [{ url: "/brand/focus-list-mark.png", alt: "Focus-List" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/brand/focus-list-mark.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body
        className="font-sans antialiased bg-app text-foreground"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Focus-List",
              alternateName: ["Focus List", "FocusList"],
              url: `${siteUrl}/`,
              description,
            }),
          }}
        />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
