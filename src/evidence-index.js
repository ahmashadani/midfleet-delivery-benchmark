/**
 * evidence-index: collect and query a run's evidence records.
 *
 * An evidence record is { id, type, stage }, all non-empty strings.
 */

function validateEvidence(evidence) {
  if (
    evidence === null ||
    typeof evidence !== 'object' ||
    Array.isArray(evidence)
  ) {
    throw new TypeError('evidence must be a non-null object');
  }
  const { id, type, stage } = evidence;
  if (typeof id !== 'string' || id === '') {
    throw new TypeError('evidence.id must be a non-empty string');
  }
  if (typeof type !== 'string' || type === '') {
    throw new TypeError('evidence.type must be a non-empty string');
  }
  if (typeof stage !== 'string' || stage === '') {
    throw new TypeError('evidence.stage must be a non-empty string');
  }
}

function validateString(value, label) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string`);
  }
}

function validateStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  for (const item of value) {
    if (typeof item !== 'string' || item === '') {
      throw new TypeError(`${label} must be an array of non-empty strings`);
    }
  }
}

export function createIndex() {
  // Map from id -> frozen copy of evidence record
  const records = new Map();

  return {
    /**
     * Stores a record. Throws 'duplicate_evidence' if id already exists.
     * Copies the record so external mutations don't affect the index.
     */
    add(evidence) {
      validateEvidence(evidence);
      const copy = { id: evidence.id, type: evidence.type, stage: evidence.stage };
      if (records.has(copy.id)) {
        throw new Error('duplicate_evidence');
      }
      records.set(copy.id, copy);
    },

    /**
     * Returns a copy of the record with the given id, or null if not found.
     */
    find(id) {
      validateString(id, 'id');
      const record = records.get(id);
      if (record === undefined) return null;
      return { ...record };
    },

    /**
     * Returns copies of every record for the given stage, sorted by id.
     */
    forStage(stage) {
      validateString(stage, 'stage');
      const result = [];
      for (const record of records.values()) {
        if (record.stage === stage) {
          result.push({ ...record });
        }
      }
      result.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      return result;
    },

    /**
     * Returns a new object with counts by type, keys in ascending order.
     */
    summarise() {
      const counts = {};
      for (const record of records.values()) {
        counts[record.type] = (counts[record.type] ?? 0) + 1;
      }
      const sorted = {};
      for (const key of Object.keys(counts).sort()) {
        sorted[key] = counts[key];
      }
      return sorted;
    },

    /**
     * Returns which required types have no record, sorted.
     */
    missing(requiredTypes) {
      validateStringArray(requiredTypes, 'requiredTypes');
      const presentTypes = new Set();
      for (const record of records.values()) {
        presentTypes.add(record.type);
      }
      return requiredTypes
        .filter(t => !presentTypes.has(t))
        .sort();
    },

    /**
     * Returns how many records are held.
     */
    size() {
      return records.size;
    },
  };
}
