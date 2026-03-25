---
globs: frontend/src/osmService.ts
---

# Data & API Rules

## Overpass API (OpenStreetMap)
- Three endpoints with automatic failover: overpass.osm.ch, overpass-api.de, overpass.kumi.systems
- 15s timeout per request, sequential failover on failure
- Don't remove the multi-endpoint failover — it's critical for reliability

## Data Models
- `Street`: id, name, coordinates (array of polyline paths)
- `Hydrant`: id, lat, lon
- `POI`: id, name, category, lat, lon

## Queries
- Streets: highways with names in Bassersdorf municipality (admin_level 8), including relations
- Hydrants: emergency=fire_hydrant nodes
- POIs: restaurants, shops, public buildings, tourism — nodes and ways with `out center`
