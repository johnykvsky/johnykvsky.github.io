/**
 * Root Test Entrypoint
 * Forwards execution to the modular test suite in test/run-all.js.
 * Individual suites can also be run directly:
 *   - node test/evaluator.test.js
 *   - node test/outs.test.js
 *   - node test/simulator.test.js
 */

require('./test/run-all');
