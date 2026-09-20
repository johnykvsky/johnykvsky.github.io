/**
 * Texas Hold'em Calculator - Main Application Logic
 */

(function () {
    // Application State
    const state = {
        numPlayers: 6,
        iterations: 5000,
        burnCards: true,
        heroCards: [null, null],
        boardCards: {
            flop: [null, null, null],
            turn: [null],
            river: [null]
        },
        opponentCards: [], // Array of [c0, c1] per opponent
        activeSlot: null,
        activeSuit: null,
        simWorker: null,
        isSimulating: false,
        cachedSimulations: {
            preFlop: null,
            preTurn: null,
            preRiver: null,
            river: null
        }
    };

    // DOM Elements
    const dom = {
        numPlayersSelect: document.getElementById('numPlayers'),
        burnCardsCheck: document.getElementById('burnCards'),
        calcBtn: document.getElementById('calcBtn'),
        shareBtn: document.getElementById('shareBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        opponentsGrid: document.getElementById('opponentsGrid'),
        simProgressBar: document.getElementById('simProgressBar'),
        simProgressFill: document.getElementById('simProgressFill'),
        calcStatusText: document.getElementById('calcStatusText'),
        trialsBadge: document.getElementById('trialsBadge'),
        toastNotification: document.getElementById('toastNotification'),
        heroHandDesc: document.getElementById('heroHandDesc'),
        heroEquityVal: document.getElementById('heroEquityVal'),
        heroWinVal: document.getElementById('heroWinVal'),
        heroTieVal: document.getElementById('heroTieVal'),
        heroLossVal: document.getElementById('heroLossVal'),
        handDistList: document.getElementById('handDistList'),
        // Outs & Draws
        outsContent: document.getElementById('outsContent'),
        outsStatusText: document.getElementById('outsStatusText'),
        // Pot Odds
        potSizeInput: document.getElementById('potSizeInput'),
        callAmountInput: document.getElementById('callAmountInput'),
        potOddsRatioVal: document.getElementById('potOddsRatioVal'),
        potReqEquityVal: document.getElementById('potReqEquityVal'),
        potHeroEquityVal: document.getElementById('potHeroEquityVal'),
        potEvVal: document.getElementById('potEvVal'),
        evBadge: document.getElementById('evBadge'),
        // Share Modal
        shareModal: document.getElementById('shareModal'),
        shareUrlInput: document.getElementById('shareUrlInput'),
        copyShareBtn: document.getElementById('copyShareBtn'),
        copyBtnText: document.getElementById('copyBtnText'),
        closeShareModalBtn: document.getElementById('closeShareModalBtn'),
        cancelShareBtn: document.getElementById('cancelShareBtn'),
        // Street timeline
        stepPreFlop: document.getElementById('stepPreFlop'),
        preFlopWinPct: document.getElementById('preFlopWinPct'),
        preFlopDelta: document.getElementById('preFlopDelta'),
        preFlopSubtext: document.getElementById('preFlopSubtext'),
        stepPreTurn: document.getElementById('stepPreTurn'),
        preTurnWinPct: document.getElementById('preTurnWinPct'),
        preTurnDelta: document.getElementById('preTurnDelta'),
        preTurnSubtext: document.getElementById('preTurnSubtext'),
        stepPreRiver: document.getElementById('stepPreRiver'),
        preRiverWinPct: document.getElementById('preRiverWinPct'),
        preRiverDelta: document.getElementById('preRiverDelta'),
        preRiverSubtext: document.getElementById('preRiverSubtext'),
        stepRiver: document.getElementById('stepRiver'),
        riverWinPct: document.getElementById('riverWinPct'),
        riverDelta: document.getElementById('riverDelta'),
        riverSubtext: document.getElementById('riverSubtext'),
        // Modal
        modal: document.getElementById('cardPickerModal'),
        modalTitle: document.getElementById('pickerModalTitle'),
        closePickerBtn: document.getElementById('closePickerBtn'),
        cancelPickerBtn: document.getElementById('cancelPickerBtn'),
        clearSlotBtn: document.getElementById('clearSlotBtn'),
        rankPickerGrid: document.getElementById('rankPickerGrid'),
        suitButtons: document.querySelectorAll('.suit-btn')
    };

    // Initialize Web Worker with fallback
    function initWorker() {
        try {
            state.simWorker = new Worker('js/worker.js');
            state.simWorker.onmessage = handleWorkerMessage;
            state.simWorker.onerror = () => {
                console.warn('Worker error; falling back to main-thread execution.');
                state.simWorker = null;
            };
        } catch (e) {
            console.warn('Web Worker creation failed (e.g. file:// protocol); falling back to main-thread calculation.');
            state.simWorker = null;
        }
    }

    function handleWorkerMessage(e) {
        const { type, progress, results, error } = e.data;
        if (type === 'PROGRESS') {
            dom.simProgressBar.classList.add('active');
            dom.simProgressFill.style.width = `${Math.round(progress * 100)}%`;
            dom.calcStatusText.textContent = `Simulating... ${Math.round(progress * 100)}%`;
        } else if (type === 'RESULT') {
            dom.simProgressBar.classList.remove('active');
            dom.simProgressFill.style.width = '0%';
            dom.calcStatusText.textContent = 'Calculated';
            state.isSimulating = false;
            applySimulationResults(results);
        } else if (type === 'ERROR') {
            dom.simProgressBar.classList.remove('active');
            dom.calcStatusText.textContent = 'Simulation error';
            state.isSimulating = false;
            console.error('Worker simulation error:', error);
        }
    }

    // Initialize Opponent Slots
    function updateOpponentsCount() {
        const targetCount = state.numPlayers - 1;
        while (state.opponentCards.length < targetCount) {
            state.opponentCards.push([null, null]);
        }
        if (state.opponentCards.length > targetCount) {
            state.opponentCards.length = targetCount;
        }
        renderOpponentsUI();
    }

    function renderOpponentsUI() {
        dom.opponentsGrid.innerHTML = '';
        const totalOpponents = state.numPlayers - 1;

        for (let i = 0; i < totalOpponents; i++) {
            const oppBox = document.createElement('div');
            oppBox.className = 'opponent-card-box';
            oppBox.id = `opp-box-${i}`;

            const oppHand = state.opponentCards[i] || [null, null];
            const hasCustomCards = oppHand[0] !== null || oppHand[1] !== null;

            oppBox.innerHTML = `
                <div class="opp-header">
                    <span class="opp-name">Opponent ${i + 1}</span>
                    <span class="opp-status">${hasCustomCards ? 'Custom Hand' : 'Random Hand'}</span>
                </div>
                <div class="opp-content">
                    <div class="player-cards">
                        <div class="card-slot" id="opp-${i}-0" data-slot="opp-${i}-0" title="Click to pick Card 1">
                            ${renderSlotPlaceholder('C1')}
                        </div>
                        <div class="card-slot" id="opp-${i}-1" data-slot="opp-${i}-1" title="Click to pick Card 2">
                            ${renderSlotPlaceholder('C2')}
                        </div>
                    </div>
                    <div class="equity-pill" style="min-width: 75px;">
                        <div class="equity-pill-label">Equity</div>
                        <div class="equity-pill-val" id="opp-${i}-equity" style="font-size: 1.05rem;">-%</div>
                    </div>
                </div>
            `;

            dom.opponentsGrid.appendChild(oppBox);

            // Re-render card slots if they contain cards
            renderSlotCard(`opp-${i}-0`, oppHand[0]);
            renderSlotCard(`opp-${i}-1`, oppHand[1]);
        }

        attachCardSlotListeners();
    }

    function renderSlotPlaceholder(label) {
        return `
            <div class="card-slot-placeholder">
                <span class="plus-icon">+</span>
                <span>${label}</span>
            </div>
        `;
    }

    // Renders a card inside a slot
    function renderSlotCard(slotId, cardId) {
        const slotEl = document.getElementById(slotId);
        if (!slotEl) return;

        if (cardId === null || cardId === undefined) {
            let label = 'Card';
            if (slotId.startsWith('hero')) label = slotId.endsWith('0') ? 'Card 1' : 'Card 2';
            else if (slotId.startsWith('flop')) label = `Flop ${parseInt(slotId.slice(-1)) + 1}`;
            else if (slotId.startsWith('turn')) label = 'Turn';
            else if (slotId.startsWith('river')) label = 'River';
            else if (slotId.startsWith('opp')) label = slotId.endsWith('0') ? 'C1' : 'C2';

            slotEl.innerHTML = renderSlotPlaceholder(label);
            slotEl.classList.remove('has-card');
            return;
        }

        const card = getCard(cardId);
        if (!card) return;

        slotEl.classList.add('has-card');
        slotEl.innerHTML = `
            <div class="card ${card.color}">
                <div class="card-corner top-left">
                    <span class="card-rank">${card.rankSymbol}</span>
                    <span class="card-suit">${card.suitSymbol}</span>
                </div>
                <div class="card-center">${card.suitSymbol}</div>
                <div class="card-corner bottom-right">
                    <span class="card-rank">${card.rankSymbol}</span>
                    <span class="card-suit">${card.suitSymbol}</span>
                </div>
            </div>
        `;
    }

    // Get all currently selected card IDs across the table
    function getSelectedCardIds(excludeSlot = null) {
        const selected = new Set();

        // Hero
        state.heroCards.forEach((c, idx) => {
            if (c !== null && excludeSlot !== `hero-${idx}`) selected.add(c);
        });

        // Board
        state.boardCards.flop.forEach((c, idx) => {
            if (c !== null && excludeSlot !== `flop-${idx}`) selected.add(c);
        });
        if (state.boardCards.turn[0] !== null && excludeSlot !== 'turn-0') {
            selected.add(state.boardCards.turn[0]);
        }
        if (state.boardCards.river[0] !== null && excludeSlot !== 'river-0') {
            selected.add(state.boardCards.river[0]);
        }

        // Opponents
        state.opponentCards.forEach((opp, oppIdx) => {
            opp.forEach((c, cIdx) => {
                if (c !== null && excludeSlot !== `opp-${oppIdx}-${cIdx}`) selected.add(c);
            });
        });

        return selected;
    }

    // Open Card Picker Modal
    function openCardPicker(slotId) {
        state.activeSlot = slotId;

        // Visual highlight
        document.querySelectorAll('.card-slot').forEach(s => s.classList.remove('active-picking'));
        const slotEl = document.getElementById(slotId);
        if (slotEl) slotEl.classList.add('active-picking');

        // Human readable title
        let slotTitle = 'Select Card';
        if (slotId.startsWith('hero')) {
            slotTitle = `Select Hero Card ${slotId.endsWith('0') ? '1' : '2'}`;
        } else if (slotId.startsWith('flop')) {
            slotTitle = `Select Flop Card ${parseInt(slotId.slice(-1)) + 1}`;
        } else if (slotId.startsWith('turn')) {
            slotTitle = 'Select Turn Card';
        } else if (slotId.startsWith('river')) {
            slotTitle = 'Select River Card';
        } else if (slotId.startsWith('opp')) {
            const parts = slotId.split('-');
            slotTitle = `Select Opponent ${parseInt(parts[1]) + 1} Card ${parseInt(parts[2]) + 1}`;
        }
        dom.modalTitle.textContent = slotTitle;

        // Do not preselect any suit when opening modal
        state.activeSuit = null;

        renderSuitButtons();
        renderRankPicker();

        dom.modal.classList.add('open');
    }

    function closeCardPicker() {
        dom.modal.classList.remove('open');
        document.querySelectorAll('.card-slot').forEach(s => s.classList.remove('active-picking'));
        state.activeSlot = null;
        state.activeSuit = null;
    }

    function renderSuitButtons() {
        dom.suitButtons.forEach(btn => {
            const suitId = parseInt(btn.dataset.suit, 10);
            if (state.activeSuit !== null && suitId === state.activeSuit) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    function renderRankPicker() {
        dom.rankPickerGrid.innerHTML = '';
        if (state.activeSuit === null) {
            dom.rankPickerGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.9rem; font-style: italic;">
                    👆 Click a suit / color above to view available cards
                </div>
            `;
            return;
        }

        const suit = SUITS[state.activeSuit];
        const usedCards = getSelectedCardIds(state.activeSlot);

        RANKS.forEach(rank => {
            const cardId = createCardFromSuitAndRank(state.activeSuit, rank.value).id;
            const isUsed = usedCards.has(cardId);

            const btn = document.createElement('button');
            btn.className = `rank-card-btn ${suit.color}`;
            btn.disabled = isUsed;
            btn.title = isUsed ? `${rank.symbol}${suit.symbol} is already dealt` : `Choose ${rank.name} of ${suit.name}`;

            btn.innerHTML = `
                <span class="rank-symbol">${rank.symbol}</span>
                <span class="rank-suit">${suit.symbol}</span>
            `;

            if (!isUsed) {
                btn.addEventListener('click', () => {
                    selectCardForActiveSlot(cardId);
                });
            }

            dom.rankPickerGrid.appendChild(btn);
        });
    }

    function getCardFromSlot(slotId) {
        if (!slotId) return null;
        if (slotId === 'hero-0') return state.heroCards[0];
        if (slotId === 'hero-1') return state.heroCards[1];
        if (slotId === 'flop-0') return state.boardCards.flop[0];
        if (slotId === 'flop-1') return state.boardCards.flop[1];
        if (slotId === 'flop-2') return state.boardCards.flop[2];
        if (slotId === 'turn-0') return state.boardCards.turn[0];
        if (slotId === 'river-0') return state.boardCards.river[0];
        if (slotId.startsWith('opp-')) {
            const parts = slotId.split('-');
            const o = parseInt(parts[1]);
            const c = parseInt(parts[2]);
            return state.opponentCards[o] ? state.opponentCards[o][c] : null;
        }
        return null;
    }

    function setCardInSlot(slotId, cardId) {
        if (!slotId) return;
        if (slotId === 'hero-0') state.heroCards[0] = cardId;
        else if (slotId === 'hero-1') state.heroCards[1] = cardId;
        else if (slotId === 'flop-0') state.boardCards.flop[0] = cardId;
        else if (slotId === 'flop-1') state.boardCards.flop[1] = cardId;
        else if (slotId === 'flop-2') state.boardCards.flop[2] = cardId;
        else if (slotId === 'turn-0') state.boardCards.turn[0] = cardId;
        else if (slotId === 'river-0') state.boardCards.river[0] = cardId;
        else if (slotId.startsWith('opp-')) {
            const parts = slotId.split('-');
            const o = parseInt(parts[1]);
            const c = parseInt(parts[2]);
            if (!state.opponentCards[o]) state.opponentCards[o] = [null, null];
            state.opponentCards[o][c] = cardId;
        }
        renderSlotCard(slotId, cardId);
    }

    function selectCardForActiveSlot(cardId) {
        if (!state.activeSlot) return;
        const currentSlot = state.activeSlot;
        setCardInSlot(currentSlot, cardId);
        closeCardPicker();

        // Run calculation
        triggerSimulation();
    }

    function clearActiveSlot() {
        if (!state.activeSlot) return;
        setCardInSlot(state.activeSlot, null);
        closeCardPicker();
        triggerSimulation();
    }

    function clearAllCards() {
        state.heroCards = [null, null];
        state.boardCards = {
            flop: [null, null, null],
            turn: [null],
            river: [null]
        };
        for (let i = 0; i < state.opponentCards.length; i++) {
            state.opponentCards[i] = [null, null];
        }

        // Re-render table slots
        ['hero-0', 'hero-1', 'flop-0', 'flop-1', 'flop-2', 'turn-0', 'river-0'].forEach(id => {
            renderSlotCard(id, null);
        });
        renderOpponentsUI();
        resetAnalyticsUI();
    }

    function resetAnalyticsUI() {
        dom.heroEquityVal.textContent = '-%';
        dom.heroWinVal.textContent = '-%';
        dom.heroTieVal.textContent = '-%';
        dom.heroLossVal.textContent = '-%';
        dom.heroHandDesc.textContent = 'Select 2 hole cards to calculate';
        dom.calcStatusText.textContent = 'Ready';

        dom.preFlopWinPct.textContent = '-%';
        dom.preFlopDelta.textContent = 'Baseline';
        dom.preFlopDelta.className = 'step-delta neutral';

        dom.preTurnWinPct.textContent = '-%';
        dom.preTurnDelta.textContent = 'Pending';
        dom.preTurnDelta.className = 'step-delta neutral';
        dom.preTurnSubtext.textContent = 'Odds with 3 community cards';

        dom.preRiverWinPct.textContent = '-%';
        dom.preRiverDelta.textContent = 'Pending';
        dom.preRiverDelta.className = 'step-delta neutral';
        dom.preRiverSubtext.textContent = 'Odds with 4 community cards';

        dom.riverWinPct.textContent = '-%';
        dom.riverDelta.textContent = 'Pending';
        dom.riverDelta.className = 'step-delta neutral';
        dom.riverSubtext.textContent = 'Final board result';

        if (dom.trialsBadge) dom.trialsBadge.textContent = '5,000 Trials';

        updateOutsAndDraws();
        updatePotOddsAdvisor(0);
        exportStateToUrl();

        dom.handDistList.innerHTML = '';
        renderEmptyHandDistribution();
    }

    function renderEmptyHandDistribution() {
        dom.handDistList.innerHTML = '';
        for (let cat = 9; cat >= 1; cat--) {
            const item = document.createElement('div');
            item.className = 'hand-dist-item';
            item.innerHTML = `
                <div class="hand-dist-name">${HAND_NAMES[cat]}</div>
                <div class="hand-dist-bar-container">
                    <div class="hand-dist-bar" id="bar-cat-${cat}" style="width: 0%;"></div>
                </div>
                <div class="hand-dist-pct" id="pct-cat-${cat}">0.0%</div>
            `;
            dom.handDistList.appendChild(item);
        }
    }

    // Attach click listeners to all card slots
    function attachCardSlotListeners() {
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.onclick = () => {
                openCardPicker(slot.dataset.slot);
            };
        });
    }

    // Trigger simulation
    function triggerSimulation() {
        // Hero must have 2 cards
        if (state.heroCards[0] === null || state.heroCards[1] === null) {
            resetAnalyticsUI();
            return;
        }

        dom.calcStatusText.textContent = 'Simulating...';
        state.isSimulating = true;

        // Build active community cards array
        const activeBoard = [];
        // Flop
        if (state.boardCards.flop[0] !== null && state.boardCards.flop[1] !== null && state.boardCards.flop[2] !== null) {
            activeBoard.push(state.boardCards.flop[0], state.boardCards.flop[1], state.boardCards.flop[2]);
            // Turn
            if (state.boardCards.turn[0] !== null) {
                activeBoard.push(state.boardCards.turn[0]);
                // River
                if (state.boardCards.river[0] !== null) {
                    activeBoard.push(state.boardCards.river[0]);
                }
            }
        }

        // Clean opponents hands
        const oppCards = state.opponentCards.map(hand => {
            const clean = [];
            if (hand[0] !== null) clean.push(hand[0]);
            if (hand[1] !== null) clean.push(hand[1]);
            return clean;
        });

        const simParams = {
            heroCards: [state.heroCards[0], state.heroCards[1]],
            opponentCards: oppCards,
            numPlayers: state.numPlayers,
            communityCards: activeBoard,
            burnCards: state.burnCards,
            iterations: state.iterations
        };

        // Also run pre-flop simulation if board has cards so we can calculate true delta changes!
        let preFlopParams = null;
        if (activeBoard.length > 0) {
            preFlopParams = {
                heroCards: [state.heroCards[0], state.heroCards[1]],
                opponentCards: oppCards,
                numPlayers: state.numPlayers,
                communityCards: [],
                burnCards: state.burnCards,
                iterations: Math.min(2500, state.iterations) // Fast accurate baseline
            };
        }

        // Also run pre-turn simulation if on turn or river
        let preTurnParams = null;
        if (activeBoard.length >= 4) {
            preTurnParams = {
                heroCards: [state.heroCards[0], state.heroCards[1]],
                opponentCards: oppCards,
                numPlayers: state.numPlayers,
                communityCards: activeBoard.slice(0, 3),
                burnCards: state.burnCards,
                iterations: Math.min(2500, state.iterations)
            };
        }

        // Also run pre-river simulation if on river
        let preRiverParams = null;
        if (activeBoard.length >= 5) {
            preRiverParams = {
                heroCards: [state.heroCards[0], state.heroCards[1]],
                opponentCards: oppCards,
                numPlayers: state.numPlayers,
                communityCards: activeBoard.slice(0, 4),
                burnCards: state.burnCards,
                iterations: Math.min(2500, state.iterations)
            };
        }

        if (state.simWorker) {
            // Post to worker
            state.simWorker.postMessage({
                id: Date.now(),
                type: 'SIMULATE',
                params: simParams
            });

            // If baseline simulations are needed for delta comparisons, run them synchronously or on background
            if (preFlopParams) {
                setTimeout(() => {
                    state.cachedSimulations.preFlop = runSimulation(preFlopParams);
                    updateStreetProgressUI();
                }, 10);
            }
            if (preTurnParams) {
                setTimeout(() => {
                    state.cachedSimulations.preTurn = runSimulation(preTurnParams);
                    updateStreetProgressUI();
                }, 20);
            }
            if (preRiverParams) {
                setTimeout(() => {
                    state.cachedSimulations.preRiver = runSimulation(preRiverParams);
                    updateStreetProgressUI();
                }, 30);
            }
        } else {
            // Main thread execution fallback
            setTimeout(() => {
                try {
                    const results = runSimulation(simParams);
                    if (preFlopParams) {
                        state.cachedSimulations.preFlop = runSimulation(preFlopParams);
                    }
                    if (preTurnParams) {
                        state.cachedSimulations.preTurn = runSimulation(preTurnParams);
                    }
                    if (preRiverParams) {
                        state.cachedSimulations.preRiver = runSimulation(preRiverParams);
                    }
                    applySimulationResults(results);
                    dom.calcStatusText.textContent = 'Calculated';
                } catch (e) {
                    console.error(e);
                    dom.calcStatusText.textContent = 'Error';
                }
            }, 20);
        }
    }

    // Apply simulation results to UI
    function applySimulationResults(results) {
        const { hero, opponents } = results;

        // Current state equity display
        dom.heroEquityVal.textContent = `${hero.equityPct.toFixed(1)}%`;
        dom.heroWinVal.textContent = `${hero.winPct.toFixed(1)}%`;
        dom.heroTieVal.textContent = `${hero.tiePct.toFixed(1)}%`;
        dom.heroLossVal.textContent = `${hero.lossPct.toFixed(1)}%`;

        // Made hand description for Hero
        updateHeroHandDescription();

        // Update opponent equity pills
        opponents.forEach((opp, i) => {
            const oppEquityEl = document.getElementById(`opp-${i}-equity`);
            if (oppEquityEl) {
                oppEquityEl.textContent = `${opp.equityPct.toFixed(1)}%`;
            }
        });

        // Hand distribution bars
        for (let cat = 1; cat <= 9; cat++) {
            const dist = hero.handDistribution[cat];
            const bar = document.getElementById(`bar-cat-${cat}`);
            const pct = document.getElementById(`pct-cat-${cat}`);
            if (bar && pct) {
                bar.style.width = `${dist.pct.toFixed(1)}%`;
                pct.textContent = `${dist.pct.toFixed(1)}%`;
            }
        }

        // Update trials badge based on exact calculation vs simulation
        if (results.isExact) {
            dom.trialsBadge.textContent = `Exact (${results.iterations.toLocaleString()} Runouts)`;
            dom.calcStatusText.textContent = 'Exact Math';
        } else {
            dom.trialsBadge.textContent = '5,000 Trials';
            dom.calcStatusText.textContent = 'Calculated';
        }

        // Update Draws & Outs
        updateOutsAndDraws();

        // Update Pot Odds Advisor
        updatePotOddsAdvisor(hero.equityPct);

        // Sync URL state
        exportStateToUrl();

        // Cache current street result
        const boardLen = getActiveBoardCount();
        if (boardLen === 0) state.cachedSimulations.preFlop = results;
        else if (boardLen === 3) state.cachedSimulations.preTurn = results;
        else if (boardLen === 4) state.cachedSimulations.preRiver = results;
        else if (boardLen === 5) state.cachedSimulations.river = results;

        updateStreetProgressUI();
    }

    function getActiveBoardCount() {
        let count = 0;
        if (state.boardCards.flop[0] !== null && state.boardCards.flop[1] !== null && state.boardCards.flop[2] !== null) {
            count += 3;
            if (state.boardCards.turn[0] !== null) {
                count += 1;
                if (state.boardCards.river[0] !== null) {
                    count += 1;
                }
            }
        }
        return count;
    }

    function updateHeroHandDescription() {
        const activeCards = [state.heroCards[0], state.heroCards[1]];
        if (state.boardCards.flop[0] !== null && state.boardCards.flop[1] !== null && state.boardCards.flop[2] !== null) {
            activeCards.push(state.boardCards.flop[0], state.boardCards.flop[1], state.boardCards.flop[2]);
            if (state.boardCards.turn[0] !== null) {
                activeCards.push(state.boardCards.turn[0]);
                if (state.boardCards.river[0] !== null) {
                    activeCards.push(state.boardCards.river[0]);
                }
            }
        }

        if (activeCards.length >= 5) {
            const currentEval = evaluateHand(activeCards);
            dom.heroHandDesc.textContent = `Current Hand: ${currentEval.description}`;
        } else {
            const c1 = getCard(state.heroCards[0]);
            const c2 = getCard(state.heroCards[1]);
            const isPair = c1.rankValue === c2.rankValue;
            const isSuited = c1.suitId === c2.suitId;
            let desc = isPair ? `Pocket ${c1.rankName}s` : `${c1.rankSymbol}-${c2.rankSymbol}`;
            if (isSuited) desc += ' Suited';
            else if (!isPair) desc += ' Offsuit';
            dom.heroHandDesc.textContent = `Hole Cards: ${desc}`;
        }
    }

    // Street progression and changes to win
    function updateStreetProgressUI() {
        const boardLen = getActiveBoardCount();

        // 1. Pre-Flop Step
        const pf = state.cachedSimulations.preFlop;
        if (pf) {
            dom.preFlopWinPct.textContent = `${pf.hero.winPct.toFixed(1)}%`;
            dom.preFlopDelta.textContent = 'Baseline';
            dom.preFlopDelta.className = 'step-delta neutral';
            dom.stepPreFlop.classList.toggle('active', boardLen === 0);
        } else {
            dom.preFlopWinPct.textContent = '-%';
        }

        // 2. Pre-Turn (Flop) Step
        const pt = state.cachedSimulations.preTurn;
        if (boardLen >= 3 && pt && pf) {
            const delta = pt.hero.winPct - pf.hero.winPct;
            dom.preTurnWinPct.textContent = `${pt.hero.winPct.toFixed(1)}%`;
            formatDelta(dom.preTurnDelta, delta);
            dom.stepPreTurn.classList.toggle('active', boardLen === 3);

            // Flop made hand subtext
            const flopEval = evaluateHand([
                state.heroCards[0],
                state.heroCards[1],
                state.boardCards.flop[0],
                state.boardCards.flop[1],
                state.boardCards.flop[2]
            ]);
            dom.preTurnSubtext.textContent = `Made: ${flopEval.description}`;
        } else {
            dom.preTurnWinPct.textContent = '-%';
            dom.preTurnDelta.textContent = 'Pending';
            dom.preTurnDelta.className = 'step-delta neutral';
            dom.preTurnSubtext.textContent = 'Odds with 3 community cards';
            dom.stepPreTurn.classList.remove('active');
        }

        // 3. Pre-River (Turn) Step
        const pr = state.cachedSimulations.preRiver;
        if (boardLen >= 4 && pr && pt) {
            const delta = pr.hero.winPct - pt.hero.winPct;
            dom.preRiverWinPct.textContent = `${pr.hero.winPct.toFixed(1)}%`;
            formatDelta(dom.preRiverDelta, delta);
            dom.stepPreRiver.classList.toggle('active', boardLen === 4);

            // Turn made hand subtext
            const turnEval = evaluateHand([
                state.heroCards[0],
                state.heroCards[1],
                state.boardCards.flop[0],
                state.boardCards.flop[1],
                state.boardCards.flop[2],
                state.boardCards.turn[0]
            ]);
            dom.preRiverSubtext.textContent = `Made: ${turnEval.description}`;
        } else {
            dom.preRiverWinPct.textContent = '-%';
            dom.preRiverDelta.textContent = 'Pending';
            dom.preRiverDelta.className = 'step-delta neutral';
            dom.preRiverSubtext.textContent = 'Odds with 4 community cards';
            dom.stepPreRiver.classList.remove('active');
        }

        // 4. River (Showdown) Step
        const rv = state.cachedSimulations.river;
        if (boardLen === 5 && rv && pr) {
            const delta = rv.hero.winPct - pr.hero.winPct;
            dom.riverWinPct.textContent = `${rv.hero.winPct.toFixed(1)}%`;
            formatDelta(dom.riverDelta, delta);
            dom.stepRiver.classList.add('active');

            const riverEval = evaluateHand([
                state.heroCards[0],
                state.heroCards[1],
                state.boardCards.flop[0],
                state.boardCards.flop[1],
                state.boardCards.flop[2],
                state.boardCards.turn[0],
                state.boardCards.river[0]
            ]);
            dom.riverSubtext.textContent = `Final: ${riverEval.description}`;
        } else {
            dom.riverWinPct.textContent = '-%';
            dom.riverDelta.textContent = 'Pending';
            dom.riverDelta.className = 'step-delta neutral';
            dom.riverSubtext.textContent = 'Final board result';
            dom.stepRiver.classList.remove('active');
        }
    }

    function formatDelta(element, delta) {
        const sign = delta > 0 ? '+' : '';
        element.textContent = `${sign}${delta.toFixed(1)}%`;
        if (Math.abs(delta) < 0.1) {
            element.className = 'step-delta neutral';
        } else if (delta > 0) {
            element.className = 'step-delta positive';
        } else {
            element.className = 'step-delta negative';
        }
    }

    // Draws & Outs UI
    function updateOutsAndDraws() {
        if (!dom.outsContent) return;
        const boardLen = getActiveBoardCount();
        if (boardLen < 3 || boardLen > 4 || state.heroCards[0] === null || state.heroCards[1] === null) {
            dom.outsContent.innerHTML = `
                <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                    ${boardLen === 5 ? 'Board complete (Showdown)' : 'Select 3 Flop cards or 4 Turn cards to calculate draws & outs'}
                </div>
            `;
            dom.outsStatusText.textContent = boardLen === 5 ? 'Showdown' : 'Flop / Turn';
            return;
        }

        const activeBoard = [];
        activeBoard.push(state.boardCards.flop[0], state.boardCards.flop[1], state.boardCards.flop[2]);
        if (boardLen === 4) activeBoard.push(state.boardCards.turn[0]);

        const knownOppCards = [];
        state.opponentCards.forEach(opp => {
            if (opp[0] !== null) knownOppCards.push(opp[0]);
            if (opp[1] !== null) knownOppCards.push(opp[1]);
        });

        const outsData = calculateOutsAndDraws(state.heroCards, activeBoard, knownOppCards);
        if (!outsData) return;

        dom.outsStatusText.textContent = boardLen === 3 ? 'Flop Dealt' : 'Turn Dealt';

        let drawsHtml = '';
        if (outsData.draws.length > 0) {
            drawsHtml = `
                <div class="draws-list">
                    ${outsData.draws.map(d => `
                        <div class="draw-badge">
                            <span>${d.name}</span>
                            <span class="outs-tag">${d.outsCount} outs</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            drawsHtml = `
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
                    No major flush or straight draw detected. Current: <strong>${outsData.currentHandName}</strong>
                </div>
            `;
        }

        dom.outsContent.innerHTML = `
            ${drawsHtml}
            <div class="outs-stat-grid">
                <div class="outs-stat-box">
                    <span class="outs-stat-label">Total Outs</span>
                    <span class="outs-stat-val">${outsData.outsCount}</span>
                </div>
                <div class="outs-stat-box">
                    <span class="outs-stat-label">${boardLen === 3 ? 'Turn Hit %' : 'River Hit %'}</span>
                    <span class="outs-stat-val">${(boardLen === 3 ? outsData.turnProb : outsData.riverProb).toFixed(1)}%</span>
                </div>
                <div class="outs-stat-box">
                    <span class="outs-stat-label">${boardLen === 3 ? 'By River %' : 'Pot Odds Need'}</span>
                    <span class="outs-stat-val">${boardLen === 3 ? outsData.riverProb.toFixed(1) + '%' : (outsData.outsCount > 0 ? (Math.round((46 - outsData.outsCount) / outsData.outsCount) + ':1') : '-')}</span>
                </div>
            </div>
        `;
    }

    // Pot Odds & Decision Advisor
    function updatePotOddsAdvisor(heroEquity) {
        if (!dom.potSizeInput || !dom.callAmountInput) return;
        const pot = parseFloat(dom.potSizeInput.value);
        const call = parseFloat(dom.callAmountInput.value);

        if (heroEquity !== undefined && heroEquity > 0) {
            dom.potHeroEquityVal.textContent = `${heroEquity.toFixed(1)}%`;
        } else {
            dom.potHeroEquityVal.textContent = dom.heroEquityVal.textContent || '-%';
        }

        if (isNaN(pot) || isNaN(call) || pot <= 0 || call <= 0) {
            dom.potOddsRatioVal.textContent = '-';
            dom.potReqEquityVal.textContent = '-%';
            dom.potEvVal.textContent = '-';
            dom.evBadge.className = 'ev-badge neutral';
            dom.evBadge.textContent = 'Enter Pot & Bet';
            return;
        }

        const totalPotAfterCall = pot + call;
        const ratio = (pot / call).toFixed(1) + ' : 1';
        const reqEquity = (call / totalPotAfterCall) * 100;
        const currentEquity = heroEquity !== undefined ? heroEquity : (parseFloat(dom.heroEquityVal.textContent) || 0);

        dom.potOddsRatioVal.textContent = ratio;
        dom.potReqEquityVal.textContent = `${reqEquity.toFixed(1)}%`;

        if (currentEquity > 0) {
            const ev = (currentEquity / 100) * totalPotAfterCall - call;
            const isPositive = currentEquity >= reqEquity;

            dom.potEvVal.textContent = `${ev >= 0 ? '+' : ''}$${ev.toFixed(2)}`;
            dom.potEvVal.style.color = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';

            if (isPositive) {
                dom.evBadge.className = 'ev-badge positive';
                dom.evBadge.textContent = '+EV Call';
            } else {
                dom.evBadge.className = 'ev-badge negative';
                dom.evBadge.textContent = '-EV Fold';
            }
        } else {
            dom.potEvVal.textContent = '-';
            dom.evBadge.className = 'ev-badge neutral';
            dom.evBadge.textContent = 'Select Cards';
        }
    }

    // URL State Serialization
    function exportStateToUrl() {
        if (state.heroCards[0] === null && state.heroCards[1] === null) {
            if (window.location.hash) {
                history.replaceState(null, '', window.location.pathname);
            }
            return;
        }

        const parts = [];
        if (state.heroCards[0] !== null && state.heroCards[1] !== null) {
            parts.push(`hero=${cardToCode(state.heroCards[0])},${cardToCode(state.heroCards[1])}`);
        }

        const board = [];
        state.boardCards.flop.forEach(c => { if (c !== null) board.push(cardToCode(c)); });
        if (state.boardCards.turn[0] !== null) board.push(cardToCode(state.boardCards.turn[0]));
        if (state.boardCards.river[0] !== null) board.push(cardToCode(state.boardCards.river[0]));
        if (board.length > 0) {
            parts.push(`board=${board.join(',')}`);
        }

        state.opponentCards.forEach((opp, i) => {
            if (opp[0] !== null || opp[1] !== null) {
                const c1 = opp[0] !== null ? cardToCode(opp[0]) : '';
                const c2 = opp[1] !== null ? cardToCode(opp[1]) : '';
                parts.push(`opp${i}=${c1},${c2}`);
            }
        });

        if (state.numPlayers !== 6) {
            parts.push(`p=${state.numPlayers}`);
        }

        if (dom.potSizeInput && dom.potSizeInput.value) {
            parts.push(`pot=${dom.potSizeInput.value}`);
        }
        if (dom.callAmountInput && dom.callAmountInput.value) {
            parts.push(`call=${dom.callAmountInput.value}`);
        }

        const hash = '#' + parts.join('&');
        history.replaceState(null, '', hash);
    }

    function importStateFromUrl() {
        const hash = window.location.hash.slice(1);
        if (!hash) return;

        const params = new URLSearchParams(hash);

        // Players count
        if (params.has('p')) {
            const p = parseInt(params.get('p'), 10);
            if (p >= 2 && p <= 10) {
                state.numPlayers = p;
                dom.numPlayersSelect.value = p;
                updateOpponentsCount();
            }
        }

        // Hero cards
        if (params.has('hero')) {
            const cards = params.get('hero').split(',');
            if (cards.length >= 2) {
                const c1 = parseCard(cards[0]);
                const c2 = parseCard(cards[1]);
                if (c1) setCardInSlot('hero-0', c1.id);
                if (c2) setCardInSlot('hero-1', c2.id);
            }
        }

        // Board cards
        if (params.has('board')) {
            const cards = params.get('board').split(',');
            if (cards[0]) { const c = parseCard(cards[0]); if (c) setCardInSlot('flop-0', c.id); }
            if (cards[1]) { const c = parseCard(cards[1]); if (c) setCardInSlot('flop-1', c.id); }
            if (cards[2]) { const c = parseCard(cards[2]); if (c) setCardInSlot('flop-2', c.id); }
            if (cards[3]) { const c = parseCard(cards[3]); if (c) setCardInSlot('turn-0', c.id); }
            if (cards[4]) { const c = parseCard(cards[4]); if (c) setCardInSlot('river-0', c.id); }
        }

        // Opponent cards
        for (let i = 0; i < state.numPlayers - 1; i++) {
            if (params.has(`opp${i}`)) {
                const cards = params.get(`opp${i}`).split(',');
                if (cards[0]) { const c = parseCard(cards[0]); if (c) setCardInSlot(`opp-${i}-0`, c.id); }
                if (cards[1]) { const c = parseCard(cards[1]); if (c) setCardInSlot(`opp-${i}-1`, c.id); }
            }
        }

        // Pot & Call inputs
        if (params.has('pot') && dom.potSizeInput) {
            dom.potSizeInput.value = params.get('pot');
        }
        if (params.has('call') && dom.callAmountInput) {
            dom.callAmountInput.value = params.get('call');
        }

        if (state.heroCards[0] !== null && state.heroCards[1] !== null) {
            triggerSimulation();
        }
    }

    function openShareModal() {
        if (!dom.shareModal || !dom.shareUrlInput) return;
        exportStateToUrl();
        dom.shareUrlInput.value = window.location.href;
        resetCopyButton();
        dom.shareModal.classList.add('open');
    }

    function closeShareModal() {
        if (!dom.shareModal) return;
        dom.shareModal.classList.remove('open');
    }

    function resetCopyButton() {
        if (!dom.copyShareBtn) return;
        dom.copyShareBtn.innerHTML = `
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span id="copyBtnText">Copy to Clipboard</span>
        `;
    }

    function copyShareLink() {
        exportStateToUrl();
        const url = dom.shareUrlInput ? dom.shareUrlInput.value : window.location.href;

        const performSuccess = () => {
            if (dom.copyShareBtn) {
                dom.copyShareBtn.innerHTML = `
                    <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copied!</span>
                `;
                setTimeout(resetCopyButton, 2500);
            }
            showToast('✅ Hand link copied to clipboard!');
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(performSuccess).catch(() => {
                if (dom.shareUrlInput) {
                    dom.shareUrlInput.select();
                    document.execCommand('copy');
                    performSuccess();
                } else {
                    prompt('Copy this link:', url);
                }
            });
        } else if (dom.shareUrlInput) {
            dom.shareUrlInput.select();
            document.execCommand('copy');
            performSuccess();
        } else {
            prompt('Copy this link:', url);
        }
    }

    function showToast(msg) {
        if (!dom.toastNotification) return;
        dom.toastNotification.textContent = msg;
        dom.toastNotification.classList.add('show');
        setTimeout(() => {
            dom.toastNotification.classList.remove('show');
        }, 2500);
    }

    // Set up event listeners
    function setupEventListeners() {
        // Players count change
        dom.numPlayersSelect.addEventListener('change', (e) => {
            state.numPlayers = parseInt(e.target.value, 10);
            updateOpponentsCount();
            triggerSimulation();
        });

        // Burn cards toggle
        dom.burnCardsCheck.addEventListener('change', (e) => {
            state.burnCards = e.target.checked;
            triggerSimulation();
        });

        // Manual Run button
        dom.calcBtn.addEventListener('click', () => {
            triggerSimulation();
        });

        // Share Hand modal triggers
        if (dom.shareBtn) {
            dom.shareBtn.addEventListener('click', openShareModal);
        }
        if (dom.copyShareBtn) {
            dom.copyShareBtn.addEventListener('click', copyShareLink);
        }
        if (dom.closeShareModalBtn) {
            dom.closeShareModalBtn.addEventListener('click', closeShareModal);
        }
        if (dom.cancelShareBtn) {
            dom.cancelShareBtn.addEventListener('click', closeShareModal);
        }
        if (dom.shareModal) {
            dom.shareModal.addEventListener('click', (e) => {
                if (e.target === dom.shareModal) {
                    closeShareModal();
                }
            });
        }

        // Pot Odds inputs
        if (dom.potSizeInput) {
            dom.potSizeInput.addEventListener('input', () => updatePotOddsAdvisor());
        }
        if (dom.callAmountInput) {
            dom.callAmountInput.addEventListener('input', () => updatePotOddsAdvisor());
        }

        // Reset Table button
        dom.clearAllBtn.addEventListener('click', () => {
            clearAllCards();
        });

        // Suit picker buttons
        dom.suitButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                state.activeSuit = parseInt(btn.dataset.suit, 10);
                renderSuitButtons();
                renderRankPicker();
            });
        });

        // Modal Close & Cancel
        dom.closePickerBtn.addEventListener('click', closeCardPicker);
        dom.cancelPickerBtn.addEventListener('click', closeCardPicker);
        dom.clearSlotBtn.addEventListener('click', clearActiveSlot);

        // Click outside modal to close
        dom.modal.addEventListener('click', (e) => {
            if (e.target === dom.modal) {
                closeCardPicker();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (dom.modal.classList.contains('open')) {
                    closeCardPicker();
                }
                if (dom.shareModal && dom.shareModal.classList.contains('open')) {
                    closeShareModal();
                }
            }
        });

        // Hash change event
        window.addEventListener('hashchange', importStateFromUrl);
    }

    // Initialize App
    function init() {
        initWorker();
        updateOpponentsCount();
        attachCardSlotListeners();
        setupEventListeners();
        renderEmptyHandDistribution();
        resetAnalyticsUI();

        // Check if URL has shared hand
        if (window.location.hash) {
            importStateFromUrl();
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
