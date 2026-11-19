import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Daily Planner",
  description: "Namaz, Quran, to-dos and time tracking in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <header>
            <h1>🌙 My Daily Planner</h1>
          </header>
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
