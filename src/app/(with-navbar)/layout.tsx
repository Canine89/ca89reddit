"use client";
import NavBar from "@/components/NavBar";

export default function WithNavbarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main>{children}</main>
    </>
  );
} 