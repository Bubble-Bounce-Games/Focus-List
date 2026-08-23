import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";

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
        className="font-sans antialiased bg-app text-foreground"
      >
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" theme="light" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
