/**
 * capacity-window: a reservation ledger with a conservation invariant.
 *
 * createCapacity({ total }) returns a ledger tracking a fixed pool of capacity.
 * reserved() + available() always equals total.
 */

/**
 * @param {{ total: number }} options
 */
export function createCapacity(options) {
  // Validate options
  if (
    options === null ||
    options === undefined ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError('options must be an object');
  }

  const { total } = options;

  if (
    typeof total !== 'number' ||
    !Number.isInteger(total) ||
    total <= 0
  ) {
    throw new TypeError('options.total must be a positive integer');
  }

  // Internal ledger: Map from holder (string) -> amount (positive integer)
  const ledger = new Map();

  function validateHolder(holder) {
    if (typeof holder !== 'string' || holder === '') {
      throw new TypeError('holder must be a non-empty string');
    }
  }

  function validateAmount(amount) {
    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new TypeError('amount must be a positive integer');
    }
  }

  function currentReserved() {
    let sum = 0;
    for (const amt of ledger.values()) {
      sum += amt;
    }
    return sum;
  }

  return {
    /**
     * Reserves `amount` capacity for `holder`.
     * If holder already has a reservation, adds to it.
     * Throws /insufficient_capacity/ if not enough capacity is available.
     * @param {string} holder
     * @param {number} amount
     * @returns {{ holder: string, amount: number }}
     */
    reserve(holder, amount) {
      validateHolder(holder);
      validateAmount(amount);

      const existing = ledger.get(holder) ?? 0;
      const newAmount = existing + amount;
      const newReserved = currentReserved() - existing + newAmount;

      if (newReserved > total) {
        throw new Error('insufficient_capacity');
      }

      ledger.set(holder, newAmount);
      return { holder, amount: newAmount };
    },

    /**
     * Releases the entire reservation for `holder`.
     * Throws /holder_not_found/ if the holder has no reservation.
     * @param {string} holder
     */
    release(holder) {
      validateHolder(holder);

      if (!ledger.has(holder)) {
        throw new Error('holder_not_found');
      }

      ledger.delete(holder);
    },

    /**
     * Returns how much capacity is currently unreserved.
     * @returns {number}
     */
    available() {
      return total - currentReserved();
    },

    /**
     * Returns how much capacity is currently reserved.
     * @returns {number}
     */
    reserved() {
      return currentReserved();
    },

    /**
     * Returns a copy of all holder reservations, sorted by holder name.
     * @returns {{ holder: string, amount: number }[]}
     */
    holders() {
      return Array.from(ledger.entries())
        .map(([holder, amount]) => ({ holder, amount }))
        .sort((a, b) => a.holder < b.holder ? -1 : a.holder > b.holder ? 1 : 0);
    },
  };
}
