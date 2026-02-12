import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/role-context";
import { AppShell } from "@/components/app-shell";
import { getAllUsers } from "@/lib/queries";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elyndra — Placement Coordination",
  description: "Reduce paperwork triage time and communication friction in child-care placement",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allUsers = await getAllUsers();
  const usersForClient = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    homeId: u.homeId,
    homeName: u.homeName,
  }));

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <RoleProvider>
          <TooltipProvider>
            <AppShell allUsers={usersForClient}>{children}</AppShell>
          </TooltipProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
