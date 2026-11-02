// retry-plan.js — retry policy: backoff delay, retry decision, full schedule

/**
 * Validates a policy object. Throws TypeError if invalid.
 * Valid policy: { baseMs, maxMs, maxAttempts } — all positive integers, maxMs >= baseMs.
 */
function validatePolicy(policy) {
  if (
    policy === null ||
    typeof policy !== 'object' ||
    Array.isArray(policy)
  ) {
    throw new TypeError('policy must be a plain object');
  }
  const { baseMs, maxMs, maxAttempts } = policy;
  for (const [name, value] of [['baseMs', baseMs], ['maxMs', maxMs], ['maxAttempts', maxAttempts]]) {
    if (value === undefined || value === null) {
      throw new TypeError(`policy.${name} is required`);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`policy.${name} must be a finite number`);
    }
    if (!Number.isInteger(value)) {
      throw new TypeError(`policy.${name} must be an integer`);
    }
    if (value <= 0) {
      throw new TypeError(`policy.${name} must be a positive integer`);
    }
  }
  if (maxMs < baseMs) {
    throw new TypeError('policy.maxMs must be >= policy.baseMs');
  }
}

/**
 * Validates an attempt argument. Throws TypeError if invalid.
 * Valid attempt: a non-negative integer.
 */
function validateAttempt(attempt) {
  if (typeof attempt !== 'number' || !Number.isFinite(attempt)) {
    throw new TypeError('attempt must be a finite number');
  }
  if (!Number.isInteger(attempt)) {
    throw new TypeError('attempt must be an integer');
  }
  if (attempt < 0) {
    throw new TypeError('attempt must be a non-negative integer');
  }
}

/**
 * Returns the delay in milliseconds before the given attempt,
 * using exponential backoff doubling each attempt, capped at maxMs.
 *
 * @param {number} attempt - Zero-based attempt number
 * @param {{ baseMs: number, maxMs: number, maxAttempts: number }} policy
 * @returns {number}
 */
export function nextDelayMs(attempt, policy) {
  validateAttempt(attempt);
  validatePolicy(policy);

  const { baseMs, maxMs } = policy;
  const raw = baseMs * Math.pow(2, attempt);
  return Math.min(raw, maxMs);
}

/**
 * Returns true if the attempt should proceed, false if retrying should stop.
 * Stops if attempt >= maxAttempts, or if error.permanent is true.
 *
 * @param {number} attempt - Zero-based attempt number
 * @param {{ baseMs: number, maxMs: number, maxAttempts: number }} policy
 * @param {{ permanent?: boolean } | undefined} [error]
 * @returns {boolean}
 */
export function shouldRetry(attempt, policy, error) {
  validateAttempt(attempt);
  validatePolicy(policy);

  if (error !== undefined && error !== null && error.permanent === true) {
    return false;
  }
  return attempt < policy.maxAttempts;
}

/**
 * Returns the full retry schedule as an array of entries, one per permitted attempt.
 * Each entry: { attempt, delayMs, elapsedBeforeMs, totalMs }
 *
 * @param {{ baseMs: number, maxMs: number, maxAttempts: number }} policy
 * @returns {Array<{ attempt: number, delayMs: number, elapsedBeforeMs: number, totalMs: number }>}
 */
export function planFor(policy) {
  validatePolicy(policy);

  const plan = [];
  let elapsed = 0;

  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    const delayMs = nextDelayMs(attempt, policy);
    const elapsedBeforeMs = elapsed;
    const totalMs = elapsedBeforeMs + delayMs;
    plan.push({ attempt, delayMs, elapsedBeforeMs, totalMs });
    elapsed += delayMs;
  }

  return plan;
}
