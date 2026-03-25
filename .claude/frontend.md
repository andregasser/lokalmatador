---
globs: frontend/src/**/*.tsx, frontend/src/**/*.ts, frontend/package.json, frontend/vite.config.ts
---

# Frontend Rules

## React & TypeScript
- React 19 with TypeScript strict mode
- Use `React.FC` for component types
- State management: React hooks only (`useState`, `useEffect`, `useMemo`, `useRef`)
- Single-file approach: main app logic lives in App.tsx
- Extract components only when reuse is clear and proven

## Component Patterns
- All translations via `useTranslation()` / `t()` — never hardcode user-facing strings
- Use lucide-react for all icons
- Use react-leaflet components (`MapContainer`, `Polyline`, `CircleMarker`, `Tooltip`) for map elements

## Performance
- Use `useMemo` for expensive computations (visible streets/hydrants/POIs filtering)
- Viewport-based filtering: only render map elements within current map bounds
- Debounce map tracker updates (zoom/move events)
