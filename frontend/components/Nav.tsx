"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/namaz", label: "Namaz & Quran" },
  { href: "/todos", label: "To-do" },
  { href: "/water", label: "Water" },
  { href: "/time", label: "Time log" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? "on" : ""}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
