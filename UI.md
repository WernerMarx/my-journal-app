# UI.md — Frontend UI Architecture

Technical record of the Phase 5.6 UI redesign. Covers the design system,
component architecture, implementation patterns, and lessons learned. Read this
before adding new pages or components.

---

## Visual direction

Calm, premium, minimal — closer to Notion or Linear than to a typical CRUD app,
but warmer. The aesthetic is "morning journal on paper": warm off-white
background, dark brown text, a dusty-blue accent for interactive elements, and
a serif typeface for headings and body text.

---

## Tech stack

| Tool | Version | Role |
|---|---|---|
| Tailwind CSS | v4 (`@tailwindcss/vite`) | Utility classes, design tokens |
| shadcn/ui | (copied primitives) | Accessible, unstyled Radix components with Tailwind styling |
| Radix UI | `@radix-ui/react-*` | Headless primitives (Dialog, DropdownMenu, Separator, Slot) |
| `class-variance-authority` | latest | `cva()` for variant-aware component APIs |
| `clsx` + `tailwind-merge` | latest | Safe class merging via `cn()` |
| `lucide-react` | latest | Icon library |
| `tailwindcss-animate` | latest | CSS animation keyframes for Radix transitions |

Tailwind v4 requires **no `tailwind.config.js`**. All configuration lives inside
`frontend/src/index.css`.

---

## Design tokens

All tokens are CSS custom properties in `frontend/src/index.css`. They are
declared in `:root` and then mapped into Tailwind utility classes via `@theme
inline`. **Never hardcode hex values in components** — always use a token.

### Semantic tokens (Tailwind utilities)

| Token | Value | Tailwind class | Usage |
|---|---|---|---|
| `--background` | `#f7f5f1` | `bg-background` | Page background (warm paper) |
| `--foreground` | `#3b3833` | `text-foreground` | Body text |
| `--card` | `#ffffff` | `bg-card` | Card / surface background |
| `--card-foreground` | `#3b3833` | `text-card-foreground` | Text on card |
| `--primary` | `#557099` | `bg-primary` / `text-primary` | CTA buttons, active states |
| `--primary-foreground` | `#ffffff` | `text-primary-foreground` | Text on primary bg |
| `--secondary` | `#f1ede7` | `bg-secondary` | Subtle fills, hover backgrounds |
| `--secondary-foreground` | `#3b3833` | `text-secondary-foreground` | Text on secondary bg |
| `--muted` | `#f1ede7` | `bg-muted` | Muted surfaces |
| `--muted-foreground` | `#908a80` | `text-muted-foreground` | Helper text, labels, placeholders |
| `--accent` | `#e9eff6` | `bg-accent` | Soft hover bg, sidebar active bg |
| `--accent-foreground` | `#455e82` | `text-accent-foreground` | Text on accent bg |
| `--destructive` | `#b3596b` | `bg-destructive` / `text-destructive` | Delete / error actions |
| `--border` | `#e6e0d6` | `border-border` | Card and container borders |
| `--input` | `#d8d0c4` | `border-input` | Input field borders |
| `--ring` | `#6f93bd` | `ring-ring` | Focus rings |

### Journal palette (mood / accent companions)

| Token | Value | Tailwind class | Usage |
|---|---|---|---|
| `--sage` | `#9cc3a8` | `bg-sage` | Mood: good / positive |
| `--blush` | `#e6b8c2` | `bg-blush` | Mood: low / negative |
| `--amber-warm` | `#e8c79a` | `bg-amber-warm` | Mood: neutral / diet |

### Border-radius scale

| Token | Value | Tailwind class |
|---|---|---|
| `--radius-sm` | `8px` | `rounded-sm` (overridden via `@theme inline`) |
| `--radius-md` | `10px` | `rounded-md` |
| `--radius-lg` | `12px` | `rounded-lg` |
| `--radius-xl` | `16px` | `rounded-xl` |

### Font stacks

```css
--font-sans:  system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, Cambria, serif;
```

