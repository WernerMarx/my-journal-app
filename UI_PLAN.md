# UI Redesign Plan

Modern Tailwind CSS + shadcn/ui redesign of the journal frontend.
Visual direction: calm, premium, minimal — like Notion or Linear, but warmer.

---

## Phase 1 — Foundation (Tailwind + shadcn setup)

Install tooling and create the design system foundation.

- [x] Install Tailwind CSS v4 (`@tailwindcss/vite`)
- [x] Install `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`
- [x] Install Radix UI primitives (`@radix-ui/react-slot`, `dialog`, `dropdown-menu`, `separator`)
- [x] Install `tailwindcss-animate`
- [x] Update `vite.config.js` — add Tailwind plugin + `@` path alias
- [x] Update `index.css` — Tailwind import, `@theme inline` token mapping, shadcn CSS vars
- [x] Create `src/lib/utils.js` — `cn()` utility
- [x] Create `src/components/ui/button.jsx`
- [x] Create `src/components/ui/input.jsx`
- [x] Create `src/components/ui/textarea.jsx`
- [x] Create `src/components/ui/card.jsx`
- [x] Create `src/components/ui/dialog.jsx`
- [x] Create `src/components/ui/dropdown-menu.jsx`
- [x] Create `src/components/ui/badge.jsx`
- [x] Create `src/components/ui/separator.jsx`
- [x] Create `src/components/ui/skeleton.jsx`
- [x] Create `frontend/jsconfig.json` — editor path alias support

---

## Phase 2 — App shell + Browse page

Redesign the layout and entry list into a polished dashboard.

- [x] Create `src/components/layout/AppShell.jsx` — sidebar + content wrapper
- [x] Create `src/components/layout/Sidebar.jsx` — nav links, user email, sign out
- [x] Create `src/components/layout/PageHeader.jsx` — title, subtitle, optional action button
- [x] Create `src/components/ui-kit/EmptyState.jsx`
- [x] Create `src/components/ui-kit/LoadingState.jsx` (skeleton-based)
- [x] Create `src/components/ui-kit/ErrorState.jsx`
- [x] Rewrite `src/components/Layout.jsx` — use AppShell
- [x] Rewrite `src/pages/Browse.jsx` — card list, search bar, empty/loading/error states
- [x] Rewrite `src/pages/Login.jsx` — centered card, polished form
- [x] Fix `index.css` — move element base styles into `@layer base` (Tailwind v4 cascade fix)

---

## Phase 3 — Write / entry editor

Redesign the writing experience.

- [x] Rewrite `src/pages/Write.jsx` — focused header with date nav
- [x] Rewrite `src/components/EntryEditor.jsx` — spacious writing area, polished controls
- [x] Rewrite `src/components/TrackerInputs.jsx` — clean tracker rows
- [x] Rewrite `src/components/AttachmentGallery.jsx` — grid with hover actions
- [x] Rewrite `src/pages/EntryDetail.jsx` — read-only view with back nav, tracker badges

---

## Phase 4 — Consistency pass

Polish and clean up across the whole frontend.

- [x] Rewrite `src/components/TrackerForm.jsx` — polished form grid
- [x] Rewrite `src/pages/ManageTrackers.jsx` — tracker list with edit/archive
- [x] Audit spacing, typography, and color across all pages
- [x] Remove all old CSS classes from `index.css` that are no longer referenced
- [x] Verify responsive layout on mobile widths
- [ ] Final visual QA pass

---

## Design tokens (warm journal palette)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#f7f5f1` | Page background (warm paper) |
| `--foreground` | `#3b3833` | Body text |
| `--card` | `#ffffff` | Card / surface |
| `--primary` | `#557099` | Primary buttons, active states |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--muted` | `#f1ede7` | Subtle fills, secondary bg |
| `--muted-foreground` | `#908a80` | Helper text, labels |
| `--accent` | `#e9eff6` | Soft hover bg, nav active bg |
| `--accent-foreground` | `#455e82` | Text on accent |
| `--destructive` | `#b3596b` | Delete / error |
| `--border` | `#e6e0d6` | Card and input borders |
| `--ring` | `#6f93bd` | Focus rings |
| `--sage` | `#9cc3a8` | Mood: good |
| `--blush` | `#e6b8c2` | Mood: low |
| `--amber-warm` | `#e8c79a` | Mood: neutral / diet |
