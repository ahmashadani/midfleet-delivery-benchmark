// src/stage-graph/index.js
// Validates a workflow definition and answers questions about its shape.

/**
 * Validates a stage object.
 * @param {unknown} stage
 */
function validateStage(stage) {
  if (stage === null || typeof stage !== 'object' || Array.isArray(stage)) {
    throw new TypeError('stage must be a non-null object');
  }
  if (typeof stage.id !== 'string' || stage.id === '') {
    throw new TypeError('stage.id must be a non-empty string');
  }
  if (typeof stage.role !== 'string' || stage.role === '') {
    throw new TypeError('stage.role must be a non-empty string');
  }
}

/**
 * Validates an edge object.
 * @param {unknown} edge
 */
function validateEdge(edge) {
  if (edge === null || typeof edge !== 'object' || Array.isArray(edge)) {
    throw new TypeError('edge must be a non-null object');
  }
  if (typeof edge.from !== 'string' || edge.from === '') {
    throw new TypeError('edge.from must be a non-empty string');
  }
  if (typeof edge.to !== 'string' || edge.to === '') {
    throw new TypeError('edge.to must be a non-empty string');
  }
  if (typeof edge.on !== 'string' || edge.on === '') {
    throw new TypeError('edge.on must be a non-empty string');
  }
}

/**
 * Creates a workflow stage graph from a definition.
 *
 * @param {{ stages: Array<{id: string, role: string}>, edges: Array<{from: string, to: string, on: string}> }} definition
 */
export function createGraph(definition) {
  // Validate definition shape
  if (
    definition === null ||
    definition === undefined ||
    typeof definition !== 'object' ||
    Array.isArray(definition)
  ) {
    throw new TypeError('definition must be a non-null object');
  }
  if (!Array.isArray(definition.stages)) {
    throw new TypeError('definition.stages must be an array');
  }
  if (!Array.isArray(definition.edges)) {
    throw new TypeError('definition.edges must be an array');
  }

  // Validate and copy stages
  const stages = [];
  for (const s of definition.stages) {
    validateStage(s);
    stages.push({ id: s.id, role: s.role });
  }

  // Validate and copy edges
  const edges = [];
  for (const e of definition.edges) {
    validateEdge(e);
    edges.push({ from: e.from, to: e.to, on: e.on });
  }

  // Check for duplicate stage ids
  const stageSet = new Set();
  for (const stage of stages) {
    if (stageSet.has(stage.id)) {
      throw new Error(`duplicate_stage: ${stage.id}`);
    }
    stageSet.add(stage.id);
  }

  // Check edges reference valid stages
  for (const edge of edges) {
    if (!stageSet.has(edge.from)) {
      throw new Error(`unknown_stage: ${edge.from}`);
    }
    if (!stageSet.has(edge.to)) {
      throw new Error(`unknown_stage: ${edge.to}`);
    }
  }

  // Check for ambiguous transitions (two edges from one stage on the same outcome)
  const transitionKey = new Set();
  for (const edge of edges) {
    const key = `${edge.from}\0${edge.on}`;
    if (transitionKey.has(key)) {
      throw new Error(`ambiguous_transition: ${edge.from} on ${edge.on}`);
    }
    transitionKey.add(key);
  }

  // Check for cycles using Kahn's algorithm (topological sort)
  // Build adjacency and in-degree maps
  const adjacency = new Map(); // from -> [{to, on}]
  const inDegree = new Map();
  for (const stage of stages) {
    adjacency.set(stage.id, []);
    inDegree.set(stage.id, 0);
  }
  for (const edge of edges) {
    adjacency.get(edge.from).push({ to: edge.to, on: edge.on });
    inDegree.set(edge.to, inDegree.get(edge.to) + 1);
  }

  // Kahn's algorithm — process in declaration order to produce a stable topological order
  const stageIds = stages.map(s => s.id);
  const topoOrder = [];
  // Use a queue seeded by all zero-in-degree nodes in declaration order
  const queue = [];
  for (const id of stageIds) {
    if (inDegree.get(id) === 0) {
      queue.push(id);
    }
  }

  const remaining = new Set(stageIds);
  while (queue.length > 0) {
    const id = queue.shift();
    topoOrder.push(id);
    remaining.delete(id);
    // For each neighbor, decrement in-degree; if 0, add to queue in declaration order
    for (const { to } of adjacency.get(id)) {
      inDegree.set(to, inDegree.get(to) - 1);
    }
    // Add newly zero-in-degree nodes in declaration order
    for (const sid of stageIds) {
      if (remaining.has(sid) && inDegree.get(sid) === 0 && !queue.includes(sid)) {
        queue.push(sid);
      }
    }
  }

  if (topoOrder.length !== stages.length) {
    // Find cycle members
    const cycleNodes = [...remaining];
    throw new Error(`cycle_detected: ${cycleNodes.join(', ')}`);
  }

  // Determine entry stage(s): stages with no incoming edges
  const hasIncoming = new Set();
  for (const edge of edges) {
    hasIncoming.add(edge.to);
  }
  const entryStages = stageIds.filter(id => !hasIncoming.has(id));

  if (entryStages.length > 1) {
    throw new Error(`multiple_entry_stages: ${entryStages.join(', ')}`);
  }

  const entryStage = entryStages[0]; // could be undefined if somehow 0, but validated graph won't have 0

  // Determine terminals: stages with no outgoing edges
  const hasOutgoing = new Set();
  for (const edge of edges) {
    hasOutgoing.add(edge.from);
  }
  const terminalStages = stageIds.filter(id => !hasOutgoing.has(id)).sort();

  // Build transition map: stageId -> Map<outcome, toId>
  const transitions = new Map();
  for (const id of stageIds) {
    transitions.set(id, new Map());
  }
  for (const edge of edges) {
    transitions.get(edge.from).set(edge.on, edge.to);
  }

  // Return the graph object
  return {
    stageIds() {
      return [...stageIds];
    },

    edges() {
      return edges.map(e => ({ from: e.from, to: e.to, on: e.on }));
    },

    entry() {
      return entryStage;
    },

    terminals() {
      return [...terminalStages];
    },

    topologicalOrder() {
      return [...topoOrder];
    },

    outcomesFor(stageId) {
      if (!stageSet.has(stageId)) {
        throw new Error(`unknown_stage: ${stageId}`);
      }
      return [...transitions.get(stageId).keys()].sort();
    },

    next(stageId, outcome) {
      if (!stageSet.has(stageId)) {
        throw new Error(`unknown_stage: ${stageId}`);
      }
      const outMap = transitions.get(stageId);
      if (outMap.size === 0) {
        // Terminal stage
        return null;
      }
      if (!outMap.has(outcome)) {
        throw new Error(`unknown_outcome: ${outcome}`);
      }
      return outMap.get(outcome);
    },
  };
}
