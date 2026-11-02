/**
 * Validates a roster definition and throws on malformed input.
 * Throws TypeError for structural issues.
 * Throws Error with 'duplicate_role' for duplicate slot roles.
 */
export function validate(definition) {
  if (
    definition === null ||
    definition === undefined ||
    typeof definition !== 'object' ||
    Array.isArray(definition)
  ) {
    throw new TypeError('definition must be a non-null, non-array object');
  }

  if (!Array.isArray(definition.slots) || !Array.isArray(definition.agents)) {
    throw new TypeError('definition must have slots (array) and agents (array)');
  }

  // Validate slots
  for (const slot of definition.slots) {
    if (
      slot === null ||
      slot === undefined ||
      typeof slot !== 'object' ||
      Array.isArray(slot)
    ) {
      throw new TypeError('each slot must be a non-null object');
    }
    if (typeof slot.role !== 'string' || slot.role === '') {
      throw new TypeError('slot.role must be a non-empty string');
    }
    if (!Array.isArray(slot.requires)) {
      throw new TypeError('slot.requires must be an array');
    }
    if (slot.requires.length === 0) {
      throw new TypeError('slot.requires must be non-empty');
    }
    for (const cap of slot.requires) {
      if (typeof cap !== 'string' || cap === '') {
        throw new TypeError('slot.requires entries must be non-empty strings');
      }
    }
  }

  // Check for duplicate roles
  const seen = new Set();
  for (const slot of definition.slots) {
    if (seen.has(slot.role)) {
      throw new Error(`duplicate_role: ${slot.role}`);
    }
    seen.add(slot.role);
  }

  // Validate agents
  for (const a of definition.agents) {
    if (
      a === null ||
      a === undefined ||
      typeof a !== 'object' ||
      Array.isArray(a)
    ) {
      throw new TypeError('each agent must be a non-null object');
    }
    if (typeof a.id !== 'string' || a.id === '') {
      throw new TypeError('agent.id must be a non-empty string');
    }
    if (!Array.isArray(a.capabilities)) {
      throw new TypeError('agent.capabilities must be an array');
    }
    for (const cap of a.capabilities) {
      if (typeof cap !== 'string') {
        throw new TypeError('agent.capabilities entries must be strings');
      }
    }
  }
}
