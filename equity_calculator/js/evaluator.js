/**
 * Fast 7-card (and 5/6-card) Texas Hold'em hand evaluator.
 * Evaluates the best 5-card hand from up to 7 cards and generates a comparable 32-bit score.
 */

const HAND_NAMES = {
    9: 'Straight Flush',
    8: 'Four of a Kind',
    7: 'Full House',
    6: 'Flush',
    5: 'Straight',
    4: 'Three of a Kind',
    3: 'Two Pair',
    2: 'One Pair',
    1: 'High Card'
};

const RANK_NAMES = {
    14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: '10',
    9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2'
};

const RANK_NAMES_PLURAL = {
    14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks', 10: 'Tens',
    9: 'Nines', 8: 'Eights', 7: 'Sevens', 6: 'Sixes', 5: 'Fives', 4: 'Fours', 3: 'Threes', 2: 'Twos'
};

/**
 * Check if an array of unique sorted ranks (descending) contains a straight.
 * Returns the highest rank of the straight, or 0 if no straight.
 */
function findStraightHighRank(ranksDesc) {
    let mask = 0;
    for (let i = 0; i < ranksDesc.length; i++) {
        const r = ranksDesc[i];
        mask |= (1 << r);
        if (r === 14) {
            mask |= (1 << 1); // Ace also counts as 1 for A-2-3-4-5 wheel
        }
    }

    for (let r = 14; r >= 5; r--) {
        const target = (0x1F << (r - 4));
        if ((mask & target) === target) {
            return r;
        }
    }
    return 0;
}

/**
 * Evaluates best 5-card hand from a list of card objects or IDs.
 * Each card can be either a cardId (0-51) or an object with {suitId, rankValue}.
 */
