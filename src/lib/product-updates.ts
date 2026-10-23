export type ProductUpdate = {
  id: string;
  batch: number;
  date: string;
  title: string;
  summary: string;
  features: { title: string; description: string }[];
};

/** Newest first. Dates reflect recorded development batches, not deployment dates.
 * Historical sources: c280ceb, 0fc995a, f66b6e4 and db205d1. */
export const productUpdates: readonly ProductUpdate[] = [
  {
    id: "product-history",
    batch: 5,
    date: "2026-10-23",
    title: "A home for product updates",
    summary: "Follow the work that has gone into your restaurant workspace.",
    features: [
      {
        title: "What’s new",
        description:
          "A dedicated dashboard tab with a dated history of features, improvements and development batches.",
      },
      {
        title: "Shared release history",
        description:
          "The connected workspace and public demo show the same product history, separate from each restaurant’s activity log.",
      },
    ],
  },
  {
    id: "pilot-dashboard",
    batch: 4,
    date: "2026-10-23",
    title: "A more complete restaurant dashboard",
    summary:
      "Reporting, team tools, quality checks and a refreshed Settings experience.",
    features: [
      {
        title: "Restaurant setup checklist",
        description:
          "An overview checklist guides managers through restaurant details, employees, tipping tags and payment configuration.",
      },
      {
        title: "Employee insights",
        description:
          "Individual employee pages include tip and review history, rating breakdowns, associated tags and date filters.",
      },
      {
        title: "Reports and exports",
        description:
          "Filter by employee and date, compare periods, and export employee summaries. Gross tips, refunds and net amounts are shown separately; provider test payments are excluded.",
      },
      {
        title: "Printable QR materials",
        description:
          "Prepare employee cards or table stands from active tags, filter by employee, and print or save as PDF.",
      },
      {
        title: "Team access",
        description:
          "Owners can manage restaurant membership through Clerk. Managers retain access to restaurant operations; employees do not need accounts. Invitations are disabled in the public demo.",
      },
      {
        title: "Activity history",
        description:
          "Review restaurant-scoped changes and their recorded actors. Demo changes have a separate browser-only history.",
      },
      {
        title: "Dashboard polish",
        description:
          "Improved keyboard focus, mobile navigation and Escape behaviour, reduced-motion support, error recovery and a service health endpoint.",
      },
      {
        title: "Superuser testing",
        description:
          "An access-controlled Testing tab runs isolated database and browser checks, with individual results and clear limits for external services.",
      },
      {
        title: "Settings redesign",
        description:
          "A restaurant summary, cleaner section tabs, an improved details form, contextual help cards and responsive layouts bring Settings in line with the rest of the dashboard.",
      },
      {
        title: "Pilot preparation",
        description:
          "A documented checklist covers account setup, membership verification, provider checks, monitoring and recovery before a restaurant pilot.",
      },
    ],
  },
  {
    id: "payments-and-reuse",
    batch: 3,
    date: "2026-10-23",
    title: "Payment groundwork and reusable building blocks",
    summary: "A prepared Yoco integration and a cleaner application structure.",
    features: [
      {
        title: "Restaurant-specific Yoco integration",
        description:
          "Checkout is attributed to an employee and the restaurant’s merchant account. Test and live modes are explicit; demo payments remain available while provider setup is incomplete.",
      },
      {
        title: "Payment confirmation and protection",
        description:
          "Protected receipts, verified webhook signatures, repeat-event handling, checkout retry protection and refund tracking support provider-confirmed payment states.",
      },
      {
        title: "Expanded ratings table",
        description:
          "Browse written reviews and star ratings with employee, date, rating, review-text and payment-source filters.",
      },
      {
        title: "Clear simulation boundaries",
        description:
          "Browser-only simulated payments and reviews stay labelled and separate from persisted restaurant financial records.",
      },
      {
        title: "Reusable components",
        description:
          "Shared tables, filters, review forms, layout pieces and feature folders make the application more consistent and easier to extend.",
      },
      {
        title: "Formatting and documentation",
        description:
          "Prettier formatting, a refreshed GitHub README, application screenshots and integration guides make the project easier to navigate.",
      },
    ],
  },
  {
    id: "restaurant-workspaces",
    batch: 2,
    date: "2026-10-22",
    title: "Restaurant tipping and connected workspaces",
    summary:
      "The core restaurant experience, authentication, database storage and client demo.",
    features: [
      {
        title: "Restaurant landing page",
        description:
          "A restaurant-focused home page brings pricing and how-it-works content together, supported by help, privacy and terms pages. Unused starter content, images and the public team directory were removed.",
      },
      {
        title: "Secure restaurant workspaces",
        description:
          "Clerk sign-in and organization workspaces connect owners and managers to restaurant-scoped PostgreSQL records. Each restaurant’s data is kept separate.",
      },
      {
        title: "Employee management",
        description:
          "Create and edit staff profiles, generate individual tipping links, and archive or restore employees while preserving historical tips and reviews.",
      },
      {
        title: "QR and NFC tags",
        description:
          "Create employee-specific tag links, generate downloadable QR codes, and suspend or soft-delete tags. Archiving an employee suspends their links.",
      },
      {
        title: "Guest tipping and appreciation",
        description:
          "Guests can choose a tip amount without an account, try the simulated checkout and leave an employee star rating with optional written feedback.",
      },
      {
        title: "Dashboard and demo mode",
        description:
          "An overview, transaction history, settings and hardware drafts support restaurant management. A public demo uses sample data, while connected workspaces use their own records.",
      },
      {
        title: "Smoother navigation",
        description:
          "The dashboard menu stays in place while section-specific skeleton cards and tables indicate loading content.",
      },
    ],
  },
  {
    id: "project-foundation",
    batch: 1,
    date: "2026-10-22",
    title: "Project foundation",
    summary: "The starting point for the restaurant tipping application.",
    features: [
      {
        title: "Application setup",
        description:
          "Established the Next.js project, shared styling and initial configuration as a foundation for the restaurant product.",
      },
    ],
  },
];
