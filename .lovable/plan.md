
## Goal
Replace the heavily blue light-mode background with a professional, neutral "Paper & Ink" palette (off-white / warm gray / charcoal) while preserving all current layout, components, and dark mode behavior.

Palette:
- Page background: `#f5f3ee` (warm off-white)
- Secondary surface / borders: `#e8e4dd`
- Text / strong ink: `#2d2d2d` and `#0d0d0d`
- Accent (kept restrained for charts, active tabs, primary buttons): a muted ink-navy (`~#1f2937`) so the app still reads as a finance tool without going blue-heavy

## Scope
Light theme only. Dark theme stays as-is. No functional, layout, or copy changes.

## Changes

1. `src/index.css` — light theme `:root` tokens
   - `--background`, `--financial-background`: warm off-white (`#f5f3ee` in HSL)
   - `--foreground`: deep ink (`#2d2d2d`)
   - `--card`, `--popover`, `--secondary`, `--muted`, `--input`: light warm neutrals (`#faf8f4` / `#efece5`)
   - `--border`, `--glass-border`: `#e2ddd3`
   - `--primary`, `--accent`, `--ring`, `--financial-primary`: muted ink-navy charcoal (not bright blue)
   - `--glass-background-start/end`, `--glass-overlay`: warm off-white tones
   - `--card-gradient-start/end` and `--card-warm-start/end`: subtle paper gradient (off-white → light warm gray) so loan cards look like layered paper, not blue glass
   - `--card-danger-start/end`: keep soft red for Total Interest
   - `--tab-gradient-start/end`: charcoal → slate (replaces blue active-tab gradient)
   - `--shadow-card`: swap blue-tinted shadow for neutral gray shadow
   - `.glass-background` light gradient: replace blue stops with warm off-white stops (`#f5f3ee` → `#efece5` → `#f5f3ee`)
   - `.glass-card-3d::before` sheen: keep white highlight (already neutral)

2. No component file changes required — all surfaces consume the tokens above. `LoanBreakdownChart` (`glass-card-warm`) and `LoanSummaryCards` (`glass-card-danger` on Total Interest) keep their variants, now repainted via the new token values.

3. Dark mode (`.dark` block), `tailwind.config.ts`, fonts, and all TSX components: untouched.

## Verification
- Visit `/` in light mode: background reads as warm paper, cards as soft layered paper, Total Interest stays reddish, active tab pill is charcoal instead of blue.
- Toggle dark mode: unchanged.
- Spot-check tabs: Calculator, EMI Schedule, Compare Scenarios, Affordability — all should inherit new neutrals with no layout shift.
