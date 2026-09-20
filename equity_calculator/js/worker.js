/**
 * Web Worker for running Monte Carlo poker simulations off the main thread.
 */

self.importScripts('cards.js', 'evaluator.js', 'random.js', 'simulator.js');

self.onmessage = function (e) {
    const { id, type, params } = e.data;

    if (type === 'SIMULATE') {
        try {
            const results = runSimulation(params, (progress) => {
                self.postMessage({ id, type: 'PROGRESS', progress });
            });
            self.postMessage({ id, type: 'RESULT', results });
        } catch (err) {
            self.postMessage({ id, type: 'ERROR', error: err.message });
        }
    }
};
