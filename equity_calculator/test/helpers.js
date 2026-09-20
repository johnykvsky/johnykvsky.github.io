/**
 * Shared Test Utilities and Assertions for Texas Hold'em Calculator Tests
 */

const { parseCard } = require('../js/cards');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

class TestSuite {
    constructor(name) {
        this.name = name;
        this.total = 0;
        this.passed = 0;
        this.failed = 0;
    }

    assert(condition, message) {
        this.total++;
        if (condition) {
            this.passed++;
            console.log(`  ${GREEN}✓${RESET} ${message}`);
        } else {
            this.failed++;
            console.error(`  ${RED}✗ FAIL:${RESET} ${message}`);
        }
    }

    assertEqual(actual, expected, message) {
        this.assert(actual === expected, `${message} (Expected: ${expected}, Got: ${actual})`);
    }

    assertCloseTo(actual, expected, delta, message) {
        this.assert(
            Math.abs(actual - expected) <= delta,
            `${message} (Expected: ~${expected}±${delta}, Got: ${typeof actual === 'number' ? actual.toFixed(2) : actual})`
        );
    }

    summary() {
        console.log(`\n${BOLD}Suite Summary (${this.name}): ${this.passed}/${this.total} Passed${RESET}`);
        if (this.failed > 0) {
            console.error(`${RED}${BOLD}FAILED: ${this.failed} test(s) failed in ${this.name}.${RESET}`);
        }
        return { total: this.total, passed: this.passed, failed: this.failed };
    }
}

/**
 * Parse an array of card strings (e.g. ['As', 'Kd']) into card IDs [0..51]
 */
function parseHand(strList) {
    return strList.map(s => {
        const c = parseCard(s);
        if (!c) throw new Error(`Invalid card string: ${s}`);
        return c.id;
    });
}

module.exports = {
    TestSuite,
    parseHand,
    colors: { GREEN, RED, YELLOW, CYAN, RESET, BOLD }
};
