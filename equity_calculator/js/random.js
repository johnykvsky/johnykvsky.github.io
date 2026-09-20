/**
 * Cryptographically strong randomness utilities.
 * Uses window.crypto / self.crypto / globalThis.crypto with Fisher-Yates shuffle.
 */

function getCryptoInstance() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
        return globalThis.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto;
    }
    if (typeof self !== 'undefined' && self.crypto) {
        return self.crypto;
    }
    throw new Error('Cryptographically secure RNG (crypto.getRandomValues) is not supported in this environment.');
}

/**
 * Returns a cryptographically secure random integer in the range [0, max - 1].
 * Uses rejection sampling to completely avoid modulo bias.
 */
function secureRandomInt(max) {
    if (max <= 1) return 0;
    const crypto = getCryptoInstance();
    const buffer = new Uint32Array(1);
    const range = 0x100000000; // 2^32
    const limit = range - (range % max);

    let val;
    do {
        crypto.getRandomValues(buffer);
        val = buffer[0];
    } while (val >= limit);

    return val % max;
}

/**
 * Cryptographically secure Fisher-Yates shuffle on an array (in-place).
 */
function secureShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

/**
 * Creates a standard 52-card deck represented as card IDs (0 to 51).
 */
function createDeck() {
    const deck = new Array(52);
    for (let i = 0; i < 52; i++) {
        deck[i] = i;
    }
    return deck;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { secureRandomInt, secureShuffle, createDeck };
}
