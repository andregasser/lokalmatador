---
globs: frontend/src/index.css, frontend/src/**/*.tsx
---

# Styling Rules

## Tailwind CSS v4
- Configured via `@tailwindcss/vite` plugin — no `tailwind.config.js`
- Theme tokens defined in `@theme` block in `index.css`, mapped from CSS custom properties in `:root`
- Prefer utility classes over custom CSS
- Custom CSS only for things Tailwind can't handle (Leaflet overrides, SVG stroke animations)

## CSS Custom Properties
```
--primary: #ff5252       --accent: #38bdf8
--surface: #1e293b       --bg: #0f172a
--glass-bg: rgba(30,41,59,0.85)
--glass-border: rgba(255,255,255,0.1)
```

## Responsive Design
- Mobile-first: base styles are mobile, `md:` prefix for desktop (768px+)
- Common pattern: `text-[0.75rem] md:text-[0.9rem]`, `px-3 md:px-6`, `rounded-xl md:rounded-2xl`
- Use `h-[100dvh]` instead of `h-screen` for mobile browser compatibility
- Min touch target size: 44x44px (`min-h-[50px]` on buttons)

## Animations
- CSS-only (`@keyframes`), no JS-driven animations
- Key animations: `pulse-line` (dashed street march), `selected-street-line` (red glow + march), `emergency-lights`, `icon-pulse`, `icon-shake`, modal fade/scale
- Keep animations subtle and purposeful
