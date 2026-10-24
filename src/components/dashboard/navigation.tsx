"use client";
import Link from "@/components/app-link";

type NavigationItem = readonly [label: string, href: string, icon: string];
const overview: NavigationItem = ["Overview", "/dashboard", "◫"];
const groups: { label: string; icon: string; items: NavigationItem[] }[] = [
  {
    label: "People",
    icon: "♧",
    items: [
      ["Employees", "/dashboard/employees", "♧"],
      ["Ratings", "/dashboard/ratings", "☆"],
      ["Compare employees", "/dashboard/comparisons", "⇄"],
    ],
  },
  {
    label: "Payments & reports",
    icon: "▤",
    items: [
      ["Tips & transactions", "/dashboard/tips", "↗"],
      ["Reports", "/dashboard/reports", "▤"],
      ["Operational alerts", "/dashboard/alerts", "◉"],
    ],
  },
  {
    label: "Tipping tools",
    icon: "▦",
    items: [
      ["QR & NFC tags", "/dashboard/tags", "▦"],
      ["Print QR materials", "/dashboard/print", "▦"],
      ["Hardware shop", "/dashboard/hardware", "▱"],
    ],
  },
  {
    label: "Workspace",
    icon: "⚙",
    items: [
      ["Guided setup", "/dashboard/setup", "◇"],
      ["Settings", "/dashboard/settings", "⚙"],
      ["Activity", "/dashboard/activity", "◷"],
      ["What’s new", "/dashboard/updates", "✧"],
    ],
  },
];
export const dashboardNavigation = [
  overview,
  ...groups.flatMap((group) => group.items),
  ["Testing", "/dashboard/testing", "✓"] as const,
];

export function DashboardNavigation({
  section,
  testingAllowed,
  onNavigate,
}: {
  section: string;
  testingAllowed: boolean;
  onNavigate: () => void;
}) {
  const current = `/dashboard${section ? `/${section}` : ""}`;
  const item = ([label, href, icon]: NavigationItem) => (
    <Link
      aria-current={current === href ? "page" : undefined}
      onClick={onNavigate}
      className={current === href ? "active" : ""}
      key={href}
      href={href}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Dashboard sections">
      {item(overview)}
      {groups.map((group) => {
        const active = group.items.some((entry) => entry[1] === current);
        return (
          <details
            key={`${group.label}:${section}`}
            open={active}
            className="navigation-group"
            data-active={active || undefined}
          >
            <summary>
              <span aria-hidden="true">{group.icon}</span>
              {group.label}
              <span className="navigation-chevron" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div className="navigation-children">{group.items.map(item)}</div>
          </details>
        );
      })}
      {testingAllowed && item(["Testing", "/dashboard/testing", "✓"])}
    </nav>
  );
}
