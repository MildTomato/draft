import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { TooltipProvider } from "@/components/ui/tooltip"

import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://draft.jonny.design"),
  title: {
    default: "Draft — Technical diagrams, still in motion",
    template: "%s — Draft",
  },
  description:
    "Create precise, editable technical diagrams on an infinite canvas.",
  openGraph: {
    title: "Draft",
    description:
      "Create precise, editable technical diagrams on an infinite canvas.",
    type: "website",
    url: "/",
    siteName: "Draft",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
