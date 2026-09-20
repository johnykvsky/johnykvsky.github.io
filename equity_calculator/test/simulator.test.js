/**
 * Simulator Unit Tests
 * Tests exact combinatorial enumeration (Turn & River) and Monte Carlo simulation accuracy.
 */

const { runSimulation } = require('../js/simulator');
const { TestSuite, parseHand, colors } = require('./helpers');
const { BOLD, CYAN, RESET } = colors;

function runSimulatorTests(suite = new TestSuite('Simulation Engine')) {
    console.log(`${BOLD}${CYAN}--- Simulation: Exact Combinatorial Enumeration (Turn & River) ---${RESET}`);

    // Exact Turn Enumeration: AA vs KK on QJ2 3
    // Total remaining river cards = 44 cards
    // KK only wins with the 2 remaining Kings (2 / 44 = 4.545%). AA wins 42 / 44 = 95.455%
    const heroAA = parseHand(['As', 'Ah']);
    const oppKK = [parseHand(['Ks', 'Kh'])];
    const turnBoard = parseHand(['Qs', 'Jd', '2c', '3h']);

    const resTurnExact = runSimulation({
        heroCards: heroAA,
        opponentCards: oppKK,
        numPlayers: 2,
        communityCards: turnBoard,
        burnCards: true
    });

    suite.assertEqual(resTurnExact.isExact, true, 'Turn with known hands triggers 100% exact enumeration');
    suite.assertEqual(resTurnExact.iterations, 44, 'Turn exact enumeration evaluates exactly 44 river runouts');
    suite.assertCloseTo(resTurnExact.hero.winPct, 95.45, 0.01, 'Hero win % on turn is exactly 95.45% (42/44)');
    suite.assertCloseTo(resTurnExact.hero.lossPct, 4.55, 0.01, 'Hero loss % on turn is exactly 4.55% (2/44)');
    suite.assertEqual(resTurnExact.hero.tiePct, 0, 'No ties possible in this specific runout');

    // Exact River Enumeration: 5 board cards, known opponent -> 1 combo (100% deterministic)
    const riverBoardWin = parseHand(['Qs', 'Jd', '2c', '3h', '4s']);
    const resRiverExact = runSimulation({
        heroCards: heroAA,
        opponentCards: oppKK,
        numPlayers: 2,
        communityCards: riverBoardWin,
        burnCards: true
    });
    suite.assertEqual(resRiverExact.isExact, true, 'River with known hands triggers exact calculation');
    suite.assertEqual(resRiverExact.iterations, 1, 'River evaluates exactly 1 showdown combination');
    suite.assertEqual(resRiverExact.hero.winPct, 100, 'Hero wins 100% on river when ahead');

    // Exact River Enumeration: Split Pot (both hold AK on board with no flush/straight improvement)
    const heroAK = parseHand(['As', 'Kd']);
    const oppAK = [parseHand(['Ah', 'Kc'])];
    const riverBoardSplit = parseHand(['2s', '3d', '7c', '8h', '9s']);
    const resRiverSplit = runSimulation({
        heroCards: heroAK,
        opponentCards: oppAK,
        numPlayers: 2,
        communityCards: riverBoardSplit,
        burnCards: true
    });
    suite.assertEqual(resRiverSplit.hero.tiePct, 100, 'Identical holdings on blank board result in 100% split pot (tie)');
    suite.assertEqual(resRiverSplit.hero.winPct, 0, 'Neither player wins outright on chopped pot');

    // Exact River Enumeration: 1 unknown opponent (45 cards left -> 45 * 44 / 2 = 990 combos)
    const resRiverUnknownOpp = runSimulation({
        heroCards: heroAA,
        opponentCards: [[]],
        numPlayers: 2,
        communityCards: riverBoardWin,
        burnCards: true
    });
    suite.assertEqual(resRiverUnknownOpp.isExact, true, 'River with 1 unknown opponent triggers exact enumeration');
    suite.assertEqual(resRiverUnknownOpp.iterations, 990, 'Evaluates all 990 combinations (45 C 2)');

    console.log(`\n${BOLD}${CYAN}--- Simulation: Monte Carlo Accuracy & Game Settings ---${RESET}`);

    // Test 1: AA vs KK Pre-Flop Heads-Up (Classical poker theory: AA has ~81-83% equity)
    const simHeadsUp = runSimulation({
        heroCards: heroAA,
        opponentCards: oppKK,
        numPlayers: 2,
        iterations: 5000,
        burnCards: true
    });
    suite.assertCloseTo(simHeadsUp.hero.winPct, 81.5, 2.0, 'AA vs KK Heads-Up win rate is ~81.5% ±2%');
    suite.assert(simHeadsUp.hero.tiePct < 2.0, 'AA vs KK tie rate is low (< 2%)');

    // Test 2: AA in 10-Player Full Ring (Classical poker theory: AA has ~31-32% equity)
    const sim10Player = runSimulation({
        heroCards: heroAA,
        numPlayers: 10,
        iterations: 5000,
        burnCards: true
    });
    suite.assertCloseTo(sim10Player.hero.equityPct, 31.5, 2.0, 'AA in 10-Player Full Ring equity is ~31.5% ±2%');

    // Test 3: Classic Coin Flip (AKs vs QQ)
    // AK suited vs QQ pre-flop is ~46% vs ~54% equity
    const heroAKs = parseHand(['As', 'Ks']);
    const oppQQ = [parseHand(['Qh', 'Qd'])];
    const simCoinFlip = runSimulation({
        heroCards: heroAKs,
        opponentCards: oppQQ,
        numPlayers: 2,
        iterations: 5000,
        burnCards: true
    });
    suite.assertCloseTo(simCoinFlip.hero.equityPct, 46.0, 3.0, 'AKs vs QQ classic coin flip equity is ~46% ±3%');

    // Test 4: Burn cards toggle consistency (both burnCards=true and burnCards=false execute cleanly)
    const simNoBurn = runSimulation({
        heroCards: heroAA,
        opponentCards: oppKK,
        numPlayers: 2,
        iterations: 1000,
        burnCards: false
    });
    suite.assertEqual(simNoBurn.iterations, 1000, 'Simulation runs successfully with burnCards disabled');
    suite.assertCloseTo(simNoBurn.hero.winPct, 81.5, 3.0, 'Burn cards toggle preserves unbiased win rate');

    return suite;
}

if (require.main === module) {
    const suite = runSimulatorTests();
    const results = suite.summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runSimulatorTests };
