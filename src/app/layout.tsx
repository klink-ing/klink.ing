import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Klink",
  description: "All things Klink",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/lpx7wod.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
