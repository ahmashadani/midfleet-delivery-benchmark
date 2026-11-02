import { validate } from './validate.js';
import { assign } from './assign.js';

/**
 * Assigns agents to role slots subject to capability requirements.
 *
 * @param {object} definition - { slots, agents }
 * @returns {{ ok: boolean, assignments: Array<{role: string, agentId: string}>, unfilled: string[] }}
 */
export function assignRoster(definition) {
  validate(definition);

  // Work with shallow copies to avoid mutating the input
  const slots = definition.slots.map(s => ({
    role: s.role,
    requires: s.requires.slice(),
  }));
  const agents = definition.agents.map(a => ({
    id: a.id,
    capabilities: a.capabilities.slice(),
    busy: a.busy,
  }));

  return assign(slots, agents);
}