Use `font-serif` for page headings (`PageHeader`), entry titles, and the
editor's reading surface. Everything else is `font-sans`.

---

## Component architecture

### Layer 1 — shadcn/ui primitives (`src/components/ui/`)

Low-level building blocks. These are the Tailwind-styled wrappers around Radix
UI headless components. Do not bypass them with raw HTML equivalents when one
exists.

| File | Component(s) | When to use |
|---|---|---|
| `button.jsx` | `Button`, `buttonVariants` | Every visible button; use `variant` and `size` props |
| `input.jsx` | `Input` | Single-line text inputs |
| `textarea.jsx` | `Textarea` | Multi-line text inputs |
| `card.jsx` | `Card`, `CardContent`, `CardHeader`, `CardTitle` | Surfaced containers |
| `dialog.jsx` | `Dialog`, `DialogContent`, `DialogHeader`, … | Modal dialogs |
| `dropdown-menu.jsx` | `DropdownMenu`, `DropdownMenuItem`, … | Context / action menus |
| `badge.jsx` | `Badge` | Status chips, data-type tags, system-tracker labels |
| `separator.jsx` | `Separator` | Horizontal rule between sections |
| `skeleton.jsx` | `Skeleton` | Loading placeholder blocks |

**Button variants:**

| Variant | Look | When to use |
|---|---|---|
| `default` | Filled primary blue | Primary CTA (Save, Add, Search) |
| `outline` | Bordered, transparent | Secondary actions (Edit, Cancel, Browse filters) |
| `destructive` | Filled red | Permanent destructive actions |
| `ghost` | Transparent, hover bg | Sidebar nav, icon-only buttons |
| `secondary` | Muted fill | Tertiary actions |
| `link` | Underline on hover | In-line text links |

**Button sizes:** `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (h-9 w-9).

### Layer 2 — layout shell (`src/components/layout/`)

| File | Purpose |
|---|---|
| `AppShell.jsx` | Root layout: fixed sidebar on desktop, slide-in drawer on mobile, `<main>` content area |
| `Sidebar.jsx` | Nav links (Write / Browse / Trackers), user email, sign-out button |
| `PageHeader.jsx` | Reusable page-level heading: `title`, `subtitle`, optional `action` slot |

`Layout.jsx` (the React Router outlet wrapper) just renders `<AppShell>`. Do not
add layout logic to `Layout.jsx`.

### Layer 3 — ui-kit (`src/components/ui-kit/`)

Opinionated, reusable page-level states.

| File | Props | When to use |
|---|---|---|
| `EmptyState.jsx` | `icon`, `title`, `description`, `action?` | Empty lists, zero-result search |
| `LoadingState.jsx` | (`EntryListSkeleton` named export) | Loading lists of entries |
| `ErrorState.jsx` | `message`, `className?` | API failure banners |

### Layer 4 — domain components (`src/components/`)

| File | Purpose |
|---|---|
| `EntryEditor.jsx` | Full write surface: title input, body textarea, tracker section, attachments, save |
| `TrackerInputs.jsx` | Per-day tracker widgets (renders a widget per data_type); inline create form |
| `TrackerForm.jsx` | Create / edit a tracker definition; used in both `ManageTrackers` and `TrackerInputs` |
| `AttachmentGallery.jsx` | Photo grid with upload and delete; read-only mode for `EntryDetail` |

### Layer 5 — pages (`src/pages/`)

| File | Route | Notes |
|---|---|---|
| `Login.jsx` | `/login` | Standalone, no AppShell |
| `Write.jsx` | `/write`, `/write/:date` | Date-nav header, delegates to `EntryEditor` |
| `Browse.jsx` | `/browse` | Search form + paginated entry cards |
| `EntryDetail.jsx` | `/entries/:date` | Read-only view; resolves prev/next neighbors |
| `ManageTrackers.jsx` | `/trackers` | CRUD tracker definitions |

---

## `index.css` structure

```
@import "tailwindcss"         ← Tailwind v4 (includes preflight)
@plugin "tailwindcss-animate" ← animation keyframes

