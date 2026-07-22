# Repo cleanup and consolidation

Based on a repo-wide audit, here's what's safe to remove/consolidate. All changes are internal — no user-facing behavior changes.

## 1. Remove unused npm dependencies (26 packages)

None of these are imported anywhere in the app code (verified against `src/`, `index.html`, `supabase/`, tailwind config):

- **UI stacks not used:** `canvas-confetti`, `embla-carousel-react`, `input-otp`, `cmdk`, `vaul`, `react-resizable-panels`, `react-day-picker`
- **Form stack not used** (forms are hand-rolled with `useState` + inline `zod`): `react-hook-form`, `@hookform/resolvers`
- **Radix primitives with 0 usages:** `@radix-ui/react-accordion`, `-alert-dialog`, `-aspect-ratio`, `-avatar`, `-checkbox`, `-collapsible`, `-context-menu`, `-dialog`, `-hover-card`, `-menubar`, `-navigation-menu`, `-popover`, `-progress`, `-radio-group`, `-scroll-area`, `-separator`, `-toggle`, `-toggle-group`

`zod` itself stays (used directly in 4 files). All Radix packages that back actively-used shadcn components stay.

## 2. Remove corresponding unused shadcn UI shell files

`src/components/ui/` files matching the removed Radix packages will be deleted (accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, hover-card, menubar, navigation-menu, popover, progress, radio-group, scroll-area, separator, toggle, toggle-group, calendar, carousel, command, drawer, input-otp, resizable, form) — none are imported from outside `src/components/ui/`.

Also delete the dead re-export shim `src/components/ui/use-toast.ts` (nothing imports it).

## 3. Consolidate the dual toast systems onto `sonner`

Today the app ships **two** toast implementations mounted side-by-side in `App.tsx`:
- `sonner` — used by 6 files
- Radix-based shadcn toast — used by exactly 1 file (`PartPaymentSection.tsx`) plus the global mount

Actions:
- Switch `PartPaymentSection.tsx` from `useToast()` to `sonner`'s `toast.*` (same variants).
- Remove `<Toaster />` (Radix) from `App.tsx`, keep `<Sonner />`.
- Delete `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`, `src/hooks/use-toast.ts`.
- Uninstall `@radix-ui/react-toast`.

## 4. Consolidate currency formatting

Four parallel currency formatters exist today (`lib/currency.ts` canonical + `hooks/useCurrency.ts` wrapper + `utils/exportUtils.ts` local `formatCurrency` + `formatCurrencyForPDF` + an inline `en-IN` `fmt` in `pages/Index.tsx`).

Actions (no behavior change to displayed values):
- Keep `lib/currency.ts` as the single source of truth; extend it with a `formatCurrencyPlain` (no thin-space, for PDF/Excel where the special char breaks fonts) built on the same locale/code lookup.
- Replace `utils/exportUtils.ts`'s local `formatCurrency` and `formatCurrencyForPDF` with imports from `lib/currency.ts`.
- Replace the ad-hoc `fmt` in `pages/Index.tsx` with the shared helper.
- `hooks/useCurrency.ts` stays — it's the reactive wrapper, that's a legitimate role.

## 5. Not doing (deliberate)

- **Not** centralizing lucide-react icon imports into a barrel file. Direct per-file `import { X } from "lucide-react"` is the tree-shaking-friendly pattern; a barrel would hurt bundle size and IDE navigation. This is the standard shadcn convention.
- **Not** creating a `ui/index.ts` barrel for shadcn components — same reason.
- **Not** refactoring `AuthModal`/`ProfileModal` shared password-toggle logic in this pass. It's real duplication but touches auth UX and is out of scope for a cleanup pass; call it out for a future refactor.

## Verification

After changes: run the build (auto), spot-check that toasts still fire in Part Payments (duplicate-entry error path), and that Excel/PDF exports still show correctly formatted amounts.

## Technical notes

- Files deleted: ~25 unused `ui/*.tsx` files + 3 toast files + 1 shim = ~29 files.
- `package.json` change: 26 dependencies removed. `bun.lockb` regenerates automatically.
- No database, no route, no auth changes.
