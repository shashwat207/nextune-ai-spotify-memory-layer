import { KnowledgeNode, KnowledgeEdge } from '../types';

export type GraphTraversalResult = {
  seedEntities: string[];
  pathsExplored: { from: string; rel: string; to: string }[];
  discoveredArtists: string[];
  discoveredGenres: string[];
  dislikedArtists: string[];
};

export function traverseKnowledgeGraph(
  seedKeywords: string[],
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  userNodeId: string = 'user:shashwat'
): GraphTraversalResult {
  const pathsExplored: { from: string; rel: string; to: string }[] = [];
  const discoveredArtists = new Set<string>();
  const discoveredGenres = new Set<string>();
  const dislikedArtists = new Set<string>();

  // 1. Identify user explicit dislikes from graph
  edges.forEach(e => {
    if (e.source === userNodeId && e.relationship === 'DISLIKES') {
      const targetNode = nodes.find(n => n.id === e.target);
      if (targetNode) {
        dislikedArtists.add(targetNode.label);
      }
    }
  });

  // 2. Find matching seed nodes
  const matchingSeeds: KnowledgeNode[] = [];
  const lowerSeeds = seedKeywords.map(k => k.toLowerCase().trim());

  nodes.forEach(node => {
    const nodeLabel = node.label.toLowerCase();
    const isMatch = lowerSeeds.some(k => 
      k.includes(nodeLabel) || 
      nodeLabel.includes(k) || 
      node.id.toLowerCase().includes(k)
    );
    if (isMatch && node.type !== 'User') {
      matchingSeeds.push(node);
    }
  });

  // If no direct seed matched, default to genre based on keywords
  if (matchingSeeds.length === 0) {
    const defaultPunjabi = nodes.find(n => n.id === 'genre:punjabi');
    if (defaultPunjabi) matchingSeeds.push(defaultPunjabi);
  }

  // 3. Explore 1-hop and 2-hop edges
  matchingSeeds.forEach(seed => {
    if (seed.type === 'Genre') {
      discoveredGenres.add(seed.label);
    } else if (seed.type === 'Artist') {
      discoveredArtists.add(seed.label);
    }

    // Outgoing or incoming edges connected to seed
    edges.forEach(edge => {
      if (edge.source === seed.id) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode && targetNode.type !== 'User') {
          pathsExplored.push({
            from: seed.label,
            rel: edge.relationship,
            to: targetNode.label
          });
          if (targetNode.type === 'Artist') discoveredArtists.add(targetNode.label);
          if (targetNode.type === 'Genre') discoveredGenres.add(targetNode.label);
        }
      } else if (edge.target === seed.id) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode && sourceNode.type !== 'User') {
          pathsExplored.push({
            from: sourceNode.label,
            rel: edge.relationship,
            to: seed.label
          });
          if (sourceNode.type === 'Artist') discoveredArtists.add(sourceNode.label);
          if (sourceNode.type === 'Genre') discoveredGenres.add(sourceNode.label);
        }
      }
    });
  });

  // Expand secondary hops (e.g. from discovered Genre to sibling Artists)
  discoveredGenres.forEach(genreLabel => {
    const genreNode = nodes.find(n => n.label.toLowerCase() === genreLabel.toLowerCase());
    if (genreNode) {
      edges.forEach(edge => {
        if (edge.target === genreNode.id && edge.relationship === 'IN_GENRE') {
          const artistNode = nodes.find(n => n.id === edge.source);
          if (artistNode) {
            discoveredArtists.add(artistNode.label);
            pathsExplored.push({
              from: artistNode.label,
              rel: 'IN_GENRE',
              to: genreLabel
            });
          }
        }
      });
    }
  });

  return {
    seedEntities: matchingSeeds.map(s => s.label),
    pathsExplored: pathsExplored.slice(0, 8),
    discoveredArtists: Array.from(discoveredArtists),
    discoveredGenres: Array.from(discoveredGenres),
    dislikedArtists: Array.from(dislikedArtists),
  };
}