@theme inline { ... }         ← maps CSS vars → Tailwind utility names
                                (color-*, radius-*, font-*)

:root { ... }                 ← single source of truth for all token values
                                (semantic + journal palette + shadows)

@layer base { ... }           ← minimal element resets on top of preflight
                                (body, headings, links, form elements, button)
```

The `:root` block is the **only** place to change token values. Do not define
new colours anywhere else. Dark mode will add a second `:root` (or
`@media (prefers-color-scheme: dark)`) block here.

---

## Patterns

### Composing class names

Always use `cn()` from `src/lib/utils.js`:

```jsx
import { cn } from "@/lib/utils";

<div className={cn("base-classes", condition && "conditional-class", className)} />
```

`cn()` is `clsx` + `tailwind-merge`. `tailwind-merge` deduplicates conflicting
Tailwind utilities (e.g. passing both `p-2` and `p-4` keeps only `p-4`). String
concatenation bypasses this and produces wrong styles.

### Styling icon-only buttons

Do **not** use the `Button` component for icon-only buttons where you need a
completely transparent, borderless control. Use a bare `<button>` with explicit
Tailwind classes covering every property:

```jsx
<button
  onClick={handler}
  className="inline-flex items-center justify-center w-8 h-8 rounded-lg
             text-muted-foreground hover:text-foreground hover:bg-secondary
             transition-colors"
>
  <ChevronLeft className="w-4 h-4" />
</button>
```

Key: include `w-N h-N` (fixed size), the icon `w-N h-N`, a color class, and a
hover state. Do **not** rely on any default styling — the `@layer base` button
rule is intentionally minimal (see Pitfalls below).

Alternatively, use `<Button variant="ghost" size="icon">`.

### Card surfaces

Standard card pattern:

```jsx
<div className="bg-card border border-border rounded-xl shadow-sm px-6 py-5">
  {/* content */}
</div>
```

Or use the `Card` + `CardContent` components from `src/components/ui/card.jsx`.

### Form field layout

```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-medium text-muted-foreground">
    Field label
  </label>
  <Input ... />
</div>
```

Use `grid grid-cols-1 sm:grid-cols-2 gap-4` to arrange fields in a 2-column
grid that collapses to 1 column on mobile.

### Select elements (raw `<select>`)

When not using a Radix `Select` component, style raw selects consistently:

```jsx
<select
  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1
             text-sm shadow-sm transition-colors focus-visible:outline-none
             focus-visible:ring-1 focus-visible:ring-ring
             disabled:cursor-not-allowed disabled:opacity-50"
>
```

This matches the `Input` component's visual style. Note `bg-transparent` is
required — the `@layer base` input rule sets a white background by default.

### Loading states

Use `Skeleton` for individual elements, or the `EntryListSkeleton` component
for entry lists. Never show a bare "Loading…" string — always use skeleton
placeholders to avoid layout shift.

### Error states

Use `<ErrorState message={error} className="mb-5" />` inline (not a toast or
modal) for page-level API errors. Clear the error on retry.

---

## Pitfalls and lessons learned

### The base button padding problem

**What happened:** Icon-only chevron buttons in `Write.jsx` were rendering as
invisible white squares. The `ChevronLeft` SVG was not showing.

**Root cause:** `@layer base` had a `button` rule with `padding: 0.5rem 0.95rem`
(8 px × 15 px). The buttons were sized `w-8 h-8` (32 × 32 px). With
`box-sizing: border-box`, the 30 px of horizontal padding left only 2 px of
content width — the 16 px SVG had no room. Additionally, `background: var(--card)`
painted a white fill over what were meant to be transparent ghost buttons.

**Fix:** Reduced the `@layer base` button rule to:
```css
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

