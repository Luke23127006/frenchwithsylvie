---
name: french-with-sylvie-ui
description: Apply the existing French with Sylvie UI conventions when editing or adding screens, layouts, or components in the local preview or production app.
---

# French with Sylvie UI

Use the repository's branch scope in `AGENTS.md`. Start with the existing screen and its closest neighboring screen. Preserve the established layout and visual language for parts the request does not redesign.

## Components and layout

- Reuse the target app's primitives in `components/ui/`, including `Button`, `Card`, `Badge`, `Dialog`, `Select`, and `Table`. Use their existing variants and sizes. For button-styled links, use `Button asChild` with `Link` to keep a single interactive element.
- Use Tailwind utilities, `cn()` for conditional class composition, and Lucide for icons. Give icon-only controls an accessible name. Keep the built-in keyboard and focus behavior of Radix primitives.
- Follow the screen's existing responsive shell. Dashboard pages use `container mx-auto p-4 md:p-8` with `max-w-4xl` for the student list and `max-w-6xl` for the teacher dashboard and analytics. The review page uses `max-w-7xl` for its wider workspace.
- Use Geist, the current page heading scale, and concise English labels unless the user requests different copy or typography. Keep empty, loading, error, and success states consistent with nearby screens.

## Color and theme

- Use semantic Tailwind colors such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, and `ring-ring`. The theme lives in `ui-preview/app/preview.css` for preview and `next-app/app/globals.css` for production.
- The palette uses teal for primary actions, coral for secondary accents, warm cream for the light background, and deep slate-teal for dark mode. Match the current screen's status treatments. For example, green marks submissions or completion, amber marks work needing attention, and destructive actions use the destructive variant.
- Check the changed screen at narrow and wide widths and in both themes when changing layout or colors. Preserve print styles when editing analytics reports.

## Preview workflow

- Keep preview scenarios in `lib/mock-data.ts` and simulated operations in `lib/actions/`, relative to `ui-preview/`. Preview flows use local data and stay independent of the production API and credentials.
- Use **Preview navigation** to reach the relevant screen and run `npm run typecheck` from `ui-preview/` when changing its TypeScript.
