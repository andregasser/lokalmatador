export interface Street {
  id: string;
  name: string;
  coordinates: [number, number][][];
}

export interface Hydrant {
  id: number;
  lat: number;
  lon: number;
}

export interface POI {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

async function fetchFromOverpass(query: string): Promise<any> {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const url = `${endpoint}?data=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) continue;
      return await response.json();
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw lastError || new Error("All Overpass API endpoints failed.");
}

export async function fetchBassersdorfStreets(): Promise<Street[]> {
  const query = `
    [out:json][timeout:60];
    area["name"="Bassersdorf"]["admin_level"="8"]->.searchArea;
    (
      way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian|path|track)$"]["name"](area.searchArea);
      relation["type"~"^(associatedStreet|street)$"]["name"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;
  try {
    const data = await fetchFromOverpass(query);
    if (!data || !data.elements) return [];
    const nodes: Record<number, [number, number]> = {};
    const ways: Record<number, { id: number, name?: string, nodes: number[], highway?: string }> = {};
    const relations: { name: string, members: { type: string, ref: number, role?: string }[] }[] = [];

    data.elements.forEach((el: any) => {
      if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
      else if (el.type === 'way') ways[el.id] = { id: el.id, name: el.tags?.name, nodes: el.nodes, highway: el.tags?.highway };
      else if (el.type === 'relation' && el.tags?.name) relations.push({ name: el.tags.name, members: el.members });
    });

    const grouped: Record<string, [number, number][][]> = {};
    const processedWayIdsPerStreet: Record<string, Set<number>> = {};

    const addWayToStreet = (name: string, wayId: number) => {
      const way = ways[wayId];
      if (!way) return;
      if (!processedWayIdsPerStreet[name]) processedWayIdsPerStreet[name] = new Set();
      if (!processedWayIdsPerStreet[name].has(wayId)) {
        const coords = way.nodes.map(id => nodes[id]).filter((n): n is [number, number] => !!n);
        if (coords.length >= 2) {
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push(coords);
          processedWayIdsPerStreet[name].add(wayId);
        }
      }
    };

    Object.values(ways).forEach(way => { if (way.name) addWayToStreet(way.name, way.id); });
    relations.forEach(rel => rel.members.forEach(member => {
      if (member.type === 'way') {
        const way = ways[member.ref];
        if (way && (!way.name || way.name === rel.name)) addWayToStreet(rel.name, member.ref);
      }
    }));

    return Object.entries(grouped).map(([name, paths], index) => ({ id: `street-${index}`, name: name, coordinates: paths }));
  } catch (error) { return []; }
}

export async function fetchBassersdorfHydrants(): Promise<Hydrant[]> {
  const query = `[out:json][timeout:30]; area["name"="Bassersdorf"]["admin_level"="8"]->.searchArea; (node["emergency"="fire_hydrant"](area.searchArea);); out body;`;
  try {
    const data = await fetchFromOverpass(query);
    if (!data || !data.elements) return [];
    return data.elements.map((el: any) => ({ id: el.id, lat: el.lat, lon: el.lon }));
  } catch (error) { return []; }
}

export async function fetchBassersdorfPOIs(): Promise<POI[]> {
  const query = `
    [out:json][timeout:30];
    area["name"="Bassersdorf"]["admin_level"="8"]->.searchArea;
    (
      node["amenity"~"^(restaurant|cafe|fast_food|bank|pharmacy|post_office|library|townhall|fire_station|police)$"]["name"](area.searchArea);
      node["shop"~"^(supermarket|bakery|butcher|kiosk|chemist)$"]["name"](area.searchArea);
      node["tourism"~"^(viewpoint|hotel|museum)$"]["name"](area.searchArea);
      way["amenity"~"^(restaurant|cafe|fast_food|bank|pharmacy|post_office|library|townhall|fire_station|police)$"]["name"](area.searchArea);
      way["shop"~"^(supermarket|bakery|butcher|kiosk|chemist)$"]["name"](area.searchArea);
    );
    out center;
  `;
  try {
    const data = await fetchFromOverpass(query);
    if (!data || !data.elements) return [];
    
    return data.elements
      .filter((el: any) => el.tags && el.tags.name)
      .map((el: any) => ({
        id: `poi-${el.id}`,
        name: el.tags.name,
        category: el.tags.amenity || el.tags.shop || el.tags.tourism || 'POI',
        lat: el.lat || el.center.lat,
        lon: el.lon || el.center.lon
      }));
  } catch (error) { return []; }
}