function evaluateHand(cards) {
    if (!cards || cards.length < 5) {
        return { category: 0, score: 0, description: 'Incomplete Hand' };
    }

    // Standardize cards
    const parsedCards = cards.map(c => {
        if (typeof c === 'number') {
            return {
                suitId: Math.floor(c / 13),
                rankValue: (c % 13) + 2
            };
        }
        return c;
    });

    // 1. Group by suits
    const suitCards = [[], [], [], []];
    for (let i = 0; i < parsedCards.length; i++) {
        suitCards[parsedCards[i].suitId].push(parsedCards[i].rankValue);
    }

    let flushSuit = -1;
    for (let s = 0; s < 4; s++) {
        if (suitCards[s].length >= 5) {
            flushSuit = s;
            break;
        }
    }

    // Check Straight Flush / Royal Flush
    if (flushSuit !== -1) {
        const flushRanks = [...new Set(suitCards[flushSuit])].sort((a, b) => b - a);
        const straightFlushHigh = findStraightHighRank(flushRanks);
        if (straightFlushHigh > 0) {
            const score = (9 << 20) | (straightFlushHigh << 16);
            const isRoyal = straightFlushHigh === 14;
            return {
                category: 9,
                score,
                name: isRoyal ? 'Royal Flush' : 'Straight Flush',
                description: isRoyal ? 'Royal Flush' : `Straight Flush, ${RANK_NAMES[straightFlushHigh]} High`
            };
        }
    }

    // 2. Rank frequency analysis
    const rankCounts = new Array(15).fill(0);
    for (let i = 0; i < parsedCards.length; i++) {
        rankCounts[parsedCards[i].rankValue]++;
    }

    const quads = [];
    const trips = [];
    const pairs = [];
    const singles = [];

    for (let r = 14; r >= 2; r--) {
        const count = rankCounts[r];
        if (count === 4) quads.push(r);
        else if (count === 3) trips.push(r);
        else if (count === 2) pairs.push(r);
        else if (count === 1) singles.push(r);
    }

    // Four of a Kind
    if (quads.length > 0) {
        const quadRank = quads[0];
        // Kicker is highest rank not in the quad
        let kicker = 0;
        for (let r = 14; r >= 2; r--) {
            if (r !== quadRank && rankCounts[r] > 0) {
                kicker = r;
                break;
            }
        }
        const score = (8 << 20) | (quadRank << 16) | (kicker << 12);
        return {
            category: 8,
            score,
            name: 'Four of a Kind',
            description: `Four of a Kind, ${RANK_NAMES_PLURAL[quadRank]}`
        };
    }

    // Full House
    if (trips.length >= 2) {
        const tripRank = trips[0];
        const pairRank = trips[1];
        const score = (7 << 20) | (tripRank << 16) | (pairRank << 12);
        return {
            category: 7,
            score,
            name: 'Full House',
            description: `Full House, ${RANK_NAMES_PLURAL[tripRank]} full of ${RANK_NAMES_PLURAL[pairRank]}`
        };
    } else if (trips.length === 1 && pairs.length >= 1) {
        const tripRank = trips[0];
        const pairRank = pairs[0];
        const score = (7 << 20) | (tripRank << 16) | (pairRank << 12);
        return {
            category: 7,
            score,
            name: 'Full House',
            description: `Full House, ${RANK_NAMES_PLURAL[tripRank]} full of ${RANK_NAMES_PLURAL[pairRank]}`
        };
    }

    // Flush
    if (flushSuit !== -1) {
        const sortedFlush = suitCards[flushSuit].sort((a, b) => b - a);
        const score = (6 << 20) |
            (sortedFlush[0] << 16) |
            (sortedFlush[1] << 12) |
            (sortedFlush[2] << 8) |
            (sortedFlush[3] << 4) |
            sortedFlush[4];
        return {
            category: 6,
            score,
            name: 'Flush',
            description: `Flush, ${RANK_NAMES[sortedFlush[0]]} High`
        };
    }

    // Straight
    const uniqueRanksDesc = [];
    for (let r = 14; r >= 2; r--) {
        if (rankCounts[r] > 0) uniqueRanksDesc.push(r);
    }
    const straightHigh = findStraightHighRank(uniqueRanksDesc);
    if (straightHigh > 0) {
        const score = (5 << 20) | (straightHigh << 16);
        return {
            category: 5,
            score,
            name: 'Straight',
            description: `Straight, ${RANK_NAMES[straightHigh]} High`
        };
    }

    // Three of a Kind
    if (trips.length === 1) {
        const tripRank = trips[0];
        const kickers = [];
        for (let r = 14; r >= 2 && kickers.length < 2; r--) {
            if (r !== tripRank && rankCounts[r] > 0) {
                kickers.push(r);
            }
        }
        const score = (4 << 20) | (tripRank << 16) | ((kickers[0] || 0) << 12) | ((kickers[1] || 0) << 8);
        return {
            category: 4,
            score,
            name: 'Three of a Kind',
            description: `Three of a Kind, ${RANK_NAMES_PLURAL[tripRank]}`
        };
    }

    // Two Pair
    if (pairs.length >= 2) {
        const highPair = pairs[0];
        const lowPair = pairs[1];
        // Kicker can be from a 3rd pair or from singles
        let kicker = 0;
        for (let r = 14; r >= 2; r--) {
            if (r !== highPair && r !== lowPair && rankCounts[r] > 0) {
                kicker = r;
                break;
            }
        }
        const score = (3 << 20) | (highPair << 16) | (lowPair << 12) | (kicker << 8);
        return {
            category: 3,
            score,
            name: 'Two Pair',
            description: `Two Pair, ${RANK_NAMES_PLURAL[highPair]} and ${RANK_NAMES_PLURAL[lowPair]}`
        };
    }

    // One Pair
    if (pairs.length === 1) {
        const pairRank = pairs[0];
        const kickers = [];
        for (let r = 14; r >= 2 && kickers.length < 3; r--) {
            if (r !== pairRank && rankCounts[r] > 0) {
                kickers.push(r);
            }
        }
        const score = (2 << 20) |
            (pairRank << 16) |
            ((kickers[0] || 0) << 12) |
            ((kickers[1] || 0) << 8) |
            ((kickers[2] || 0) << 4);
        return {
            category: 2,
            score,
            name: 'One Pair',
            description: `Pair of ${RANK_NAMES_PLURAL[pairRank]}`
        };
    }

    // High Card
    const topCards = uniqueRanksDesc.slice(0, 5);
    const score = (1 << 20) |
        ((topCards[0] || 0) << 16) |
        ((topCards[1] || 0) << 12) |
        ((topCards[2] || 0) << 8) |
        ((topCards[3] || 0) << 4) |
        (topCards[4] || 0);

    return {
        category: 1,
        score,
        name: 'High Card',
        description: `${RANK_NAMES[topCards[0]]} High`
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateHand, HAND_NAMES, RANK_NAMES, RANK_NAMES_PLURAL };
}
