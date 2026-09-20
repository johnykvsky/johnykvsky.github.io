/**
 * Outs & Draws Unit Tests
 * Tests detection of draw types (Flush, OESD, Gutshots, Overcards, Sets) and out calculations.
 */

const { calculateOutsAndDraws } = require('../js/outs');
const { TestSuite, parseHand, colors } = require('./helpers');
const { BOLD, CYAN, RESET } = colors;

function runOutsTests(suite = new TestSuite('Outs & Draws')) {
    console.log(`${BOLD}${CYAN}--- Outs & Draws: Draw Type Detection ---${RESET}`);

    // Flush Draw: A♠ K♠ on Q♠ 7♠ 2♦ -> 9 flush outs, Nut Flush identified
    const heroFlush = parseHand(['As', 'Ks']);
    const boardFlush = parseHand(['Qs', '7s', '2d']);
    const outsFlush = calculateOutsAndDraws(heroFlush, boardFlush);
    suite.assert(outsFlush.draws.some(d => d.type === 'FLUSH_DRAW' && d.outsCount === 9), 'Detects 9-out Flush Draw on Flop');
    suite.assert(outsFlush.draws.some(d => d.name.includes('Nut Flush Draw')), 'Identifies Nut Flush Draw when holding Ace');
    suite.assertCloseTo(outsFlush.turnProb, 48.9, 0.5, 'Turn hit probability for improving hand calculated accurately (~48.9%)');
    suite.assertCloseTo(outsFlush.riverProb, 74.5, 0.5, 'Flop-to-River probability for improving hand calculated accurately (~74.5%)');

    // Non-Nut Flush Draw: 8♠ 7♠ on Q♠ 5♠ 2♦ -> 9 flush outs, but NOT Nut Flush Draw
    const heroNonNutFlush = parseHand(['8s', '7s']);
    const outsNonNutFlush = calculateOutsAndDraws(heroNonNutFlush, boardFlush);
    suite.assert(outsNonNutFlush.draws.some(d => d.type === 'FLUSH_DRAW' && d.outsCount === 9), 'Detects 9-out Flush Draw for 8s 7s');
    suite.assert(!outsNonNutFlush.draws.some(d => d.name.includes('Nut Flush Draw')), 'Does NOT flag as Nut Flush Draw without Ace');

    // Open-Ended Straight Draw: 8♠ 9♥ on 6♦ 7♣ 2s -> 8 outs (four 5s and four Ts)
    const heroOESD = parseHand(['8s', '9h']);
    const boardOESD = parseHand(['6d', '7c', '2s']);
    const outsOESD = calculateOutsAndDraws(heroOESD, boardOESD);
    const oestDraw = outsOESD.draws.find(d => d.type === 'OESD');
    suite.assert(!!oestDraw, 'Detects Open-Ended Straight Draw (OESD)');
    suite.assertEqual(oestDraw.outsCount, 8, 'OESD has exactly 8 straight outs');

    // Gutshot Draw: 8♠ 9♥ on 6♦ 10♣ 2s -> 4 outs (four 7s)
    const heroGutshot = parseHand(['8s', '9h']);
    const boardGutshot = parseHand(['6d', 'Tc', '2s']);
    const outsGutshot = calculateOutsAndDraws(heroGutshot, boardGutshot);
    const gutshotDraw = outsGutshot.draws.find(d => d.type === 'GUTSHOT');
    suite.assert(!!gutshotDraw, 'Detects Gutshot Straight Draw');
    suite.assertEqual(gutshotDraw.outsCount, 4, 'Gutshot has exactly 4 straight outs');

    // Double Gutshot Draw: 7♠ 9♥ on 5♦ 8♣ Jc -> needs 6 or 10 -> 8 outs total
    const heroDblGut = parseHand(['7s', '9h']);
    const boardDblGut = parseHand(['5d', '8c', 'Jc']);
    const outsDblGut = calculateOutsAndDraws(heroDblGut, boardDblGut);
    suite.assert(
        outsDblGut.draws.some(d => (d.type === 'DOUBLE_GUTSHOT' || d.type === 'OESD') && d.outsCount === 8),
        'Detects 8-out straight draw (Double Gutshot / 8-out draw)'
    );

    // Overcards: A♠ K♥ on 9♦ 5♣ 2s -> 6 outs to top pair (three Aces, three Kings)
    const heroOvercards = parseHand(['As', 'Kh']);
    const boardOvercards = parseHand(['9d', '5c', '2s']);
    const outsOvercards = calculateOutsAndDraws(heroOvercards, boardOvercards);
    const overcardsDraw = outsOvercards.draws.find(d => d.type === 'TWO_OVERCARDS');
    suite.assert(!!overcardsDraw, 'Detects Two Overcards');
    suite.assertEqual(overcardsDraw.outsCount, 6, 'Two Overcards has exactly 6 outs');

    // One Overcard: A♠ 8♥ on K♦ 9♣ 2s -> 3 outs to top pair (three Aces)
    const heroOneOvercard = parseHand(['As', '8h']);
    const boardOneOvercard = parseHand(['Kd', '9c', '2s']);
    const outsOneOvercard = calculateOutsAndDraws(heroOneOvercard, boardOneOvercard);
    const oneOvercardDraw = outsOneOvercard.draws.find(d => d.type === 'ONE_OVERCARD');
    suite.assert(!!oneOvercardDraw, 'Detects One Overcard');
    suite.assertEqual(oneOvercardDraw.outsCount, 3, 'One Overcard has exactly 3 outs');

    // Set Mining: 7♠ 7♥ on K♦ 9♣ 2s -> 2 outs to set (two remaining 7s)
    const heroSet = parseHand(['7s', '7h']);
    const boardSet = parseHand(['Kd', '9c', '2s']);
    const outsSet = calculateOutsAndDraws(heroSet, boardSet);
    const setDraw = outsSet.draws.find(d => d.type === 'SET_MINING');
    suite.assert(!!setDraw, 'Detects Set Mining');
    suite.assertEqual(setDraw.outsCount, 2, 'Set Mining has exactly 2 outs');

    // Turn Street Hit Probability (only 1 card to come)
    // 4 cards on board -> turnProb = 0 (Turn already dealt)
    const turnBoardFlush = parseHand(['Qs', '7s', '2d', '4c']);
    const outsTurnFlush = calculateOutsAndDraws(heroFlush, turnBoardFlush);
    suite.assertEqual(outsTurnFlush.turnProb, 0, 'On Turn, turnProb is 0 (Turn already dealt)');
    suite.assert(outsTurnFlush.riverProb > 0, 'On Turn, riverProb is calculated for the River card');

    return suite;
}

if (require.main === module) {
    const suite = runOutsTests();
    const results = suite.summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runOutsTests };
