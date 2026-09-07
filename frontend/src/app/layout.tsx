import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { QueryProvider } from "@/features/query/QueryProvider";
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
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
