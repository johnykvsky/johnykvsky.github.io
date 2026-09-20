/**
 * Texas Hold'em Outs & Draw Detection Engine.
 * Analyzes Hero hole cards and community cards on Flop and Turn
 * to identify draws (Flush draw, Straight draw, Overcards, etc.) and calculate exact outs.
 */

if (typeof require !== 'undefined') {
    var { getCard, createCardFromSuitAndRank } = require('./cards');
    var { evaluateHand } = require('./evaluator');
}

/**
 * Analyzes Hero cards + Board for drawing outs and draw types.
 * @param {Array<number>} heroCardIds - [c1, c2]
 * @param {Array<number>} boardCardIds - 3 or 4 cards (Flop or Turn)
 * @param {Array<number>} [knownOpponentCards] - Optional known opponent card IDs
 * @returns {Object} { draws: Array, outs: Array<number>, outsCount: number, turnProb: number, riverProb: number }
 */
function calculateOutsAndDraws(heroCardIds, boardCardIds, knownOpponentCards = []) {
    if (!heroCardIds || heroCardIds.length < 2 || !boardCardIds || boardCardIds.length < 3 || boardCardIds.length > 4) {
        return null;
    }

    const heroCards = heroCardIds.map(getCard);
    const boardCards = boardCardIds.map(getCard);
    const currentHand = [...heroCardIds, ...boardCardIds];
    const currentEval = evaluateHand(currentHand);

    // Collect all dead/known cards
    const deadCards = new Set([...heroCardIds, ...boardCardIds, ...knownOpponentCards]);

    // Remaining unknown cards in deck
    const remainingDeck = [];
    for (let i = 0; i < 52; i++) {
        if (!deadCards.has(i)) {
            remainingDeck.push(i);
        }
    }
    const remainingDeckCount = remainingDeck.length;

    // 1. Detect Draw Types
    const draws = [];

    // --- Flush Draw Detection ---
    const suitCounts = [0, 0, 0, 0];
    const heroSuits = [0, 0, 0, 0];
    const boardSuits = [0, 0, 0, 0];

    heroCards.forEach(c => {
        suitCounts[c.suitId]++;
        heroSuits[c.suitId]++;
    });
    boardCards.forEach(c => {
        suitCounts[c.suitId]++;
        boardSuits[c.suitId]++;
    });

    for (let s = 0; s < 4; s++) {
        if (suitCounts[s] === 4 && heroSuits[s] >= 1) {
            // Check if Hero has the Ace of this suit (Nut Flush Draw)
            const hasAce = heroCards.some(c => c.suitId === s && c.rankValue === 14);
            const suitName = ['Spades', 'Hearts', 'Diamonds', 'Clubs'][s];
            const suitSymbol = ['♠', '♥', '♦', '♣'][s];
            draws.push({
                type: 'FLUSH_DRAW',
                name: hasAce ? `Nut Flush Draw (${suitSymbol})` : `Flush Draw (${suitSymbol})`,
                suitId: s,
                outsCount: 9,
                description: `9 ${suitName} remaining in deck`
            });
        }
    }

    // --- Straight Draw Detection ---
    const currentRanks = new Set();
    heroCards.forEach(c => currentRanks.add(c.rankValue));
    boardCards.forEach(c => currentRanks.add(c.rankValue));

    // Only report straight draws if current hand doesn't already have a straight
    if (currentEval.category < 5) {
        const straightOuts = new Set();

        // Test each missing rank from 2 to 14 to see if it completes a 5-card straight
        for (let candidate = 2; candidate <= 14; candidate++) {
            if (currentRanks.has(candidate)) continue;
            const testSet = new Set(currentRanks);
            testSet.add(candidate);

            let mask = 0;
            testSet.forEach(r => {
                mask |= (1 << r);
                if (r === 14) mask |= (1 << 1);
            });

            for (let high = 5; high <= 14; high++) {
                const target = (0x1F << (high - 4));
                if ((mask & target) === target) {
                    straightOuts.add(candidate);
                    break;
                }
            }
        }

        // Check if 4 consecutive ranks are present with both ends open (OESD)
        let isOESD = false;
        for (let r = 3; r <= 10; r++) {
            if (currentRanks.has(r) && currentRanks.has(r + 1) && currentRanks.has(r + 2) && currentRanks.has(r + 3)) {
                isOESD = true;
                break;
            }
        }

        if (isOESD) {
            draws.push({
                type: 'OESD',
                name: 'Open-Ended Straight Draw',
                outsCount: 8,
                description: '8 cards to complete straight (open at both ends)'
            });
        } else if (straightOuts.size === 2) {
            draws.push({
                type: 'DOUBLE_GUTSHOT',
                name: 'Double Gutshot Draw',
                outsCount: 8,
                description: '8 cards to complete straight (two inside gaps)'
            });
        } else if (straightOuts.size === 1) {
            const rankVal = [...straightOuts][0];
            const rankName = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'][rankVal - 2];
            draws.push({
                type: 'GUTSHOT',
                name: `Gutshot Straight Draw (${rankName})`,
                outsCount: 4,
                description: `4 ${rankName}s to complete inside straight`
            });
        }
    }

    // --- Overcards Detection ---
    const maxBoardRank = Math.max(...boardCards.map(c => c.rankValue));
    const overcards = heroCards.filter(c => c.rankValue > maxBoardRank);
    if (currentEval.category <= 2 && overcards.length > 0) {
        if (overcards.length === 2) {
            draws.push({
                type: 'TWO_OVERCARDS',
                name: `Two Overcards (${overcards[0].rankSymbol}${overcards[1].rankSymbol})`,
                outsCount: 6,
                description: '6 outs to hit top pair (3 of each overcard)'
            });
        } else if (overcards.length === 1 && currentEval.category === 1) {
            draws.push({
                type: 'ONE_OVERCARD',
                name: `One Overcard (${overcards[0].rankSymbol})`,
                outsCount: 3,
                description: '3 outs to hit top pair'
            });
        }
    }

    // --- Set / Trips Mining ---
    const isPocketPair = heroCards[0].rankValue === heroCards[1].rankValue;
    if (isPocketPair && currentEval.category === 2) {
        draws.push({
            type: 'SET_MINING',
            name: `Set Outs (${heroCards[0].rankSymbol})`,
            outsCount: 2,
            description: '2 outs to hit Three of a Kind (Set)'
        });
    }

    // 2. Identify all actual outs among remaining cards
    // An out is any remaining card that improves Hero's category or score above current hand
    const winningOuts = [];
    for (let i = 0; i < remainingDeck.length; i++) {
        const cardId = remainingDeck[i];
        const nextHand = [...currentHand, cardId];
        const nextEval = evaluateHand(nextHand);

        // Card improves hand category or improves significant made score
        if (nextEval.category > currentEval.category) {
            winningOuts.push({
                cardId,
                newCategory: nextEval.category,
                newName: nextEval.name
            });
        }
    }

    const uniqueOutsCount = winningOuts.length;

    // Probabilities
    let turnProb = 0;
    let riverProb = 0;

    if (boardCardIds.length === 3) {
        // On Flop: 47 unknown cards
        // P(hit on turn) = outs / 47
        turnProb = (uniqueOutsCount / remainingDeckCount) * 100;
        // P(hit by river) = 1 - ((47 - outs)/47 * (46 - outs)/46)
        const missTurn = (remainingDeckCount - uniqueOutsCount) / remainingDeckCount;
        const missRiver = (remainingDeckCount - 1 - uniqueOutsCount) / (remainingDeckCount - 1);
        riverProb = (1 - (missTurn * missRiver)) * 100;
    } else if (boardCardIds.length === 4) {
        // On Turn: 46 unknown cards
        // P(hit on river) = outs / 46
        turnProb = 0; // Turn already dealt
        riverProb = (uniqueOutsCount / remainingDeckCount) * 100;
    }

    return {
        currentCategory: currentEval.category,
        currentHandName: currentEval.description,
        draws,
        outs: winningOuts,
        outsCount: uniqueOutsCount,
        turnProb: Math.min(100, Math.max(0, turnProb)),
        riverProb: Math.min(100, Math.max(0, riverProb))
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateOutsAndDraws };
}