Tailwind's preflight (included in `@import "tailwindcss"`) already resets all
browser button defaults. The base layer must not add visual styles back — every
button that needs a visual style either uses the `Button` component or sets
explicit Tailwind utilities.

**Rule:** Never put `background`, `border`, or `padding` on the bare `button`
selector in `@layer base`.

### Tailwind v4 CSS layer cascade

Tailwind v4 defines three layers: `base < components < utilities`. Styles in
`@layer base` are always overridden by utility classes. This is intentional —
base styles are fallbacks and normalisations, not design.

The implication: it is safe to add element-level styles to `@layer base` (e.g.
heading font families, link colours) because any component that needs to
override them can do so with a Tailwind utility class. However, keep base styles
minimal — if every component overrides a base style, the base style is noise.

### `@theme inline` vs `:root`

`@theme inline` teaches Tailwind what the utility class names mean (e.g.
`bg-background` → `background-color: var(--background)`). `:root` defines the
actual values of those CSS variables. You need both:

- Change the *name* of a utility? Edit `@theme inline`.
- Change the *value* of a token? Edit `:root`.
- Add a brand new token? Add it to both.

### `bg-transparent` is required on `Input` and raw `<select>`

The `@layer base` rule for form inputs sets `background: var(--card)` (white).
The shadcn `Input` component explicitly includes `bg-transparent` to override
this and let the parent surface show through. Any raw `<input>`, `<select>`, or
`<textarea>` that should be transparent must also include `bg-transparent`.

### `NavBar.jsx` was dead code

After the layout was refactored to use `AppShell → Sidebar`, the top-nav
`NavBar.jsx` was never imported by any route. It was deleted in Phase 5.6.
Before deleting any component, verify no import exists: `grep -r "NavBar" src/`.

---

## Rules for new components and pages

1. **Always start with tokens.** New colours or sizes belong in `:root` first,
   then wired into `@theme inline`. Never hardcode a hex or a px value in a
   component.

2. **Use the Button component for all labelled buttons.** Only use bare
   `<button>` for ghost/icon buttons, and when you do, set every visual property
   explicitly via Tailwind.

3. **Every new page gets a `PageHeader`.** Title + subtitle + optional action
   slot. Do not roll a custom heading block.

4. **Provide empty, loading, and error states.** Use `EmptyState`, `Skeleton`
   (or `LoadingState`), and `ErrorState` from `src/components/ui-kit/`. Never
   omit loading states — they prevent layout shift.

5. **Mobile first.** Start with single-column layout. Add `sm:` or `md:`
   breakpoints for wider arrangements. Test at 375 px.

6. **No inline styles.** Use Tailwind utilities. If you find yourself writing
   `style={{ ... }}`, that is a signal that a token or utility is missing.

7. **Use `cn()` for conditional classes.** Never build class strings with
   template literals or string concatenation.

8. **Icons from lucide-react only.** Import by name; always provide explicit
   `className="w-N h-N"` so size is never inherited from a base rule.

---

## File layout (frontend)

```
frontend/src/
  index.css                    ← ALL design tokens + base element styles
  lib/
    utils.js                   ← cn() utility
  components/
    ui/                        ← shadcn/ui primitives (button, input, card, …)
    layout/
      AppShell.jsx             ← root shell (sidebar + main)
      Sidebar.jsx              ← nav + user info
      PageHeader.jsx           ← page-level heading component
    ui-kit/
      EmptyState.jsx
      LoadingState.jsx
      ErrorState.jsx
    EntryEditor.jsx
    TrackerInputs.jsx
    TrackerForm.jsx
    AttachmentGallery.jsx
  pages/
    Login.jsx
    Write.jsx
    Browse.jsx
    EntryDetail.jsx
    ManageTrackers.jsx
  api/                         ← Axios wrappers (entries, trackers, search, …)
  contexts/
    AuthContext.jsx
```

`@` is aliased to `src/` in `vite.config.js` and `jsconfig.json`. Use
`import { cn } from "@/lib/utils"` not relative paths for shared utilities.
