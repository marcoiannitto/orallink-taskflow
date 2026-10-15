import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OralLink TaskFlow",
  description: "AI-powered task manager and CRM for OralLink",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-[#F7F7F7] text-[#153543]"
        style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
