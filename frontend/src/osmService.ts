export interface Street {
  id: string;
  name: string;
  coordinates: [number, number][][];
}

export async function fetchBassersdorfStreets(): Promise<Street[]> {
  const query = `
    [out:json][timeout:60];
    area["name"="Bassersdorf"]["admin_level"="8"]->.searchArea;
    (
      // Extended list of street types, including named service and footpaths
      way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian|path|track)$"]["name"](area.searchArea);
      
      // Relations that explicitly group streets
      relation["type"~"^(associatedStreet|street)$"]["name"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const nodes: Record<number, [number, number]> = {};
    const ways: Record<number, { id: number, name?: string, nodes: number[], highway?: string }> = {};
    const relations: { name: string, members: { type: string, ref: number, role?: string }[] }[] = [];

    // First pass: collect data
    data.elements.forEach((el: any) => {
      if (el.type === 'node') {
        nodes[el.id] = [el.lat, el.lon];
      } else if (el.type === 'way') {
        ways[el.id] = { 
          id: el.id,
          name: el.tags?.name, 
          nodes: el.nodes,
          highway: el.tags?.highway
        };
      } else if (el.type === 'relation' && el.tags?.name) {
        relations.push({
          name: el.tags.name,
          members: el.members
        });
      }
    });

    const grouped: Record<string, [number, number][][]> = {};
    const processedWayIdsPerStreet: Record<string, Set<number>> = {};

    const addWayToStreet = (name: string, wayId: number) => {
      const way = ways[wayId];
      if (!way) return;

      if (!processedWayIdsPerStreet[name]) {
        processedWayIdsPerStreet[name] = new Set();
      }

      // Check if this segment has already been added for THIS street
      if (!processedWayIdsPerStreet[name].has(wayId)) {
        const coords = way.nodes.map(id => nodes[id]).filter((n): n is [number, number] => !!n);
        if (coords.length >= 2) {
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push(coords);
          processedWayIdsPerStreet[name].add(wayId);
        }
      }
    };

    // 1. Process ways that have a direct name
    Object.values(ways).forEach(way => {
      if (way.name) {
        addWayToStreet(way.name, way.id);
      }
    });

    // 2. Assign unnamed ways via relations
    relations.forEach(rel => {
      rel.members.forEach(member => {
        if (member.type === 'way') {
          const way = ways[member.ref];
          // Only add if the way has no other name OR already carries the relation's name
          if (way && (!way.name || way.name === rel.name)) {
            addWayToStreet(rel.name, member.ref);
          }
        }
      });
    });

    const result: Street[] = Object.entries(grouped).map(([name, paths], index) => ({
      id: `street-${index}`,
      name: name,
      coordinates: paths
    }));

    console.log(`Updated OSM data: ${result.length} streets processed including service paths.`);
    return result;
  } catch (error) {
    console.error("Error fetching OSM data:", error);
    return [];
  }
}
