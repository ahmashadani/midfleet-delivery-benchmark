/**
 * Core assignment logic for roster-assign.
 */

/**
 * Returns true if agent has every capability in the requires array.
 */
function qualifies(agent, requires) {
  const capSet = new Set(agent.capabilities);
  return requires.every(cap => capSet.has(cap));
}

/**
 * Attempts to find a complete assignment for all slots using backtracking.
 * Agents are tried in id-ascending order at each step for determinism.
 *
 * @param {Array} slots - slot objects with role and requires
 * @param {Array} agents - available (non-busy) agents sorted by id ascending
 * @param {number} slotIndex - current slot index being filled
 * @param {Set} usedIds - agent ids already assigned
 * @param {Array} result - partial assignments built so far
 * @returns {Array|null} complete assignments array or null if impossible
 */
function backtrack(slots, agents, slotIndex, usedIds, result) {
  if (slotIndex === slots.length) {
    return result.slice();
  }

  const slot = slots[slotIndex];
  for (const agent of agents) {
    if (usedIds.has(agent.id)) continue;
    if (!qualifies(agent, slot.requires)) continue;

    usedIds.add(agent.id);
    result.push({ role: slot.role, agentId: agent.id });

    const found = backtrack(slots, agents, slotIndex + 1, usedIds, result);
    if (found !== null) {
      return found;
    }

    // Undo
    usedIds.delete(agent.id);
    result.pop();
  }

  return null;
}

/**
 * Greedy fallback: fill as many slots as possible in declaration order.
 * For each slot, assign the first available qualifying agent (id-ascending).
 */
function greedyFill(slots, agents) {
  const assignments = [];
  const unfilled = [];
  const usedIds = new Set();

  for (const slot of slots) {
    let assigned = false;
    for (const agent of agents) {
      if (usedIds.has(agent.id)) continue;
      if (!qualifies(agent, slot.requires)) continue;
      assignments.push({ role: slot.role, agentId: agent.id });
      usedIds.add(agent.id);
      assigned = true;
      break;
    }
    if (!assigned) {
      unfilled.push(slot.role);
    }
  }

  return { assignments, unfilled };
}

/**
 * Assigns agents to slots.
 *
 * @param {Array} slots - validated slot objects
 * @param {Array} agents - validated agent objects (all, including busy)
 * @returns {{ ok: boolean, assignments: Array, unfilled: Array }}
 */
export function assign(slots, agents) {
  // Filter out busy agents, sort by id ascending for determinism
  const available = agents
    .filter(a => !a.busy)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Try to find a complete assignment via backtracking
  const complete = backtrack(slots, available, 0, new Set(), []);

  if (complete !== null) {
    return { ok: true, assignments: complete, unfilled: [] };
  }

  // No complete assignment possible — fill as many as possible in slot order
  const { assignments, unfilled } = greedyFill(slots, available);
  return { ok: false, assignments, unfilled };
}
