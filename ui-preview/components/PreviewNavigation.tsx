"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const pages = [
  ["Welcome", "/"],
  ["Login", "/login"],
  ["Onboarding", "/onboarding"],
  ["Student dashboard", "/student"],
  ["Student dashboard · empty", "/student?scenario=empty"],
  ["Assignment · awaiting submission", "/assignment/listening"],
  ["Assignment · submitted", "/assignment/introductions"],
  ["Assignment · graded", "/assignment/verbs"],
  ["Teacher dashboard", "/dashboard"],
  ["Assignment review", "/dashboard/assignment/verbs"],
  ["Class analytics", "/dashboard/analytics"],
  ["Student report", "/dashboard/analytics/camille"],
] as const;

export default function PreviewNavigation() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const Icon = expanded ? ChevronDown : ChevronUp;

  return (
    <aside className="pointer-events-none fixed right-4 bottom-4 z-[10001] flex w-[min(18rem,calc(100vw-2rem))] flex-col items-end gap-2 print:hidden">
      <nav
        id="preview-pages"
        aria-label="Preview pages"
        hidden={!expanded}
        className="pointer-events-auto max-h-[65dvh] w-full overflow-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"
      >
        {pages.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={pathname === href ? "page" : undefined}
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted aria-[current=page]:bg-muted"
          >
            {label}
          </Link>
        ))}
      </nav>
      <Button className="pointer-events-auto" aria-expanded={expanded} aria-controls="preview-pages" onClick={() => setExpanded(!expanded)}>
        Preview navigation <Icon />
      </Button>
    </aside>
  );
}
