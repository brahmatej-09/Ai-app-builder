import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ClerkProvider } from "@clerk/nextjs";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Ai-app-Builder",
  description: "Done by Brahmatej",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en">
  <body
    className={`${lora.variable} ${dmSans.variable} font-sans bg-[#0a0a0a]`}
  >
    <ClerkProvider>
      <Header />
      <main>{children}</main>
    </ClerkProvider>
  </body>
</html>
  );
}