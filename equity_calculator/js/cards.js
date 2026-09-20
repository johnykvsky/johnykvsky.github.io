/**
 * Texas Hold'em Card definitions and utilities.
 * Ranks: 2-14 (2 to Ace)
 * Suits: 0: Spades (♠), 1: Hearts (♥), 2: Diamonds (♦), 3: Clubs (♣)
 * Traditional two-color deck: Spades and Clubs are Black, Hearts and Diamonds are Red.
 */

const SUITS = [
    { id: 0, name: 'Spades', symbol: '♠', color: 'black' },
    { id: 1, name: 'Hearts', symbol: '♥', color: 'red' },
    { id: 2, name: 'Diamonds', symbol: '♦', color: 'red' },
    { id: 3, name: 'Clubs', symbol: '♣', color: 'black' }
];

const RANKS = [
    { value: 14, symbol: 'A', name: 'Ace' },
    { value: 13, symbol: 'K', name: 'King' },
    { value: 12, symbol: 'Q', name: 'Queen' },
    { value: 11, symbol: 'J', name: 'Jack' },
    { value: 10, symbol: '10', name: 'Ten' },
    { value: 9, symbol: '9', name: 'Nine' },
    { value: 8, symbol: '8', name: 'Eight' },
    { value: 7, symbol: '7', name: 'Seven' },
    { value: 6, symbol: '6', name: 'Six' },
    { value: 5, symbol: '5', name: 'Five' },
    { value: 4, symbol: '4', name: 'Four' },
    { value: 3, symbol: '3', name: 'Three' },
    { value: 2, symbol: '2', name: 'Two' }
];

// Card ID: 0 to 51 -> cardId = suit * 13 + (rank - 2)
function getCard(id) {
    if (id < 0 || id > 51) return null;
    const suitId = Math.floor(id / 13);
    const rankValue = (id % 13) + 2;
    const suit = SUITS[suitId];
    const rank = RANKS.find(r => r.value === rankValue);
    return {
        id,
        suitId,
        suitSymbol: suit.symbol,
        suitName: suit.name,
        color: suit.color,
        rankValue,
        rankSymbol: rank.symbol,
        rankName: rank.name,
        shortName: `${rank.symbol}${suit.symbol}`
    };
}

function createCardFromSuitAndRank(suitId, rankValue) {
    const id = suitId * 13 + (rankValue - 2);
    return getCard(id);
}

function getAllCards() {
    const cards = [];
    for (let i = 0; i < 52; i++) {
        cards.push(getCard(i));
    }
    return cards;
}

function cardToCode(cardId) {
    const card = getCard(cardId);
    if (!card) return '';
    const suitLetter = ['s', 'h', 'd', 'c'][card.suitId];
    return `${card.rankSymbol}${suitLetter}`;
}

function parseCard(str) {
    if (!str || typeof str !== 'string') return null;
    str = str.trim();
    if (str.length < 2) return null;

    let suitChar = str.slice(-1).toUpperCase();
    let rankStr = str.slice(0, -1).toUpperCase();
    if (rankStr === 'T') rankStr = '10';

    let rankVal = -1;
    if (rankStr === 'A') rankVal = 14;
    else if (rankStr === 'K') rankVal = 13;
    else if (rankStr === 'Q') rankVal = 12;
    else if (rankStr === 'J') rankVal = 11;
    else if (rankStr === '10') rankVal = 10;
    else {
        const num = parseInt(rankStr, 10);
        if (num >= 2 && num <= 9) rankVal = num;
    }
    if (rankVal === -1) return null;

    let suitId = -1;
    if (suitChar === 'S' || suitChar === '♠') suitId = 0;
    else if (suitChar === 'H' || suitChar === '♥') suitId = 1;
    else if (suitChar === 'D' || suitChar === '♦') suitId = 2;
    else if (suitChar === 'C' || suitChar === '♣') suitId = 3;

    if (suitId === -1) return null;
    return createCardFromSuitAndRank(suitId, rankVal);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUITS, RANKS, getCard, createCardFromSuitAndRank, getAllCards, cardToCode, parseCard };
}
