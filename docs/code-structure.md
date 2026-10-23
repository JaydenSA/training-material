# Component structure

`src/components/tipit-app.tsx` selects the page for the current route. Page implementations live in feature directories:

- `dashboard/`: the persistent menu/layout, overview, transactions, ratings, employees, tags/QR generation, hardware drafts, settings, and loading skeletons.
- `public/`: landing page, pricing, how it works, account/onboarding screens, and informational pages. Pricing and how-it-works components also support embedded landing-page sections.
- `tipping/`: employee tipping page, demo receipt, Yoco receipt, and the receipt-mode dispatcher.

Keep business rules and persistence in `src/lib` and API routes. A shared UI component should receive values and callbacks rather than deciding whether to write to Neon, local storage, or Yoco.

## Shared components

- `DataTable<Row>`: accessible headers, row identity, cell rendering, horizontal scrolling, and empty-state display. Ratings and transactions define their own typed columns and filtering rules.
- `FilterSelect`: labelled filter choices with an optional visually unlabelled mode for existing compact toolbars. It keeps controlled values and change handlers in the feature page.
- `ReviewForm`: star selection, optional text, shared review-length limit, unique help text IDs, and saving state. Both demo and Yoco receipts use it. Each receipt keeps its own submission logic.
- `RatingStars` and `ReviewConfirmation`: consistent rating and submitted-review display.
- `ui.tsx`: existing branding, avatars, badges, headings, empty states, public header/footer, and workspace notice.
- `app-link.tsx`: preserves the `/demo` route prefix. Use this component for internal navigation so demo links stay isolated.

## State and helpers

`useWorkspace()` in `workspace-context.tsx` is the UI's interface to workspace state, readiness, and updates. It works with both database and browser-demo providers. Consumer components import the context hook directly rather than importing provider implementations and their server-integration dependencies.

`DemoProvider` selects the correct provider. `DatabaseProvider` continues to enforce restaurant scope, loading state, optimistic mutation handling, and API error behaviour. Refactoring UI does not change those boundaries.

`src/hooks/use-simulated-reviews.ts` synchronises browser-only simulated reviews. It never writes to Neon.

- `src/lib/format.ts`: South African date labels and filter keys.
- `src/lib/csv.ts`: CSV quoting, spreadsheet-formula neutralisation, and browser download handling.
- `src/lib/reviews.ts`: the review length shared by the form and review-submission API. Database constraints continue to enforce the same limit independently.

Prefer a local component until a pattern is used in multiple places. Add shared components around actual repeated behaviour; avoid one configuration-driven component that handles unrelated page workflows.

## Formatting and readability

Run `pnpm format` to format the project and `pnpm format:check` to check it without rewriting files. Prettier is pinned as a development dependency and configured in `.prettierrc.json`; `.editorconfig` supplies matching indentation and line-ending settings for editors.

Generated files, migrations, dependency lockfiles, test output, and local environment files are excluded. Keep conditions and callbacks readable with descriptive names and small functions; formatting complements the feature boundaries rather than replacing them.
