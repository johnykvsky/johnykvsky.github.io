/**
 * Texas Hold'em Monte Carlo Simulation Engine.
 */

if (typeof require !== 'undefined') {
    var { evaluateHand } = require('./evaluator');
    var { secureShuffle } = require('./random');
}

/**
 * Runs Monte Carlo simulation.
 * @param {Object} params
 * @param {Array<number>} params.heroCards - 2 card IDs
 * @param {Array<Array<number>>} params.opponentCards - Array of [cardId, cardId] (can be empty or partially filled)
 * @param {number} params.numPlayers - Total number of players (2-10)
 * @param {Array<number>} params.communityCards - 0 to 5 card IDs
 * @param {boolean} params.burnCards - Whether to burn cards before Flop, Turn, River
 * @param {number} params.iterations - Number of simulations (e.g. 5000)
 * @param {Function} [onProgress] - Optional progress callback
 */
function runSimulation({
    heroCards,
    opponentCards = [],
    numPlayers = 2,
    communityCards = [],
    burnCards = true,
    iterations = 5000
}, onProgress) {
    if (!heroCards || heroCards.length < 2) {
        throw new Error('Hero must have exactly 2 cards.');
    }

    const totalOpponents = numPlayers - 1;

    // Collect all known cards to remove from deck
    const knownCardsSet = new Set();
    heroCards.forEach(c => knownCardsSet.add(c));
    communityCards.forEach(c => knownCardsSet.add(c));

    // Normalize opponent cards list
    const oppCardsClean = [];
    for (let i = 0; i < totalOpponents; i++) {
        const opp = opponentCards[i] || [];
        oppCardsClean.push(opp);
        opp.forEach(c => knownCardsSet.add(c));
    }

    // Base remaining deck
    const baseRemainingDeck = [];
    for (let c = 0; c < 52; c++) {
        if (!knownCardsSet.has(c)) {
            baseRemainingDeck.push(c);
        }
    }

    // Check if situation allows 100% exact combinatorial enumeration
    if (canExactEnumerate(communityCards, oppCardsClean, totalOpponents)) {
        return runExactEnumeration({
            heroCards,
            oppCardsClean,
            totalOpponents,
            communityCards,
            baseRemainingDeck
        });
    }

    // Stats tracking
    let heroWins = 0;
    let heroTies = 0;
    let heroLosses = 0;

    const oppWins = new Array(totalOpponents).fill(0);
    const oppTies = new Array(totalOpponents).fill(0);

    const heroHandCounts = new Array(10).fill(0); // categories 1-9

    // Working buffers to avoid memory allocations in loop
    const deckBuffer = new Array(baseRemainingDeck.length);
    const boardBuffer = new Array(5);
    const currentHero7 = new Array(7);
    const currentOpp7 = new Array(totalOpponents).map(() => new Array(7));

    // Fill initial known community cards
    for (let i = 0; i < communityCards.length; i++) {
        boardBuffer[i] = communityCards[i];
    }
    const knownBoardCount = communityCards.length;

    // Progress reporting interval
    const reportInterval = Math.max(500, Math.floor(iterations / 10));

    for (let iter = 0; iter < iterations; iter++) {
        // Copy remaining deck into buffer
        for (let i = 0; i < baseRemainingDeck.length; i++) {
            deckBuffer[i] = baseRemainingDeck[i];
        }

        // Shuffle remaining deck
        secureShuffle(deckBuffer);
        let deckIndex = 0;

        // Deal unknown opponent cards
        const iterOppHands = [];
        for (let o = 0; o < totalOpponents; o++) {
            const known = oppCardsClean[o];
            const hand = [0, 0];
            if (known.length === 2) {
                hand[0] = known[0];
                hand[1] = known[1];
            } else if (known.length === 1) {
                hand[0] = known[0];
                hand[1] = deckBuffer[deckIndex++];
            } else {
                hand[0] = deckBuffer[deckIndex++];
                hand[1] = deckBuffer[deckIndex++];
            }
            iterOppHands.push(hand);
        }

        // Deal remaining community cards with burn cards
        let currentBoardLen = knownBoardCount;

        // Pre-flop to flop
        if (currentBoardLen < 3) {
            if (burnCards) deckIndex++; // Burn 1 before flop
            while (currentBoardLen < 3) {
                boardBuffer[currentBoardLen++] = deckBuffer[deckIndex++];
            }
        }

        // Flop to turn
        if (currentBoardLen < 4) {
            if (burnCards) deckIndex++; // Burn 1 before turn
            boardBuffer[currentBoardLen++] = deckBuffer[deckIndex++];
        }

        // Turn to river
        if (currentBoardLen < 5) {
            if (burnCards) deckIndex++; // Burn 1 before river
            boardBuffer[currentBoardLen++] = deckBuffer[deckIndex++];
        }

        // Evaluate Hero hand (2 hero cards + 5 board cards)
        currentHero7[0] = heroCards[0];
        currentHero7[1] = heroCards[1];
        currentHero7[2] = boardBuffer[0];
        currentHero7[3] = boardBuffer[1];
        currentHero7[4] = boardBuffer[2];
        currentHero7[5] = boardBuffer[3];
        currentHero7[6] = boardBuffer[4];

        const heroEval = evaluateHand(currentHero7);
        heroHandCounts[heroEval.category]++;

        // Evaluate Opponents
        let maxScore = heroEval.score;
        let heroWon = true;
        let tiedCount = 1;
        const oppScores = new Array(totalOpponents);

        for (let o = 0; o < totalOpponents; o++) {
            const opp7 = [
                iterOppHands[o][0],
                iterOppHands[o][1],
                boardBuffer[0],
                boardBuffer[1],
                boardBuffer[2],
                boardBuffer[3],
                boardBuffer[4]
            ];
            const oppEval = evaluateHand(opp7);
            oppScores[o] = oppEval.score;

            if (oppEval.score > maxScore) {
                maxScore = oppEval.score;
                heroWon = false;
                tiedCount = 1;
            } else if (oppEval.score === maxScore) {
                tiedCount++;
            }
        }

        // Check if hero won or tied
        if (heroEval.score === maxScore) {
            if (tiedCount === 1) {
                heroWins++;
            } else {
                heroTies++;
            }
        } else {
            heroLosses++;
        }

        // Update opponent stats
        for (let o = 0; o < totalOpponents; o++) {
            if (oppScores[o] === maxScore) {
                if (tiedCount === 1) {
                    oppWins[o]++;
                } else {
                    oppTies[o]++;
                }
            }
        }

        if (onProgress && (iter + 1) % reportInterval === 0) {
            onProgress((iter + 1) / iterations);
        }
    }

    const heroWinPct = (heroWins / iterations) * 100;
    const heroTiePct = (heroTies / iterations) * 100;
    const heroLossPct = (heroLosses / iterations) * 100;
    const heroEquityPct = heroWinPct + (heroTiePct / 2); // Standard equity approximation

    const oppResults = [];
    for (let o = 0; o < totalOpponents; o++) {
        const wPct = (oppWins[o] / iterations) * 100;
        const tPct = (oppTies[o] / iterations) * 100;
        oppResults.push({
            winPct: wPct,
            tiePct: tPct,
            equityPct: wPct + (tPct / 2)
        });
    }

    const handDistribution = {};
    for (let cat = 1; cat <= 9; cat++) {
        handDistribution[cat] = {
            count: heroHandCounts[cat],
            pct: (heroHandCounts[cat] / iterations) * 100
        };
    }

    return {
        isExact: false,
        iterations,
        hero: {
            winPct: heroWinPct,
            tiePct: heroTiePct,
            lossPct: heroLossPct,
            equityPct: heroEquityPct,
            handDistribution
        },
        opponents: oppResults
    };
}

