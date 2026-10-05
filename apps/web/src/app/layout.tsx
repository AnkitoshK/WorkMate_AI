import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkMate AI · Jira & ServiceNow ITSM Operations",
  description: "Enterprise Service Management, Incident Lifecycle & AI Operations Copilot.",
};

// Read globals.css synchronously for server-side critical inlining
let inlinedStyles = "";
try {
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  if (fs.existsSync(cssPath)) {
    inlinedStyles = fs.readFileSync(cssPath, "utf-8");
  }
} catch (e) {
  // If read fails, standard globals.css import still handles styles
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {inlinedStyles ? (
          <style
            id="workmate-critical-theme"
            dangerouslySetInnerHTML={{ __html: inlinedStyles }}
          />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}

