import { createHash } from 'node:crypto';

/**
 * Computes a SHA-256 hash over the canonical fields of an entry.
 * Uses the original target (before any redaction) so that verify() can
 * re-derive the hash from the raw store even after a target is withheld.
 */
function computeHash(seq, actor, action, target, atMs, previousHash) {
  const payload = JSON.stringify({ seq, actor, action, target, atMs, previousHash });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Validates an entry object.  Throws TypeError on any problem.
 */
function validateEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new TypeError('entry must be a plain object');
  }
  const { actor, action, target } = entry;
  if (typeof actor !== 'string' || actor === '') {
    throw new TypeError('entry.actor must be a non-empty string');
  }
  if (typeof action !== 'string' || action === '') {
    throw new TypeError('entry.action must be a non-empty string');
  }
  if (!('target' in entry)) {
    throw new TypeError('entry.target is required');
  }
  if (typeof target !== 'string' || target === '') {
    throw new TypeError('entry.target must be a non-empty string');
  }
}

/**
 * Validates a clock object.  Throws TypeError on any problem.
 */
function validateClock(clock) {
  if (clock === null || typeof clock !== 'object' || Array.isArray(clock)) {
    throw new TypeError('clock must be a plain object with a now property');
  }
  const { now } = clock;
  if (typeof now !== 'number' || !Number.isInteger(now) || now < 0) {
    throw new TypeError('clock.now must be a non-negative integer');
  }
}

/**
 * Returns a public-facing copy of a raw entry, honouring redaction.
 */
function publicView(raw) {
  return {
    seq: raw.seq,
    actor: raw.actor,
    action: raw.action,
    target: raw.redacted ? null : raw.target,
    atMs: raw.atMs,
    hash: raw.hash,
    previousHash: raw.previousHash,
    redacted: raw.redacted,
    redactionReason: raw.redactionReason,
  };
}

export function createTrail() {
  // The internal store.  unsafeRawEntries() returns a direct reference to this
  // array so that tests can simulate a compromised store.
  const store = [];

  function append(entry, clock) {
    validateEntry(entry);
    validateClock(clock);

    const { actor, action, target } = entry;
    const { now } = clock;

    if (store.length > 0) {
      const last = store[store.length - 1];
      if (now < last.atMs) {
        throw new Error('clock_regression');
      }
    }

    const seq = store.length + 1;
    const previousHash = store.length > 0 ? store[store.length - 1].hash : null;
    const hash = computeHash(seq, actor, action, target, now, previousHash);

    const raw = {
      seq,
      actor,
      action,
      target,          // stored original; never overwritten by redact()
      atMs: now,
      hash,
      previousHash,
      redacted: false,
      redactionReason: null,
    };

    store.push(raw);

    // Return a public view (target is not redacted yet, so it equals the original).
    return publicView(raw);
  }

  function entries() {
    return store.map(publicView);
  }

  function where(filter) {
    if (filter === null || typeof filter !== 'object' || Array.isArray(filter)) {
      throw new TypeError('filter must be a plain object');
    }
    return store
      .filter(raw => {
        if ('actor' in filter && raw.actor !== filter.actor) return false;
        if ('action' in filter && raw.action !== filter.action) return false;
        return true;
      })
      .map(publicView);
  }

  function redact(seq, reason) {
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 1) {
      throw new TypeError('seq must be a positive integer');
    }
    if (typeof reason !== 'string' || reason === '') {
      throw new TypeError('reason must be a non-empty string');
    }

    const raw = store.find(e => e.seq === seq);
    if (!raw) {
      throw new Error('entry_not_found');
    }
    if (raw.redacted) {
      throw new Error('already_redacted');
    }

    raw.redacted = true;
    raw.redactionReason = reason;
    // raw.target is intentionally kept so verify() can re-derive the hash.
    // raw.hash is intentionally kept unchanged (redaction must not rewrite history).
  }

  function verify() {
    let previousHash = null;
    for (const raw of store) {
      const expected = computeHash(
        raw.seq,
        raw.actor,
        raw.action,
        raw.target,   // original target, unaffected by redaction
        raw.atMs,
        previousHash,
      );
      if (raw.hash !== expected) {
        return { ok: false, brokenAt: raw.seq };
      }
      previousHash = raw.hash;
    }
    return { ok: true, brokenAt: null };
  }

  function length() {
    return store.length;
  }

  function unsafeRawEntries() {
    return store;
  }

  return { append, entries, where, redact, verify, length, unsafeRawEntries };
}
