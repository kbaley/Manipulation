# Manipulation

A browser prototype of a two-deck rummy-family card game based on the rules Kyle's grandmother called Manipulation.

## Run locally

Start a static file server from this folder:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Rules

Manipulation is played with two standard 52-card decks and no jokers. This prototype is always a human player against a computer opponent.

### Setup

- Shuffle both decks together.
- Deal three cards to each player.
- The human player takes the first turn.

### Goal

Be the first player to get rid of every card in your hand.

### Valid table groups

Every group on the table must have at least three cards and must be one of these:

- A same-rank set of three or four cards, such as three 8s or four Queens.
- A suited run of three or more cards in sequence, such as 4-5-6 of clubs.

Runs can loop from King back to Ace, so Queen-King-Ace and King-Ace-2 are valid when all cards are the same suit.

### Turns

On your turn, you must play at least one card before you can end the turn. A play can be a new group, adding to an existing group, or manipulating the table so every resulting group remains valid.

If you have any playable move, you cannot draw. If you have no playable move, draw cards one at a time until you can play.

After you play, the whole table must be valid before you can end your turn.

### Manipulation

You may rearrange cards already on the table during your turn. You can split groups, combine groups, move cards between groups, or add cards from your hand, as long as every group left on the table is valid.

Cards played or drawn during the current turn can be taken back before the turn ends. You can also restore the turn to its starting table and hand state.

## Current Features

- Two standard 52-card decks
- Human vs. computer play
- Computer opponent that draws only when forced, builds melds, adds to table groups, and performs simple legal table splits
- Three-card opening deal
- Draw-until-playable turn flow
- Table manipulation with validation for same-rank sets and looping suited runs
- Turn restore
- Take-back support for cards played during the current turn
- Subtle highlighting for cards that can be taken back

## Notes

This is currently a local browser prototype. Adding online play would need a server, rooms, turn synchronization, and private per-player hands.
