/**
 * Roster lease ledger — atomic acquisition and reaping.
 * @module lease-ledger
 */

/**
 * Validate that `clock` is a well-formed clock object.
 * @param {unknown} clock
 */
function validateClock(clock) {
  if (
    clock === null ||
    typeof clock !== 'object' ||
    !('now' in clock) ||
    typeof clock.now !== 'number' ||
    !Number.isInteger(clock.now) ||
    clock.now < 0
  ) {
    throw new TypeError(
      `clock must be an object with a non-negative integer 'now' property, got ${JSON.stringify(clock)}`
    );
  }
}

/**
 * Validate a run id.
 * @param {unknown} runId
 */
function validateRunId(runId) {
  if (typeof runId !== 'string' || runId.length === 0) {
    throw new TypeError(`runId must be a non-empty string, got ${String(runId)}`);
  }
}

/**
 * Validate a roles array.
 * @param {unknown} roles
 */
function validateRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new TypeError(`roles must be a non-empty array, got ${JSON.stringify(roles)}`);
  }
  const seen = new Set();
  for (const role of roles) {
    if (typeof role !== 'string' || role.length === 0) {
      throw new TypeError(`each role must be a non-empty string, got ${JSON.stringify(role)}`);
    }
    if (seen.has(role)) {
      throw new TypeError(`roles must be unique, duplicate found: ${role}`);
    }
    seen.add(role);
  }
}

/**
 * Validate options passed to createLedger.
 * @param {unknown} options
 */
function validateOptions(options) {
  if (
    options === null ||
    typeof options !== 'object' ||
    !('ttlMs' in options) ||
    typeof options.ttlMs !== 'number' ||
    !Number.isInteger(options.ttlMs) ||
    options.ttlMs <= 0
  ) {
    throw new TypeError(
      `options must be an object with a positive integer 'ttlMs' property, got ${JSON.stringify(options)}`
    );
  }
}

let _leaseCounter = 0;

/**
 * Generate a unique lease id.
 * @returns {string}
 */
function newLeaseId() {
  _leaseCounter += 1;
  return `lease-${_leaseCounter}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Create a roster lease ledger.
 *
 * @param {{ ttlMs: number }} options
 * @returns {{
 *   acquire(runId: string, roles: string[], clock: { now: number }): object,
 *   renew(runId: string, clock: { now: number }): object,
 *   release(runId: string, clock: { now: number }): void,
 *   reap(clock: { now: number }): string[],
 *   isHeld(runId: string, clock: { now: number }): boolean,
 *   heldRoles(clock: { now: number }): string[],
 *   snapshot(clock: { now: number }): object[],
 * }}
 */
export function createLedger(options) {
  validateOptions(options);
  const { ttlMs } = options;

  /**
   * Map from runId -> lease record:
   * { leaseId, runId, roles: string[], expiresAtMs: number }
   */
  const leases = new Map();

  /**
   * Map from role -> runId (only tracks currently live entries in `leases`).
   * We check liveness via the lease's expiresAtMs at call time.
   */
  const roleIndex = new Map();

  /**
   * Check if a lease is alive (exists and not expired) at the given clock.
   * @param {{ leaseId, runId, roles, expiresAtMs }} lease
   * @param {{ now: number }} clock
   * @returns {boolean}
   */
  function isLive(lease, clock) {
    return clock.now < lease.expiresAtMs;
  }

  return {
    /**
     * Acquire a lease for the given runId over the listed roles.
     */
    acquire(runId, roles, clock) {
      validateRunId(runId);
      validateRoles(roles);
      validateClock(clock);

      // A run may hold only one lease at a time.
      if (leases.has(runId)) {
        const existing = leases.get(runId);
        if (isLive(existing, clock)) {
          throw new Error('already_held');
        }
        // The old lease expired — clean it up before we proceed.
        // We remove its roles from the roleIndex.
        for (const r of existing.roles) {
          if (roleIndex.get(r) === runId) {
            roleIndex.delete(r);
          }
        }
        leases.delete(runId);
      }

      // Check each requested role for availability (only live holders block).
      for (const role of roles) {
        const holder = roleIndex.get(role);
        if (holder !== undefined) {
          const holderLease = leases.get(holder);
          if (holderLease && isLive(holderLease, clock)) {
            throw new Error('role_unavailable');
          }
          // Stale entry — clean up.
          roleIndex.delete(role);
        }
      }

      // All roles are available. Atomic assignment.
      const leaseId = newLeaseId();
      const expiresAtMs = clock.now + ttlMs;
      const lease = { leaseId, runId, roles: [...roles], expiresAtMs };
      leases.set(runId, lease);
      for (const role of roles) {
        roleIndex.set(role, runId);
      }

      return { leaseId, runId, roles: [...roles], expiresAtMs };
    },

    /**
     * Renew an existing live lease.
     */
    renew(runId, clock) {
      validateRunId(runId);
      validateClock(clock);

      if (!leases.has(runId)) {
        throw new Error('lease_not_found');
      }

      const lease = leases.get(runId);

      if (!isLive(lease, clock)) {
        throw new Error('lease_expired');
      }

      lease.expiresAtMs = clock.now + ttlMs;
      return { leaseId: lease.leaseId, runId: lease.runId, roles: [...lease.roles], expiresAtMs: lease.expiresAtMs };
    },

    /**
     * Release a lease immediately.
     */
    release(runId, clock) {
      validateRunId(runId);
      validateClock(clock);

      if (!leases.has(runId)) {
        throw new Error('lease_not_found');
      }

      const lease = leases.get(runId);
      // Remove from role index.
      for (const role of lease.roles) {
        if (roleIndex.get(role) === runId) {
          roleIndex.delete(role);
        }
      }
      leases.delete(runId);
    },

    /**
     * Reap all expired leases and return the sorted list of released run ids.
     */
    reap(clock) {
      validateClock(clock);

      const released = [];
      for (const [runId, lease] of leases) {
        if (!isLive(lease, clock)) {
          released.push(runId);
          for (const role of lease.roles) {
            if (roleIndex.get(role) === runId) {
              roleIndex.delete(role);
            }
          }
          leases.delete(runId);
        }
      }

      return released.sort();
    },

    /**
     * Whether the run currently holds a live lease.
     */
    isHeld(runId, clock) {
      validateRunId(runId);
      validateClock(clock);

      if (!leases.has(runId)) return false;
      return isLive(leases.get(runId), clock);
    },

    /**
     * Every role held by a live lease, sorted ascending.
     */
    heldRoles(clock) {
      validateClock(clock);

      const roles = [];
      for (const [, lease] of leases) {
        if (isLive(lease, clock)) {
          roles.push(...lease.roles);
        }
      }
      return roles.sort();
    },

    /**
     * Snapshot of every live lease, sorted by runId.
     */
    snapshot(clock) {
      validateClock(clock);

      const entries = [];
      for (const [, lease] of leases) {
        if (isLive(lease, clock)) {
          entries.push({
            leaseId: lease.leaseId,
            runId: lease.runId,
            roles: [...lease.roles],
            expiresAtMs: lease.expiresAtMs,
          });
        }
      }
      return entries.sort((a, b) => (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0));
    },
  };
}
