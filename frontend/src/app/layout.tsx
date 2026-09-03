import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecommerce Assessment",
  description: "Phase 1 foundation for a mini e-commerce platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
