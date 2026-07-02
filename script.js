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

const state = {
  players: [],
  deck: [],
  table: [],
  currentPlayer: 0,
  selected: new Set(),
  turnStart: null,
  returnableCardIds: new Set(),
  cardsPlayedThisTurn: 0,
  winner: null,
};

const els = {
  setup: document.querySelector("#setup"),
  setupForm: document.querySelector("#setupForm"),
  playerCount: document.querySelector("#playerCount"),
  game: document.querySelector("#game"),
  turnTitle: document.querySelector("#turnTitle"),
  statusGrid: document.querySelector("#statusGrid"),
  melds: document.querySelector("#melds"),
  hand: document.querySelector("#hand"),
  handTitle: document.querySelector("#handTitle"),
  tableHint: document.querySelector("#tableHint"),
  message: document.querySelector("#message"),
  drawBtn: document.querySelector("#drawBtn"),
  endTurnBtn: document.querySelector("#endTurnBtn"),
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

function startGame(playerCount) {
  state.players = Array.from({ length: playerCount }, (_, index) => ({
    id: index,
    name: `Player ${index + 1}`,
    hand: [],
  }));
  state.deck = buildDeck();
  state.table = [];
  state.currentPlayer = 0;
  state.selected.clear();
  state.returnableCardIds.clear();
  state.cardsPlayedThisTurn = 0;
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
}

function captureTurnStart() {
  state.turnStart = {
    deck: [...state.deck],
    table: cloneGroups(state.table),
    hand: [...currentPlayer().hand],
  };
  state.returnableCardIds = new Set(currentPlayer().hand.map((card) => card.id));
  state.cardsPlayedThisTurn = 0;
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
  els.handTitle.textContent = `${player.name}'s hand`;
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

  const validation = validateTable(state.table);
  els.endTurnBtn.disabled = state.cardsPlayedThisTurn === 0 || !validation.ok;
  els.drawBtn.disabled = state.cardsPlayedThisTurn > 0 || state.deck.length === 0 || hasAnyPlayableMove(player.hand, state.table);
  els.newGroupBtn.disabled = getSelectedCards().length === 0;
  els.takeBackBtn.disabled = getReturnableSelectedCards().length === 0;
  els.restoreBtn.disabled = state.cardsPlayedThisTurn === 0 && state.selected.size === 0 && sameTable(state.table, state.turnStart.table);

  if (!validation.ok) {
    setMessage(validation.reason, "bad");
  } else if (state.cardsPlayedThisTurn > 0) {
    setMessage("Valid table. You can keep manipulating or end your turn.", "good");
  } else if (hasAnyPlayableMove(player.hand, state.table)) {
    setMessage("You have a playable card or meld, so you must play before drawing.", "warn");
  } else {
    setMessage("No play is available. Draw until you can play.", "warn");
  }
}

function renderGroup(group, groupIndex) {
  const validation = validateGroup(group.cards);
  const groupEl = document.createElement("article");
  groupEl.className = `meld ${validation.ok ? "" : "is-invalid"}`;
  groupEl.innerHTML = `
    <div class="meld__head">
      <span>${validation.label}</span>
      <button type="button" data-remove-group="${group.id}" aria-label="Remove empty group">×</button>
    </div>
    <div class="meld__cards"></div>
    <div class="meld__actions">
      <button type="button" data-add-to-group="${group.id}">Add selected</button>
      <button type="button" data-sort-run="${group.id}">Sort run</button>
    </div>
  `;

  const cardWrap = groupEl.querySelector(".meld__cards");
  group.cards.forEach((card) => cardWrap.append(renderCard(card, "table", groupIndex)));
  return groupEl;
}

function renderCard(card, zone, groupIndex = null) {
  const button = document.createElement("button");
  const canTakeBack = zone === "table" && state.returnableCardIds.has(card.id);
  button.type = "button";
  button.className = [
    "card",
    `card--${card.color}`,
    state.selected.has(card.id) ? "is-selected" : "",
    canTakeBack ? "can-take-back" : "",
  ].filter(Boolean).join(" ");
  button.dataset.cardId = card.id;
  button.dataset.zone = zone;
  if (canTakeBack) button.title = "Played this turn";
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

  const playedFromHand = selectedFromHandCount();
  removeSelectedFromOrigins(selected);
  targetGroup.cards.push(...selected.map((entry) => entry.card));
  state.cardsPlayedThisTurn += playedFromHand;
  state.selected.clear();
  removeEmptyGroups();
  sortHands();
  render();
}

function createGroupFromSelected() {
  const selected = getSelectedCards();
  if (selected.length === 0) return;
  const playedFromHand = selectedFromHandCount();
  removeSelectedFromOrigins(selected);
  state.table.push({
    id: crypto.randomUUID(),
    cards: selected.map((entry) => entry.card),
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
  currentPlayer().hand.push(...selected.map((entry) => entry.card));
  state.cardsPlayedThisTurn = Math.max(0, state.cardsPlayedThisTurn - selected.length);
  state.selected.clear();
  removeEmptyGroups();
  sortHands();
  render();
}

function removeSelectedFromOrigins(selected) {
  const ids = new Set(selected.map((entry) => entry.card.id));
  currentPlayer().hand = currentPlayer().hand.filter((card) => !ids.has(card.id));
  for (const group of state.table) {
    group.cards = group.cards.filter((card) => !ids.has(card.id));
  }
}

function removeEmptyGroups() {
  state.table = state.table.filter((group) => group.cards.length > 0);
}

function restoreTurn() {
  state.deck = [...state.turnStart.deck];
  currentPlayer().hand = [...state.turnStart.hand];
  state.table = cloneGroups(state.turnStart.table);
  state.returnableCardIds = new Set(currentPlayer().hand.map((card) => card.id));
  state.selected.clear();
  state.cardsPlayedThisTurn = 0;
  sortHands();
  render();
}

function drawCard() {
  const player = currentPlayer();
  if (state.cardsPlayedThisTurn > 0) return;
  if (hasAnyPlayableMove(player.hand, state.table)) {
    setMessage("You can make a play, so drawing is not allowed.", "bad");
    render();
    return;
  }
  if (state.deck.length === 0) {
    setMessage("The deck is empty.", "bad");
    return;
  }
  const drawnCard = state.deck.pop();
  player.hand.push(drawnCard);
  state.returnableCardIds.add(drawnCard.id);
  sortHands();
  render();
}

function endTurn() {
  const validation = validateTable(state.table);
  if (state.cardsPlayedThisTurn === 0 || !validation.ok) return;
  if (currentPlayer().hand.length === 0) {
    state.winner = currentPlayer();
    els.winnerText.textContent = `${currentPlayer().name} wins`;
    els.winnerModal.classList.remove("hidden");
    render();
    return;
  }
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  captureTurnStart();
  render();
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
  return canSplitKindWithHand(hand, table);
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

function canPartitionIntoValidGroups(cards, groupCount) {
  if (groupCount !== 2) return false;
  const ids = cards.map((card) => card.id);
  const maxMask = 1 << ids.length;
  for (let mask = 1; mask < maxMask - 1; mask += 1) {
    const first = [];
    const second = [];
    cards.forEach((card, index) => {
      if (mask & (1 << index)) first.push(card);
      else second.push(card);
    });
    if (first.length >= 3 && second.length >= 3 && validateGroup(first).ok && validateGroup(second).ok) {
      return true;
    }
  }
  return false;
}

function nextValue(value) {
  return value === 13 ? 1 : value + 1;
}

function sortRun(groupId) {
  const group = state.table.find((candidate) => candidate.id === groupId);
  if (!group) return;
  const sorted = bestRunOrder(group.cards);
  if (sorted) group.cards = sorted;
  render();
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
  startGame(Number(els.playerCount.value));
});

els.hand.addEventListener("click", (event) => {
  const cardEl = event.target.closest("[data-card-id]");
  if (!cardEl) return;
  toggleSelected(cardEl.dataset.cardId);
});

els.melds.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-group]");
  const removeButton = event.target.closest("[data-remove-group]");
  const sortButton = event.target.closest("[data-sort-run]");
  const cardEl = event.target.closest("[data-card-id]");

  if (addButton) {
    moveSelectedToGroup(addButton.dataset.addToGroup);
  } else if (removeButton) {
    const group = state.table.find((candidate) => candidate.id === removeButton.dataset.removeGroup);
    if (group && group.cards.length === 0) {
      state.table = state.table.filter((candidate) => candidate.id !== group.id);
      render();
    }
  } else if (sortButton) {
    sortRun(sortButton.dataset.sortRun);
  } else if (cardEl) {
    toggleSelected(cardEl.dataset.cardId);
  }
});

function toggleSelected(cardId) {
  if (state.selected.has(cardId)) state.selected.delete(cardId);
  else state.selected.add(cardId);
  render();
}

els.newGroupBtn.addEventListener("click", createGroupFromSelected);
els.takeBackBtn.addEventListener("click", takeBackSelectedCards);
els.restoreBtn.addEventListener("click", restoreTurn);
els.drawBtn.addEventListener("click", drawCard);
els.endTurnBtn.addEventListener("click", endTurn);
els.playAgainBtn.addEventListener("click", () => {
  els.winnerModal.classList.add("hidden");
  els.setup.classList.remove("hidden");
  els.game.classList.add("hidden");
});