/**
 * Checks if exact combinatorial enumeration is possible.
 */
function canExactEnumerate(communityCards, oppCardsClean, totalOpponents) {
    const boardLen = communityCards.length;
    const allOpponentsKnown = oppCardsClean.length > 0 && oppCardsClean.every(opp => opp.length === 2);
    
    // Case 1: River with all opponents known (1 combo)
    if (boardLen === 5 && allOpponentsKnown) return true;
    
    // Case 2: River with 1 unknown opponent (990 combos)
    if (boardLen === 5 && totalOpponents === 1 && oppCardsClean[0].length === 0) return true;
    
    // Case 3: Turn with all opponents known (44 combos)
    if (boardLen === 4 && allOpponentsKnown) return true;
    
    return false;
}

/**
 * Exact combinatorial enumeration for late streets (Turn / River).
 */
function runExactEnumeration({
    heroCards,
    oppCardsClean,
    totalOpponents,
    communityCards,
    baseRemainingDeck
}) {
    const boardLen = communityCards.length;
    let heroWins = 0;
    let heroTies = 0;
    let heroLosses = 0;
    const oppWins = new Array(totalOpponents).fill(0);
    const oppTies = new Array(totalOpponents).fill(0);
    const heroHandCounts = new Array(10).fill(0);

    let totalCombinations = 0;

    if (boardLen === 5) {
        // Case 1: All opponents known (1 combo)
        if (oppCardsClean.every(o => o.length === 2)) {
            totalCombinations = 1;
            const heroEval = evaluateHand([...heroCards, ...communityCards]);
            heroHandCounts[heroEval.category]++;
            let maxScore = heroEval.score;
            let tiedCount = 1;
            const oppScores = [];

            for (let o = 0; o < totalOpponents; o++) {
                const oppEval = evaluateHand([...oppCardsClean[o], ...communityCards]);
                oppScores.push(oppEval.score);
                if (oppEval.score > maxScore) {
                    maxScore = oppEval.score;
                    tiedCount = 1;
                } else if (oppEval.score === maxScore) {
                    tiedCount++;
                }
            }

            if (heroEval.score === maxScore) {
                if (tiedCount === 1) heroWins++;
                else heroTies++;
            } else {
                heroLosses++;
            }

            for (let o = 0; o < totalOpponents; o++) {
                if (oppScores[o] === maxScore) {
                    if (tiedCount === 1) oppWins[o]++;
                    else oppTies[o]++;
                }
            }
        }
        // Case 2: 1 opponent with unknown cards (990 combos)
        else if (totalOpponents === 1 && oppCardsClean[0].length === 0) {
            const heroEval = evaluateHand([...heroCards, ...communityCards]);
            heroHandCounts[heroEval.category] = (baseRemainingDeck.length * (baseRemainingDeck.length - 1)) / 2;
            const N = baseRemainingDeck.length;
            totalCombinations = (N * (N - 1)) / 2;

            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    const oppHand = [baseRemainingDeck[i], baseRemainingDeck[j], ...communityCards];
                    const oppEval = evaluateHand(oppHand);

                    if (heroEval.score > oppEval.score) {
                        heroWins++;
                    } else if (heroEval.score === oppEval.score) {
                        heroTies++;
                        oppTies[0]++;
                    } else {
                        heroLosses++;
                        oppWins[0]++;
                    }
                }
            }
        }
    } else if (boardLen === 4 && oppCardsClean.every(o => o.length === 2)) {
        // Case 3: Turn with all opponents known (each remaining card as river)
        totalCombinations = baseRemainingDeck.length;

        for (let i = 0; i < baseRemainingDeck.length; i++) {
            const riverCard = baseRemainingDeck[i];
            const fullBoard = [...communityCards, riverCard];
            const heroEval = evaluateHand([...heroCards, ...fullBoard]);
            heroHandCounts[heroEval.category]++;

            let maxScore = heroEval.score;
            let tiedCount = 1;
            const oppScores = [];

            for (let o = 0; o < totalOpponents; o++) {
                const oppEval = evaluateHand([...oppCardsClean[o], ...fullBoard]);
                oppScores.push(oppEval.score);
                if (oppEval.score > maxScore) {
                    maxScore = oppEval.score;
                    tiedCount = 1;
                } else if (oppEval.score === maxScore) {
                    tiedCount++;
                }
            }

            if (heroEval.score === maxScore) {
                if (tiedCount === 1) heroWins++;
                else heroTies++;
            } else {
                heroLosses++;
            }

            for (let o = 0; o < totalOpponents; o++) {
                if (oppScores[o] === maxScore) {
                    if (tiedCount === 1) oppWins[o]++;
                    else oppTies[o]++;
                }
            }
        }
    }

    const heroWinPct = (heroWins / totalCombinations) * 100;
    const heroTiePct = (heroTies / totalCombinations) * 100;
    const heroLossPct = (heroLosses / totalCombinations) * 100;
    const heroEquityPct = heroWinPct + (heroTiePct / 2);

    const oppResults = [];
    for (let o = 0; o < totalOpponents; o++) {
        const wPct = (oppWins[o] / totalCombinations) * 100;
        const tPct = (oppTies[o] / totalCombinations) * 100;
        oppResults.push({
            winPct: wPct,
            tiePct: tPct,
            equityPct: wPct + (tPct / 2)
        });
    }

    const handDistribution = {};
    for (let cat = 1; cat <= 9; cat++) {
        handDistribution[cat] = {
            count: heroHandCounts[cat],
            pct: (heroHandCounts[cat] / totalCombinations) * 100
        };
    }

    return {
        isExact: true,
        iterations: totalCombinations,
        hero: {
            winPct: heroWinPct,
            tiePct: heroTiePct,
            lossPct: heroLossPct,
            equityPct: heroEquityPct,
            handDistribution
        },
        opponents: oppResults
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runSimulation, canExactEnumerate, runExactEnumeration };
}
