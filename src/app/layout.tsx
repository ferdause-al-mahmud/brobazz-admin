import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Brobazz Admin", template: "%s · Brobazz Admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={`${manrope.variable} h-full`} lang="en">
      <body className="min-h-full">
        {children}
        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
