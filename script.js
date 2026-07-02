const SUITS = [
  { id: "spades", symbol: "♠", color: "black" },
  { id: "hearts", symbol: "♥", color: "red" },
  { id: "diamonds", symbol: "♦", color: "red" },
  { id: "clubs", symbol: "♣", color: "black" },
];

const RANKS = [
  { label: "A", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
];

const MAX_REPARTITION_HAND_CARDS = 4;

const state = {
  players: [],
  deck: [],
  table: [],
  currentPlayer: 0,
  selected: new Set(),
  turnStart: null,
  returnableCardIds: new Set(),
  cardsPlayedThisTurn: 0,
  lastDrawnCardId: null,
  computerPlayedCardIds: new Set(),
  suggestedMove: null,
  draggingCardId: null,
  winner: null,
};

const els = {
  setup: document.querySelector("#setup"),
  setupForm: document.querySelector("#setupForm"),
  game: document.querySelector("#game"),
  turnTitle: document.querySelector("#turnTitle"),
  statusGrid: document.querySelector("#statusGrid"),
  melds: document.querySelector("#melds"),
  hand: document.querySelector("#hand"),
  handTitle: document.querySelector("#handTitle"),
  tableHint: document.querySelector("#tableHint"),
  message: document.querySelector("#message"),
  moveHint: document.querySelector("#moveHint"),
  drawBtn: document.querySelector("#drawBtn"),
  endTurnBtn: document.querySelector("#endTurnBtn"),
  suggestMoveBtn: document.querySelector("#suggestMoveBtn"),
  newGroupBtn: document.querySelector("#newGroupBtn"),
  takeBackBtn: document.querySelector("#takeBackBtn"),
  restoreBtn: document.querySelector("#restoreBtn"),
  winnerModal: document.querySelector("#winnerModal"),
  winnerText: document.querySelector("#winnerText"),
  playAgainBtn: document.querySelector("#playAgainBtn"),
};

function buildDeck() {
  const cards = [];
  for (let deckNumber = 1; deckNumber <= 2; deckNumber += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${deckNumber}-${suit.id}-${rank.label}`,
          deckNumber,
          suit: suit.id,
          suitSymbol: suit.symbol,
          color: suit.color,
          rank: rank.label,
          value: rank.value,
        });
      }
    }
  }
  return shuffle(cards);
}

function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function startGame() {
  state.players = [
    { id: 0, name: "You", isComputer: false, hand: [] },
    { id: 1, name: "Computer", isComputer: true, hand: [] },
  ];
  state.deck = buildDeck();
  state.table = [];
  state.currentPlayer = 0;
  state.selected.clear();
  state.returnableCardIds.clear();
  state.computerPlayedCardIds.clear();
  state.suggestedMove = null;
  state.cardsPlayedThisTurn = 0;
  state.lastDrawnCardId = null;
  state.winner = null;

  for (let cardNumber = 0; cardNumber < 3; cardNumber += 1) {
    for (const player of state.players) {
      player.hand.push(state.deck.pop());
    }
  }

  sortHands();
  captureTurnStart();
  els.setup.classList.add("hidden");
  els.game.classList.remove("hidden");
  els.winnerModal.classList.add("hidden");
  render();
  queueComputerTurn();
}

function captureTurnStart() {
  state.turnStart = {
    deck: [...state.deck],
    table: cloneGroups(state.table),
    hand: [...currentPlayer().hand],
  };
  state.returnableCardIds = new Set(currentPlayer().hand.map((card) => card.id));
  state.cardsPlayedThisTurn = 0;
  state.lastDrawnCardId = null;
  state.selected.clear();
}

function currentPlayer() {
  return state.players[state.currentPlayer];
}

function sortHands() {
  for (const player of state.players) {
    player.hand.sort(compareCards);
  }
}

function compareCards(a, b) {
  return a.value - b.value || a.suit.localeCompare(b.suit) || a.deckNumber - b.deckNumber;
}

function cloneGroups(groups) {
  return groups.map((group) => ({
    id: group.id,
    cards: [...group.cards],
  }));
}

function render() {
  const player = currentPlayer();
  els.turnTitle.textContent = player.name;
  els.handTitle.textContent = player.isComputer ? "Computer's hand" : "Your hand";
  els.tableHint.textContent = state.computerPlayedCardIds.size > 0
    ? "Cards the computer just played are highlighted."
    : "Select cards, then use a table action.";
  const validation = validateTable(state.table);
  const locked = player.isComputer || state.winner;
  if (locked) {
    state.suggestedMove = null;
  }
  els.statusGrid.innerHTML = "";

  state.players.forEach((p, index) => {
    const item = document.createElement("div");
    item.className = `status-card ${index === state.currentPlayer ? "is-active" : ""}`;
    item.innerHTML = `<span>${p.name}</span><strong>${p.hand.length}</strong>`;
    els.statusGrid.append(item);
  });

  els.melds.innerHTML = "";
  if (state.table.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-table";
    empty.textContent = "No cards on the table yet.";
    els.melds.append(empty);
  } else {
    state.table.forEach((group, groupIndex) => {
      els.melds.append(renderGroup(group, groupIndex));
    });
  }

  els.hand.innerHTML = "";
  player.hand.forEach((card) => {
    els.hand.append(renderCard(card, "hand"));
  });

  els.endTurnBtn.disabled = locked || state.cardsPlayedThisTurn === 0 || !validation.ok;
  els.drawBtn.disabled = locked || state.cardsPlayedThisTurn > 0 || state.deck.length === 0;
  els.suggestMoveBtn.disabled = locked;
  els.suggestMoveBtn.textContent = state.suggestedMove ? "Hide move" : "Show move";
  els.newGroupBtn.disabled = locked || getSelectedCards().length === 0;
  els.takeBackBtn.disabled = locked || getReturnableSelectedCards().length === 0;
  els.restoreBtn.disabled = locked || (state.cardsPlayedThisTurn === 0 && state.selected.size === 0 && sameTable(state.table, state.turnStart.table));
  renderMoveHint();

  if (player.isComputer) {
    setMessage("Computer is thinking.", "warn");
  } else if (!validation.ok) {
    setMessage(validation.reason, "bad");
  } else if (state.cardsPlayedThisTurn > 0) {
    setMessage("Valid table. You can keep manipulating, check for another move, or end your turn.", "good");
  } else {
    setMessage("Play cards, draw, or use Show move to check for a play.", "warn");
  }
}

function renderGroup(group, groupIndex) {
  const validation = validateGroup(group.cards);
  const groupEl = document.createElement("article");
  groupEl.className = `meld ${validation.ok ? "" : "is-invalid"}`;
  groupEl.dataset.groupId = group.id;
  groupEl.innerHTML = `
    <div class="meld__head">
      <span>${validation.label}</span>
    </div>
    <div class="meld__cards"></div>
    <div class="meld__actions">
      <button type="button" data-add-to-group="${group.id}">Add selected</button>
    </div>
  `;

  const cardWrap = groupEl.querySelector(".meld__cards");
  group.cards.forEach((card) => cardWrap.append(renderCard(card, "table", groupIndex)));
  return groupEl;
}

function renderCard(card, zone, groupIndex = null) {
  const button = document.createElement("button");
  const canTakeBack = zone === "table" && state.returnableCardIds.has(card.id);
  const justDrawn = zone === "hand" && state.lastDrawnCardId === card.id;
  const computerPlayed = zone === "table" && state.computerPlayedCardIds.has(card.id);
  const suggested = state.suggestedMove &&
    ((zone === "hand" && state.suggestedMove.handCardIds.has(card.id)) ||
      (zone === "table" && state.suggestedMove.tableCardIds.has(card.id)));
  button.type = "button";
  button.className = [
    "card",
    `card--${card.color}`,
    state.selected.has(card.id) ? "is-selected" : "",
    justDrawn ? "is-just-drawn" : "",
    computerPlayed ? "is-computer-played" : "",
    suggested ? "is-suggested-move" : "",
    canTakeBack ? "can-take-back" : "",
  ].filter(Boolean).join(" ");
  button.dataset.cardId = card.id;
  button.dataset.zone = zone;
  button.draggable = !currentPlayer().isComputer && !state.winner;
  if (canTakeBack) button.title = "Played this turn";
  else if (computerPlayed) button.title = "Played by the computer last turn";
  if (groupIndex !== null) button.dataset.groupIndex = String(groupIndex);
  button.innerHTML = `
    <span class="card__corner">${card.rank}<small>${card.suitSymbol}</small></span>
    <span class="card__pip">${card.suitSymbol}</span>
  `;
  return button;
}

function setMessage(text, tone = "") {
  els.message.textContent = text;
  els.message.className = `message ${tone}`;
}

function renderMoveHint() {
  if (!state.suggestedMove) {
    els.moveHint.classList.add("hidden");
    els.moveHint.innerHTML = "";
    return;
  }

  const preview = state.suggestedMove.melds.length === 0
    ? ""
    : `<div class="move-hint__groups">${state.suggestedMove.melds.map((meld) =>
      `<span>${formatCards(meld)}</span>`
    ).join("")}</div>`;
  els.moveHint.classList.remove("hidden");
  els.moveHint.innerHTML = `
    <strong>${state.suggestedMove.noMove ? "Move check" : "Suggested move"}</strong>
    <p>${state.suggestedMove.text}</p>
    ${preview}
  `;
}

function selectedFromHandCount() {
  return getSelectedCards().filter((entry) => entry.zone === "hand").length;
}

function getReturnableSelectedCards() {
  return getSelectedCards().filter((entry) => entry.zone === "table" && state.returnableCardIds.has(entry.card.id));
}

function getSelectedCards() {
  const selected = [];
  for (const id of state.selected) {
    const handCard = currentPlayer().hand.find((card) => card.id === id);
    if (handCard) {
      selected.push({ card: handCard, zone: "hand" });
      continue;
    }
    for (let groupIndex = 0; groupIndex < state.table.length; groupIndex += 1) {
      const card = state.table[groupIndex].cards.find((candidate) => candidate.id === id);
      if (card) {
        selected.push({ card, zone: "table", groupIndex });
        break;
      }
    }
  }
  return selected;
}

function moveSelectedToGroup(groupId) {
  const selected = getSelectedCards();
  if (selected.length === 0) return;
  const targetGroup = state.table.find((group) => group.id === groupId);
  if (!targetGroup) return;

  clearSuggestedMove();
  clearComputerPlayHighlight();
  const playedFromHand = selectedFromHandCount();
  removeSelectedFromOrigins(selected);
  targetGroup.cards = orderGroupCards([...targetGroup.cards, ...selected.map((entry) => entry.card)]);
  state.cardsPlayedThisTurn += playedFromHand;
  state.selected.clear();
  removeEmptyGroups();
  sortHands();
  render();
}

function moveSingleCardToGroup(cardId, groupId) {
  const entry = findCardEntry(cardId);
  const targetGroup = state.table.find((group) => group.id === groupId);
  if (!entry || !targetGroup) return;
  if (entry.zone === "table" && state.table[entry.groupIndex]?.id === groupId) return;

  clearSuggestedMove();
  clearComputerPlayHighlight();
  const playedFromHand = entry.zone === "hand" ? 1 : 0;
  removeCardsFromOrigins([entry.card]);
  targetGroup.cards = orderGroupCards([...targetGroup.cards, entry.card]);
  state.cardsPlayedThisTurn += playedFromHand;
  state.selected.delete(cardId);
  state.draggingCardId = null;
  removeEmptyGroups();
  sortHands();
  render();
}

function createGroupFromSelected() {
  const selected = getSelectedCards();
  if (selected.length === 0) return;
  clearSuggestedMove();
  clearComputerPlayHighlight();
  const playedFromHand = selectedFromHandCount();
  removeSelectedFromOrigins(selected);
  state.table.push({
    id: crypto.randomUUID(),
    cards: orderGroupCards(selected.map((entry) => entry.card)),
  });
  state.cardsPlayedThisTurn += playedFromHand;
  state.selected.clear();
  removeEmptyGroups();
  sortHands();
  render();
}

function takeBackSelectedCards() {
  const selected = getReturnableSelectedCards();
  if (selected.length === 0) {
    setMessage("Select a card you played this turn to take it back.", "bad");
    return;
  }

  removeSelectedFromOrigins(selected);
  clearSuggestedMove();
  clearComputerPlayHighlight();
  currentPlayer().hand.push(...selected.map((entry) => entry.card));
  state.cardsPlayedThisTurn = Math.max(0, state.cardsPlayedThisTurn - selected.length);
  state.selected.clear();
  removeEmptyGroups();
  sortHands();
  render();
}

function removeSelectedFromOrigins(selected) {
  removeCardsFromOrigins(selected.map((entry) => entry.card));
}

function removeCardsFromOrigins(cards) {
  const ids = new Set(cards.map((card) => card.id));
  currentPlayer().hand = currentPlayer().hand.filter((card) => !ids.has(card.id));
  for (const group of state.table) {
    group.cards = group.cards.filter((card) => !ids.has(card.id));
  }
}

function findCardEntry(cardId) {
  const handCard = currentPlayer().hand.find((card) => card.id === cardId);
  if (handCard) return { card: handCard, zone: "hand" };

  for (let groupIndex = 0; groupIndex < state.table.length; groupIndex += 1) {
    const card = state.table[groupIndex].cards.find((candidate) => candidate.id === cardId);
    if (card) return { card, zone: "table", groupIndex };
  }
  return null;
}

function removeEmptyGroups() {
  state.table = state.table.filter((group) => group.cards.length > 0);
}

function restoreTurn() {
  clearSuggestedMove();
  clearComputerPlayHighlight();
  state.deck = [...state.turnStart.deck];
  currentPlayer().hand = [...state.turnStart.hand];
  state.table = cloneGroups(state.turnStart.table);
  state.returnableCardIds = new Set(currentPlayer().hand.map((card) => card.id));
  state.selected.clear();
  state.cardsPlayedThisTurn = 0;
  state.lastDrawnCardId = null;
  sortHands();
  render();
}

function drawCard() {
  const player = currentPlayer();
  if (state.cardsPlayedThisTurn > 0) return;
  if (hasAnyPlayableMove(player.hand, state.table)) {
    render();
    setMessage("You can make a play, so drawing is not allowed.", "bad");
    return;
  }
  if (state.deck.length === 0) {
    setMessage("The deck is empty.", "bad");
    return;
  }
  clearSuggestedMove();
  clearComputerPlayHighlight();
  const drawnCard = state.deck.pop();
  player.hand.push(drawnCard);
  state.returnableCardIds.add(drawnCard.id);
  state.lastDrawnCardId = drawnCard.id;
  sortHands();
  render();
}

function endTurn() {
  const validation = validateTable(state.table);
  if (state.cardsPlayedThisTurn === 0 || !validation.ok) return;
  if (currentPlayer().hand.length === 0) {
    state.winner = currentPlayer();
    els.winnerText.textContent = winnerMessage(currentPlayer());
    els.winnerModal.classList.remove("hidden");
    render();
    return;
  }
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  captureTurnStart();
  if (currentPlayer().isComputer) {
    freezeVisibleControls();
    setMessage("Computer is thinking.", "warn");
    queueComputerTurn();
    return;
  }
  render();
  queueComputerTurn();
}

function freezeVisibleControls() {
  els.suggestMoveBtn.disabled = true;
  els.drawBtn.disabled = true;
  els.endTurnBtn.disabled = true;
  els.newGroupBtn.disabled = true;
  els.takeBackBtn.disabled = true;
  els.restoreBtn.disabled = true;
}

function clearComputerPlayHighlight() {
  state.computerPlayedCardIds.clear();
}

function clearSuggestedMove() {
  state.suggestedMove = null;
}

function winnerMessage(player) {
  return player.isComputer ? `${player.name} wins` : "You win";
}

function validateTable(groups) {
  for (const group of groups) {
    const validation = validateGroup(group.cards);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }
  }
  return { ok: true };
}

function validateGroup(cards) {
  if (cards.length < 3) {
    return { ok: false, label: `${cards.length} cards`, reason: "Every group on the table must have at least 3 cards." };
  }
  if (isKind(cards)) return { ok: true, label: `${cards.length} of a kind` };
  if (isRun(cards)) return { ok: true, label: "Run" };
  return { ok: false, label: "Invalid", reason: "Each table group must be a same-rank set or a suited looping run." };
}

function isKind(cards) {
  if (cards.length < 3 || cards.length > 4) return false;
  return cards.every((card) => card.value === cards[0].value);
}

function isRun(cards) {
  if (cards.length < 3) return false;
  if (!cards.every((card) => card.suit === cards[0].suit)) return false;
  const values = cards.map((card) => card.value);
  const seen = new Set(values);
  if (seen.size !== values.length || values.length > 13) return false;

  for (let start = 0; start < values.length; start += 1) {
    let valid = true;
    for (let offset = 1; offset < values.length; offset += 1) {
      const expected = values[(start + offset - 1) % values.length] % 13 + 1;
      if (values[(start + offset) % values.length] !== expected) {
        valid = false;
        break;
      }
    }
    if (valid) return true;
  }
  return false;
}

function hasAnyPlayableMove(hand, table) {
  if (hand.length === 0) return false;
  if (canMakeNewMeld(hand)) return true;
  if (hand.some((card) => canJoinExistingGroup(card, table) || canSplitRunWithCard(card, table))) {
    return true;
  }
  return canSplitKindWithHand(hand, table) || canRepartitionTableWithHand(hand, table);
}

function findSuggestedMove(hand, table) {
  return findNewMeldSuggestion(hand) ||
    findJoinSuggestion(hand, table) ||
    findSplitRunSuggestion(hand, table) ||
    findSplitKindSuggestion(hand, table) ||
    findRepartitionSuggestion(hand, table);
}

function findNewMeldSuggestion(hand) {
  const meld = getBestHandMeld(hand);
  if (!meld) return null;
  return buildMoveSuggestion({
    text: `Make a new group with ${formatCards(meld)}.`,
    handCards: meld,
    tableCards: [],
    melds: [meld],
  });
}

function findJoinSuggestion(hand, table) {
  for (const card of hand) {
    for (const group of table) {
      if (isKind(group.cards) && group.cards.length === 3 && group.cards[0].value === card.value) {
        const meld = orderGroupCards([...group.cards, card]);
        return buildMoveSuggestion({
          text: `Play ${formatCard(card)} onto the ${group.cards[0].rank}s.`,
          handCards: [card],
          tableCards: group.cards,
          melds: [meld],
        });
      }
      if (isRun(group.cards) && group.cards[0].suit === card.suit && isRun([...group.cards, card])) {
        const meld = orderGroupCards([...group.cards, card]);
        return buildMoveSuggestion({
          text: `Play ${formatCard(card)} onto the run ${formatCards(group.cards)}.`,
          handCards: [card],
          tableCards: group.cards,
          melds: [meld],
        });
      }
    }
  }
  return null;
}

function findSplitRunSuggestion(hand, table) {
  for (const card of hand) {
    for (const group of table) {
      if (!isRun(group.cards) || group.cards[0].suit !== card.suit) continue;
      if (!group.cards.some((tableCard) => tableCard.value === card.value)) continue;
      const partition = partitionIntoValidGroups([...group.cards, card], 2);
      if (!partition) continue;
      return buildMoveSuggestion({
        text: `Play ${formatCard(card)} and split ${formatCards(group.cards)} into two valid runs.`,
        handCards: [card],
        tableCards: group.cards,
        melds: partition,
      });
    }
  }
  return null;
}

function findSplitKindSuggestion(hand, table) {
  for (const group of table) {
    if (!isKind(group.cards) || group.cards.length !== 4) continue;
    const matchingCards = hand.filter((card) => card.value === group.cards[0].value).slice(0, 2);
    if (matchingCards.length < 2) continue;
    const melds = [
      orderGroupCards([group.cards[0], group.cards[1], matchingCards[0]]),
      orderGroupCards([group.cards[2], group.cards[3], matchingCards[1]]),
    ];
    return buildMoveSuggestion({
      text: `Play ${formatCards(matchingCards)} to split the four ${group.cards[0].rank}s into two groups.`,
      handCards: matchingCards,
      tableCards: group.cards,
      melds,
    });
  }
  return null;
}

function findRepartitionSuggestion(hand, table) {
  const play = findRepartitionTablePlay(hand, table);
  if (!play) return null;
  return buildMoveSuggestion({
    text: `Play ${formatCards(play.handCards)} and rearrange the highlighted table cards into these valid groups.`,
    handCards: play.handCards,
    tableCards: table.flatMap((group) => group.cards),
    melds: play.melds,
  });
}

function buildMoveSuggestion({ text, handCards, tableCards, melds }) {
  return {
    text,
    handCardIds: new Set(handCards.map((card) => card.id)),
    tableCardIds: new Set(tableCards.map((card) => card.id)),
    melds: melds.map(orderGroupCards),
  };
}

function getBestHandMeld(hand) {
  const candidates = [
    ...getCandidateKinds(hand),
    ...getCandidateRuns(hand),
  ].filter((cards) => cards.some((card) => hand.includes(card)));
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ? orderGroupCards(candidates[0]) : null;
}

function canMakeNewMeld(hand) {
  for (const card of hand) {
    if (hand.filter((candidate) => candidate.value === card.value).length >= 3) return true;
  }

  for (const suit of SUITS) {
    const suitCards = hand.filter((card) => card.suit === suit.id);
    if (suitCards.length < 3) continue;
    const values = [...new Set(suitCards.map((card) => card.value))];
    for (const value of values) {
      if (values.includes(nextValue(value)) && values.includes(nextValue(nextValue(value)))) {
        return true;
      }
    }
  }
  return false;
}

function canJoinExistingGroup(card, table) {
  return table.some((group) => {
    if (isKind(group.cards)) {
      return group.cards.length === 3 && group.cards[0].value === card.value;
    }
    if (!isRun(group.cards) || group.cards[0].suit !== card.suit) return false;
    return isRun([...group.cards, card]);
  });
}

function canSplitRunWithCard(card, table) {
  return table.some((group) => {
    const cards = group.cards;
    if (!isRun(cards) || cards[0].suit !== card.suit) return false;
    if (!cards.some((tableCard) => tableCard.value === card.value)) return false;
    const withCard = [...cards, card];
    return canPartitionIntoValidGroups(withCard, 2);
  });
}

function canSplitKindWithHand(hand, table) {
  return table.some((group) => {
    if (!isKind(group.cards) || group.cards.length !== 4) return false;
    const matchingHandCards = hand.filter((card) => card.value === group.cards[0].value);
    return matchingHandCards.length >= 2;
  });
}

function canRepartitionTableWithHand(hand, table) {
  return Boolean(findRepartitionTablePlay(hand, table));
}

function findRepartitionTablePlay(hand, table) {
  const tableCards = table.flatMap((group) => group.cards);
  if (tableCards.length === 0) return null;

  for (let handCount = 1; handCount <= Math.min(MAX_REPARTITION_HAND_CARDS, hand.length); handCount += 1) {
    for (const handCards of combinations(hand, handCount)) {
      const melds = findMeldCover([...tableCards, ...handCards]);
      if (melds) {
        return { handCards, melds };
      }
    }
  }
  return null;
}

function findMeldCover(cards) {
  const ids = new Set(cards.map((card) => card.id));
  const candidateMelds = getCandidateMelds(cards)
    .filter((meld) => meld.every((card) => ids.has(card.id)));
  const candidatesByCardId = new Map([...ids].map((id) => [id, []]));

  candidateMelds.forEach((meld) => {
    for (const card of meld) {
      candidatesByCardId.get(card.id).push(meld);
    }
  });

  return searchMeldCover(ids, candidatesByCardId, new Map());
}

function searchMeldCover(uncoveredIds, candidatesByCardId, memo) {
  if (uncoveredIds.size === 0) return [];

  const key = [...uncoveredIds].sort().join("|");
  if (memo.has(key)) return memo.get(key);

  let targetId = null;
  let targetCandidates = null;
  for (const id of uncoveredIds) {
    const candidates = candidatesByCardId.get(id)
      .filter((meld) => meld.every((card) => uncoveredIds.has(card.id)));
    if (targetCandidates === null || candidates.length < targetCandidates.length) {
      targetId = id;
      targetCandidates = candidates;
    }
    if (targetCandidates.length === 0) break;
  }

  if (!targetId || targetCandidates.length === 0) {
    memo.set(key, null);
    return null;
  }

  targetCandidates.sort((a, b) => b.length - a.length);
  for (const meld of targetCandidates) {
    const nextUncoveredIds = new Set(uncoveredIds);
    for (const card of meld) {
      nextUncoveredIds.delete(card.id);
    }
    const cover = searchMeldCover(nextUncoveredIds, candidatesByCardId, memo);
    if (cover) {
      const solution = [meld, ...cover];
      memo.set(key, solution);
      return solution;
    }
  }

  memo.set(key, null);
  return null;
}

function getCandidateMelds(cards) {
  const meldsByKey = new Map();
  for (const meld of [...getCandidateKinds(cards), ...getCandidateRuns(cards)]) {
    const key = meld.map((card) => card.id).sort().join("|");
    meldsByKey.set(key, orderGroupCards(meld));
  }
  return [...meldsByKey.values()];
}

function getCandidateKinds(cards) {
  const byValue = new Map();
  for (const card of cards) {
    if (!byValue.has(card.value)) byValue.set(card.value, []);
    byValue.get(card.value).push(card);
  }

  const melds = [];
  for (const sameValueCards of byValue.values()) {
    for (let size = 3; size <= Math.min(4, sameValueCards.length); size += 1) {
      melds.push(...combinations(sameValueCards, size));
    }
  }
  return melds;
}

function getCandidateRuns(cards) {
  const melds = [];
  for (const suit of SUITS) {
    const cardsByValue = new Map();
    for (const card of cards.filter((candidate) => candidate.suit === suit.id)) {
      if (!cardsByValue.has(card.value)) cardsByValue.set(card.value, []);
      cardsByValue.get(card.value).push(card);
    }

    for (let startValue = 1; startValue <= 13; startValue += 1) {
      const values = [];
      let value = startValue;
      while (cardsByValue.has(value) && !values.includes(value)) {
        values.push(value);
        value = nextValue(value);
      }
      for (let length = 3; length <= values.length; length += 1) {
        melds.push(...pickOneCardPerValue(values.slice(0, length), cardsByValue));
      }
    }
  }
  return melds;
}

function pickOneCardPerValue(values, cardsByValue, index = 0, current = [], melds = []) {
  if (index === values.length) {
    melds.push([...current]);
    return melds;
  }

  for (const card of cardsByValue.get(values[index])) {
    current.push(card);
    pickOneCardPerValue(values, cardsByValue, index + 1, current, melds);
    current.pop();
  }
  return melds;
}

function combinations(items, size, start = 0, current = [], results = []) {
  if (current.length === size) {
    results.push([...current]);
    return results;
  }
  for (let index = start; index <= items.length - (size - current.length); index += 1) {
    current.push(items[index]);
    combinations(items, size, index + 1, current, results);
    current.pop();
  }
  return results;
}

function canPartitionIntoValidGroups(cards, groupCount) {
  if (groupCount !== 2) return false;
  return Boolean(partitionIntoValidGroups(cards, groupCount));
}

function partitionIntoValidGroups(cards, groupCount) {
  if (groupCount !== 2) return null;
  const maxMask = 1 << cards.length;
  for (let mask = 1; mask < maxMask - 1; mask += 1) {
    const first = [];
    const second = [];
    cards.forEach((card, index) => {
      if (mask & (1 << index)) first.push(card);
      else second.push(card);
    });
    if (first.length >= 3 && second.length >= 3 && validateGroup(first).ok && validateGroup(second).ok) {
      return [orderGroupCards(first), orderGroupCards(second)];
    }
  }
  return null;
}

function nextValue(value) {
  return value === 13 ? 1 : value + 1;
}

function queueComputerTurn() {
  if (!currentPlayer().isComputer || state.winner) return;
  window.setTimeout(playComputerTurn, 650);
}

function playComputerTurn() {
  if (!currentPlayer().isComputer || state.winner) return;
  const player = currentPlayer();
  let drawn = 0;

  clearComputerPlayHighlight();
  while (!hasAnyPlayableMove(player.hand, state.table) && state.deck.length > 0) {
    const drawnCard = state.deck.pop();
    player.hand.push(drawnCard);
    state.returnableCardIds.add(drawnCard.id);
    state.lastDrawnCardId = drawnCard.id;
    drawn += 1;
  }

  sortHands();

  let moves = 0;
  while (playBestComputerMove()) {
    moves += 1;
  }

  const validation = validateTable(state.table);
  if (state.cardsPlayedThisTurn > 0 && validation.ok) {
    window.setTimeout(endTurn, Math.max(450, 850 - moves * 80));
  } else {
    setMessage("Computer has no legal play.", "warn");
  }
}

function playBestComputerMove() {
  const candidates = [
    ...getComputerJoinCandidates(),
    ...getComputerSplitRunCandidates(),
    ...getComputerSplitKindCandidates(),
    ...getComputerRepartitionCandidates(),
    ...getComputerNewMeldCandidates(),
  ];
  candidates.sort(compareComputerMoves);
  const best = candidates[0];
  if (!best) return false;
  best.play();
  for (const card of best.handCards) {
    state.computerPlayedCardIds.add(card.id);
  }
  state.cardsPlayedThisTurn += best.handCards.length;
  state.selected.clear();
  removeEmptyGroups();
  sortHands();
  return true;
}

function compareComputerMoves(a, b) {
  return b.handCards.length - a.handCards.length ||
    b.score - a.score ||
    a.label.localeCompare(b.label);
}

function getComputerJoinCandidates() {
  const player = currentPlayer();
  const candidates = [];
  for (const card of player.hand) {
    state.table.forEach((group) => {
      if (isKind(group.cards) && group.cards.length === 3 && group.cards[0].value === card.value) {
        candidates.push({
          label: "join-kind",
          score: 18,
          handCards: [card],
          play: () => {
            removeCardsFromHand([card]);
            group.cards.push(card);
          },
        });
      } else if (isRun(group.cards) && group.cards[0].suit === card.suit && isRun([...group.cards, card])) {
        candidates.push({
          label: "join-run",
          score: 16,
          handCards: [card],
          play: () => {
            removeCardsFromHand([card]);
            group.cards = orderGroupCards([...group.cards, card]);
          },
        });
      }
    });
  }
  return candidates;
}

function getComputerSplitRunCandidates() {
  const player = currentPlayer();
  const candidates = [];
  for (const card of player.hand) {
    state.table.forEach((group, groupIndex) => {
      if (!isRun(group.cards) || group.cards[0].suit !== card.suit) return;
      if (!group.cards.some((tableCard) => tableCard.value === card.value)) return;
      const partition = partitionIntoValidGroups([...group.cards, card], 2);
      if (!partition) return;
      candidates.push({
        label: "split-run",
        score: 22,
        handCards: [card],
        play: () => {
          removeCardsFromHand([card]);
          state.table.splice(
            groupIndex,
            1,
            { id: group.id, cards: partition[0] },
            { id: crypto.randomUUID(), cards: partition[1] },
          );
        },
      });
    });
  }
  return candidates;
}

function getComputerSplitKindCandidates() {
  const player = currentPlayer();
  const candidates = [];
  state.table.forEach((group, groupIndex) => {
    if (!isKind(group.cards) || group.cards.length !== 4) return;
    const matchingCards = player.hand.filter((card) => card.value === group.cards[0].value).slice(0, 2);
    if (matchingCards.length < 2) return;
    const firstGroup = orderGroupCards([group.cards[0], group.cards[1], matchingCards[0]]);
    const secondGroup = orderGroupCards([group.cards[2], group.cards[3], matchingCards[1]]);
    candidates.push({
      label: "split-kind",
      score: 32,
      handCards: matchingCards,
      play: () => {
        removeCardsFromHand(matchingCards);
        state.table.splice(
          groupIndex,
          1,
          { id: group.id, cards: firstGroup },
          { id: crypto.randomUUID(), cards: secondGroup },
        );
      },
    });
  });
  return candidates;
}

function getComputerRepartitionCandidates() {
  const play = findRepartitionTablePlay(currentPlayer().hand, state.table);
  if (!play) return [];
  return [{
    label: "repartition-table",
    score: 38 + play.handCards.length,
    handCards: play.handCards,
    play: () => {
      removeCardsFromHand(play.handCards);
      state.table = play.melds.map((cards) => ({
        id: crypto.randomUUID(),
        cards: orderGroupCards(cards),
      }));
    },
  }];
}

function getComputerNewMeldCandidates() {
  return [
    ...getComputerKindCandidates(),
    ...getComputerRunCandidates(),
  ].map((cards) => ({
    label: "new-meld",
    score: cards.length * 10,
    handCards: cards,
    play: () => {
      removeCardsFromHand(cards);
      state.table.push({ id: crypto.randomUUID(), cards: orderGroupCards(cards) });
    },
  }));
}

function getComputerKindCandidates() {
  const byValue = new Map();
  for (const card of currentPlayer().hand) {
    if (!byValue.has(card.value)) byValue.set(card.value, []);
    byValue.get(card.value).push(card);
  }
  return [...byValue.values()]
    .filter((cards) => cards.length >= 3)
    .map((cards) => cards.slice(0, Math.min(4, cards.length)));
}

function getComputerRunCandidates() {
  const candidates = [];
  for (const suit of SUITS) {
    const suitCards = currentPlayer().hand.filter((card) => card.suit === suit.id);
    const cardsByValue = new Map();
    for (const card of suitCards) {
      if (!cardsByValue.has(card.value)) cardsByValue.set(card.value, card);
    }
    for (const startValue of cardsByValue.keys()) {
      const run = [];
      let value = startValue;
      while (cardsByValue.has(value) && !run.some((card) => card.value === value)) {
        run.push(cardsByValue.get(value));
        value = nextValue(value);
      }
      if (run.length >= 3) candidates.push([...run]);
    }
  }
  return candidates;
}

function removeCardsFromHand(cards) {
  const ids = new Set(cards.map((card) => card.id));
  currentPlayer().hand = currentPlayer().hand.filter((card) => !ids.has(card.id));
}

function formatCard(card) {
  return `${card.rank}${card.suitSymbol}`;
}

function formatCards(cards) {
  return orderGroupCards(cards).map(formatCard).join(" ");
}

function orderGroupCards(cards) {
  const runOrder = bestRunOrder(cards);
  return runOrder || [...cards].sort(compareCards);
}

function bestRunOrder(cards) {
  if (cards.length < 2) return [...cards];
  if (!cards.every((card) => card.suit === cards[0].suit)) return null;
  for (const start of cards) {
    const ordered = [start];
    const remaining = cards.filter((card) => card.id !== start.id);
    while (remaining.length > 0) {
      const nextIndex = remaining.findIndex((card) => card.value === nextValue(ordered.at(-1).value));
      if (nextIndex === -1) break;
      ordered.push(remaining.splice(nextIndex, 1)[0]);
    }
    if (remaining.length === 0) return ordered;
  }
  return null;
}

function sameTable(a, b) {
  return JSON.stringify(a.map((group) => group.cards.map((card) => card.id))) ===
    JSON.stringify(b.map((group) => group.cards.map((card) => card.id)));
}

els.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startGame();
});

els.hand.addEventListener("click", (event) => {
  if (currentPlayer().isComputer) return;
  const cardEl = event.target.closest("[data-card-id]");
  if (!cardEl) return;
  toggleSelected(cardEl.dataset.cardId);
});

els.melds.addEventListener("click", (event) => {
  if (currentPlayer().isComputer) return;
  const addButton = event.target.closest("[data-add-to-group]");
  const cardEl = event.target.closest("[data-card-id]");

  if (addButton) {
    moveSelectedToGroup(addButton.dataset.addToGroup);
  } else if (cardEl) {
    toggleSelected(cardEl.dataset.cardId);
  }
});

els.game.addEventListener("dragstart", (event) => {
  if (currentPlayer().isComputer || state.winner) return;
  const cardEl = event.target.closest("[data-card-id]");
  if (!cardEl) return;
  state.draggingCardId = cardEl.dataset.cardId;
  cardEl.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", cardEl.dataset.cardId);
});

els.game.addEventListener("dragend", (event) => {
  const cardEl = event.target.closest("[data-card-id]");
  if (cardEl) cardEl.classList.remove("is-dragging");
  state.draggingCardId = null;
  document.querySelectorAll(".meld.is-drop-target").forEach((groupEl) => {
    groupEl.classList.remove("is-drop-target");
  });
});

els.melds.addEventListener("dragover", (event) => {
  if (!state.draggingCardId || currentPlayer().isComputer) return;
  const groupEl = event.target.closest("[data-group-id]");
  if (!groupEl) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  groupEl.classList.add("is-drop-target");
});

els.melds.addEventListener("dragleave", (event) => {
  const groupEl = event.target.closest("[data-group-id]");
  if (!groupEl || groupEl.contains(event.relatedTarget)) return;
  groupEl.classList.remove("is-drop-target");
});

els.melds.addEventListener("drop", (event) => {
  if (!state.draggingCardId || currentPlayer().isComputer) return;
  const groupEl = event.target.closest("[data-group-id]");
  if (!groupEl) return;
  event.preventDefault();
  groupEl.classList.remove("is-drop-target");
  const cardId = event.dataTransfer.getData("text/plain") || state.draggingCardId;
  moveSingleCardToGroup(cardId, groupEl.dataset.groupId);
});

function toggleSelected(cardId) {
  if (state.selected.has(cardId)) state.selected.delete(cardId);
  else state.selected.add(cardId);
  render();
}

function toggleSuggestedMove() {
  if (state.suggestedMove) {
    state.suggestedMove = null;
    render();
    return;
  }

  const suggestion = findSuggestedMove(currentPlayer().hand, state.table);
  if (!suggestion) {
    state.suggestedMove = buildNoMoveSuggestion();
    render();
    return;
  }
  state.suggestedMove = suggestion;
  render();
}

function buildNoMoveSuggestion() {
  return {
    text: "No move available.",
    handCardIds: new Set(),
    tableCardIds: new Set(),
    melds: [],
    noMove: true,
  };
}

els.newGroupBtn.addEventListener("click", createGroupFromSelected);
els.takeBackBtn.addEventListener("click", takeBackSelectedCards);
els.restoreBtn.addEventListener("click", restoreTurn);
els.drawBtn.addEventListener("click", drawCard);
els.endTurnBtn.addEventListener("click", endTurn);
els.suggestMoveBtn.addEventListener("click", toggleSuggestedMove);
els.playAgainBtn.addEventListener("click", () => {
  els.winnerModal.classList.add("hidden");
  els.setup.classList.remove("hidden");
  els.game.classList.add("hidden");
});
