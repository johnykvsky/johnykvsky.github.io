/**
 * Evaluator Unit Tests
 * Tests hand category hierarchy, kicker resolution, and 7-card combination selection.
 */

const { evaluateHand, HAND_NAMES } = require('../js/evaluator');
const { TestSuite, parseHand, colors } = require('./helpers');
const { BOLD, CYAN, RESET } = colors;

function runEvaluatorTests(suite = new TestSuite('Hand Evaluator')) {
    console.log(`${BOLD}${CYAN}--- Hand Evaluator: Categories & Hierarchy ---${RESET}`);

    // Royal Flush
    const royal = parseHand(['As', 'Ks', 'Qs', 'Js', 'Ts', '2d', '3h']);
    const resRoyal = evaluateHand(royal);
    suite.assertEqual(resRoyal.category, 9, 'Royal Flush has category 9');
    suite.assertEqual(resRoyal.name, 'Royal Flush', 'Royal Flush name matches');

    // Straight Flush (9-high)
    const sf = parseHand(['9h', '8h', '7h', '6h', '5h', 'Kd', 'Ac']);
    const resSf = evaluateHand(sf);
    suite.assertEqual(resSf.category, 9, 'Straight Flush has category 9');
    suite.assertEqual(resSf.name, 'Straight Flush', 'Straight Flush name matches');

    // Steel Wheel (5-high Straight Flush: A-2-3-4-5)
    const wheelSf = parseHand(['Ad', '2d', '3d', '4d', '5d', 'Ks', 'Qc']);
    const resWheelSf = evaluateHand(wheelSf);
    suite.assertEqual(resWheelSf.category, 9, 'Steel Wheel (5-high Straight Flush) has category 9');
    suite.assert(resRoyal.score > resWheelSf.score, 'Royal Flush beats Steel Wheel');

    // Four of a Kind
    const quads = parseHand(['8s', '8h', '8d', '8c', 'As', '2d', '3h']);
    const resQuads = evaluateHand(quads);
    suite.assertEqual(resQuads.category, 8, 'Four of a Kind has category 8');

    // Full House
    const fh = parseHand(['Ks', 'Kh', 'Kd', 'Js', 'Jh', '2d', '3h']);
    const resFh = evaluateHand(fh);
    suite.assertEqual(resFh.category, 7, 'Full House has category 7');

    // Flush
    const flush = parseHand(['As', 'Js', '8s', '6s', '2s', 'Kd', 'Qh']);
    const resFlush = evaluateHand(flush);
    suite.assertEqual(resFlush.category, 6, 'Flush has category 6');

    // Straight (Broadway: A-K-Q-J-T)
    const broadway = parseHand(['As', 'Kd', 'Qh', 'Jc', 'Ts', '2d', '3h']);
    const resBroadway = evaluateHand(broadway);
    suite.assertEqual(resBroadway.category, 5, 'Broadway Straight has category 5');

    // Straight (Wheel: A-2-3-4-5)
    const wheel = parseHand(['Ah', '2d', '3s', '4c', '5h', 'Jd', 'Kd']);
    const resWheel = evaluateHand(wheel);
    suite.assertEqual(resWheel.category, 5, 'Wheel Straight (A-2-3-4-5) has category 5');
    suite.assert(resBroadway.score > resWheel.score, 'Broadway Straight beats Wheel Straight');

    // Three of a Kind
    const trips = parseHand(['7s', '7h', '7d', 'As', 'Kd', '2c', '3h']);
    const resTrips = evaluateHand(trips);
    suite.assertEqual(resTrips.category, 4, 'Three of a Kind has category 4');

    // Two Pair
    const twoPair = parseHand(['Js', 'Jh', '9d', '9c', 'As', '2d', '3h']);
    const resTwoPair = evaluateHand(twoPair);
    suite.assertEqual(resTwoPair.category, 3, 'Two Pair has category 3');

    // One Pair
    const pair = parseHand(['Ts', 'Th', 'As', 'Kd', 'Qc', '2d', '3h']);
    const resPair = evaluateHand(pair);
    suite.assertEqual(resPair.category, 2, 'One Pair has category 2');

    // High Card
    const highCard = parseHand(['As', 'Kd', 'Jc', '8h', '4s', '3d', '2c']);
    const resHighCard = evaluateHand(highCard);
    suite.assertEqual(resHighCard.category, 1, 'High Card has category 1');

    // Category hierarchy checks
    suite.assert(resRoyal.score > resQuads.score, 'Straight Flush beats Quads');
    suite.assert(resQuads.score > resFh.score, 'Quads beat Full House');
    suite.assert(resFh.score > resFlush.score, 'Full House beats Flush');
    suite.assert(resFlush.score > resBroadway.score, 'Flush beats Straight');
    suite.assert(resBroadway.score > resTrips.score, 'Straight beats Three of a Kind');
    suite.assert(resTrips.score > resTwoPair.score, 'Three of a Kind beats Two Pair');
    suite.assert(resTwoPair.score > resPair.score, 'Two Pair beats One Pair');
    suite.assert(resPair.score > resHighCard.score, 'One Pair beats High Card');

    console.log(`\n${BOLD}${CYAN}--- Hand Evaluator: Kickers & Disambiguation Edge Cases ---${RESET}`);

    // Edge Case 1: One Pair - Pair of 10s MUST beat Pair of 2s with Ace kicker
    const pair10 = evaluateHand(parseHand(['Td', 'Th', 'As', '9c', '8d']));
    const pair2_withAce = evaluateHand(parseHand(['2s', '2h', 'As', 'Kc', 'Qd']));
    suite.assert(pair10.score > pair2_withAce.score, 'Pair of 10s beats Pair of 2s with Ace kicker');

    // Edge Case 2: One Pair - Same pair, higher kicker wins
    const pairA_KickerK = evaluateHand(parseHand(['As', 'Ah', 'Kd', '8c', '2s']));
    const pairA_KickerQ = evaluateHand(parseHand(['As', 'Ah', 'Qd', 'Jc', 'Ts']));
    suite.assert(pairA_KickerK.score > pairA_KickerQ.score, 'Pair of Aces with King kicker beats Pair of Aces with Queen kicker');

    // Edge Case 3: One Pair - Same pair, same 1st & 2nd kickers, 3rd kicker breaks tie
    const pairK_987 = evaluateHand(parseHand(['Ks', 'Kh', '9d', '8c', '7s']));
    const pairK_986 = evaluateHand(parseHand(['Ks', 'Kh', '9d', '8c', '6s']));
    suite.assert(pairK_987.score > pairK_986.score, 'Same pair and 2 kickers: 3rd kicker (7 vs 6) breaks tie');

    // Edge Case 4: Two Pair - Aces & Queens MUST beat Kings & Twos with Ace kicker
    const twoPair_AAQQ = evaluateHand(parseHand(['As', 'Ah', 'Qd', 'Qc', '2s']));
    const twoPair_KK22_AceKicker = evaluateHand(parseHand(['Ks', 'Kh', '2d', '2c', 'As']));
    suite.assert(twoPair_AAQQ.score > twoPair_KK22_AceKicker.score, 'Aces and Queens beats Kings and Twos with Ace kicker');

    // Edge Case 5: Two Pair - Higher second pair wins regardless of kicker
    const twoPair_AA77_2 = evaluateHand(parseHand(['As', 'Ah', '7d', '7c', '2s']));
    const twoPair_AA66_K = evaluateHand(parseHand(['As', 'Ac', '6d', '6c', 'Ks']));
    suite.assert(twoPair_AA77_2.score > twoPair_AA66_K.score, 'AA77 with 2 kicker beats AA66 with King kicker (second pair determines tie)');

    // Edge Case 6: Two Pair - Same two pairs, kicker breaks tie
    const twoPair_KKJJ_A = evaluateHand(parseHand(['Ks', 'Kh', 'Js', 'Jh', 'Ad']));
    const twoPair_KKJJ_Q = evaluateHand(parseHand(['Ks', 'Kh', 'Js', 'Jh', 'Qd']));
    suite.assert(twoPair_KKJJ_A.score > twoPair_KKJJ_Q.score, 'KKJJ with Ace kicker beats KKJJ with Queen kicker');

    // Edge Case 7: Three of a Kind - Three 3s MUST beat Three 2s with Ace kicker
    const trips3 = evaluateHand(parseHand(['3s', '3h', '3d', '4c', '5d']));
    const trips2_withAce = evaluateHand(parseHand(['2s', '2h', '2d', 'As', 'Kd']));
    suite.assert(trips3.score > trips2_withAce.score, 'Three 3s beats Three 2s with Ace kicker');

    // Edge Case 8: Full House - Threes full of Twos MUST beat Twos full of Aces
    const fh_33322 = evaluateHand(parseHand(['3s', '3h', '3d', '2c', '2d']));
    const fh_222AA = evaluateHand(parseHand(['2s', '2h', '2c', 'As', 'Ad']));
    suite.assert(fh_33322.score > fh_222AA.score, 'Threes full of Twos beats Twos full of Aces');

    // Edge Case 9: Full House - Same trips, higher pair wins
    const fh_AAAKK = evaluateHand(parseHand(['As', 'Ah', 'Ad', 'Ks', 'Kh']));
    const fh_AAAQQ = evaluateHand(parseHand(['As', 'Ah', 'Ad', 'Qs', 'Qh']));
    suite.assert(fh_AAAKK.score > fh_AAAQQ.score, 'Aces full of Kings beats Aces full of Queens');

    // Edge Case 10: Four of a Kind - Four 3s MUST beat Four 2s with Ace kicker
    const quads3 = evaluateHand(parseHand(['3s', '3h', '3d', '3c', '2d']));
    const quads2_withAce = evaluateHand(parseHand(['2s', '2h', '2d', '2c', 'As']));
    suite.assert(quads3.score > quads2_withAce.score, 'Four 3s beats Four 2s with Ace kicker');

    // Edge Case 11: Four of a Kind - Same quads, kicker breaks tie
    const quadsK_A = evaluateHand(parseHand(['Ks', 'Kh', 'Kd', 'Kc', 'As']));
    const quadsK_Q = evaluateHand(parseHand(['Ks', 'Kh', 'Kd', 'Kc', 'Qs']));
    suite.assert(quadsK_A.score > quadsK_Q.score, 'Four Kings with Ace kicker beats Four Kings with Queen kicker');

    // Edge Case 12: Flush - 5th card kicker breaks tie
    const flush_AK863 = evaluateHand(parseHand(['As', 'Ks', '8s', '6s', '3s']));
    const flush_AK862 = evaluateHand(parseHand(['As', 'Ks', '8s', '6s', '2s']));
    suite.assert(flush_AK863.score > flush_AK862.score, 'Same 4 flush cards: 5th card (3s vs 2s) breaks tie');

    // Edge Case 13: Identical 5-card hands result in an exact tie score
    const hand1 = evaluateHand(parseHand(['As', 'Kd', 'Qh', 'Jc', 'Ts']));
    const hand2 = evaluateHand(parseHand(['Ah', 'Kc', 'Qd', 'Js', 'Tc']));
    suite.assertEqual(hand1.score, hand2.score, 'Identical rank Broadway straights have exact equal score (chop/tie)');

    console.log(`\n${BOLD}${CYAN}--- Hand Evaluator: 7-Card Combination Resolution ---${RESET}`);

    // 3 Pairs on 7-card board: Must choose top 2 pairs + highest remaining kicker
    const threePairs = evaluateHand(parseHand(['Ks', 'Kh', 'Js', 'Jh', '8s', '8h', '2d']));
    const expectedTwoPair = evaluateHand(parseHand(['Ks', 'Kh', 'Js', 'Jh', '8s']));
    suite.assertEqual(threePairs.score, expectedTwoPair.score, '3 Pairs on board selects top 2 pairs with highest remaining kicker (8)');

    // Two 3-of-a-kinds on 7-card board: Must choose higher trips as trips, lower trips as pair
    const twoTrips = evaluateHand(parseHand(['7s', '7h', '7d', '3s', '3h', '3d', 'Kd']));
    const expectedFh = evaluateHand(parseHand(['7s', '7h', '7d', '3s', '3c']));
    suite.assertEqual(twoTrips.score, expectedFh.score, 'Two 3-of-a-kinds on board selects higher trips (777) and lower trips as pair (33)');

    // One 3-of-a-kind and two pairs on 7-card board: Must choose trips + highest pair
    const tripsTwoPairs = evaluateHand(parseHand(['8s', '8h', '8d', 'Js', 'Jh', '4s', '4h']));
    const expectedTripsPair = evaluateHand(parseHand(['8s', '8h', '8d', 'Js', 'Jh']));
    suite.assertEqual(tripsTwoPairs.score, expectedTripsPair.score, 'Trips and two pairs selects trips with highest pair (888JJ)');

    // 6-card flush on board: Must choose the 5 highest flush cards
    const sixFlush = evaluateHand(parseHand(['As', 'Ks', 'Qs', 'Js', '9s', '2s', '3d']));
    const expectedTopFlush = evaluateHand(parseHand(['As', 'Ks', 'Qs', 'Js', '9s']));
    suite.assertEqual(sixFlush.score, expectedTopFlush.score, '6-card flush selects top 5 flush cards (excludes 2s)');

    // 6-card straight on board: Must choose highest straight
    const sixStraight = evaluateHand(parseHand(['4s', '5h', '6d', '7c', '8s', '9d', '2c']));
    suite.assertEqual(sixStraight.description, 'Straight, 9 High', '6-card straight correctly selects 9-high straight over 8-high');

    // Wheel straight on board with a 6: A, 2, 3, 4, 5, 6 -> 6-high straight beats 5-high straight
    const wheelWith6 = evaluateHand(parseHand(['As', '2h', '3d', '4c', '5s', '6d', 'Kh']));
    suite.assertEqual(wheelWith6.description, 'Straight, 6 High', 'Wheel with a 6 correctly resolves to 6-high straight');

    // Counterfeited Pair: Hero holds 2s 2d on board 5c 5d 6c 6d Ks -> Best hand is 6655K (Hero's 2s are counterfeited)
    const counterfeited = evaluateHand(parseHand(['2s', '2d', '5c', '5d', '6c', '6d', 'Ks']));
    const boardPlaying = evaluateHand(parseHand(['6c', '6d', '5c', '5d', 'Ks', '3h', '4h']));
    suite.assertEqual(counterfeited.score, boardPlaying.score, 'Counterfeited pair: 22 on 5566K board yields 6655K (plays the board)');

    return suite;
}

if (require.main === module) {
    const suite = runEvaluatorTests();
    const results = suite.summary();
    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runEvaluatorTests };
