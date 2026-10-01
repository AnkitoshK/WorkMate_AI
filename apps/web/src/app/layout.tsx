import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkMate | Team Tasks",
  description: "A simple task dashboard for field and office teams."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
