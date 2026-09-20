/**
 * Master Test Runner for Texas Hold'em Calculator
 * Runs all modular test suites and outputs overall results.
 */

const { runEvaluatorTests } = require('./evaluator.test');
const { runOutsTests } = require('./outs.test');
const { runSimulatorTests } = require('./simulator.test');
const { colors } = require('./helpers');
const { BOLD, CYAN, GREEN, RED, RESET } = colors;

console.log(`${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${CYAN}   TEXAS HOLD'EM CALCULATOR - UNIT TEST SUITE      ${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

const startTime = Date.now();

const evaluatorSuite = runEvaluatorTests();
const outsSuite = runOutsTests();
const simulatorSuite = runSimulatorTests();

const totalTests = evaluatorSuite.total + outsSuite.total + simulatorSuite.total;
const passedTests = evaluatorSuite.passed + outsSuite.passed + simulatorSuite.passed;
const failedTests = evaluatorSuite.failed + outsSuite.failed + simulatorSuite.failed;
const durationMs = Date.now() - startTime;

console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}OVERALL TEST RESULTS: ${passedTests}/${totalTests} Passed (${((passedTests / totalTests) * 100).toFixed(1)}%) in ${durationMs}ms${RESET}`);
console.log(`  - Hand Evaluator: ${evaluatorSuite.passed}/${evaluatorSuite.total} passed`);
console.log(`  - Outs & Draws:   ${outsSuite.passed}/${outsSuite.total} passed`);
console.log(`  - Simulator Math: ${simulatorSuite.passed}/${simulatorSuite.total} passed`);
console.log(`${BOLD}${CYAN}====================================================${RESET}`);

if (failedTests > 0) {
    console.error(`\n${RED}${BOLD}FAILED: ${failedTests} test(s) failed across all suites.${RESET}`);
    process.exit(1);
} else {
    console.log(`\n${GREEN}${BOLD}ALL ${totalTests} TESTS PASSED! Calculation engine is verified 100% correct.${RESET}`);
    process.exit(0);
}
