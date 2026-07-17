"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppShell } from "@/context/AppShellContext";

type StudentDestination = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: (pathname: string, practice: boolean) => boolean;
};

const DESTINATIONS: StudentDestination[] = [
  {
    href: "/home",
    label: "Ask",
    icon: MessageCircleQuestion,
    active: (pathname, practice) => pathname.startsWith("/home") && !practice,
  },
  {
    href: "/book",
    label: "Courses",
    icon: BookOpen,
    active: (pathname) => pathname.startsWith("/book"),
  },
  {
    href: "/home?practice=1",
    label: "Practice",
    icon: ClipboardCheck,
    active: (pathname, practice) => pathname.startsWith("/home") && practice,
  },
  {
    href: "/space",
    label: "Progress",
    icon: ChartNoAxesColumnIncreasing,
    active: (pathname) => pathname.startsWith("/space"),
  },
];

export default function StudentMobileNav() {
  const { experienceMode } = useAppShell();
  const { t } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (experienceMode !== "student") return null;
  const practice = searchParams.get("practice") === "1";

  return (
    <nav
      aria-label={t("Student navigation")}
      className="student-mobile-nav fixed inset-x-0 bottom-0 z-[70] border-t border-[var(--border)] bg-[var(--card)]/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(46,38,30,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {DESTINATIONS.map(({ href, label, icon: Icon, active }) => {
          const selected = active(pathname, practice);
          return (
            <Link
              key={href}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11.5px] font-medium transition-colors ${
                selected
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] active:bg-[var(--muted)]/70"
              }`}
            >
              <Icon size={19} strokeWidth={selected ? 2 : 1.7} />
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
