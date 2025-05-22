import { Card, Rank, Suit, GameState, Hand } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export class BlackjackEngine {
  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateHandScore(hand: Card[]): number {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.hidden) continue;
      
      if (card.rank === 'A') {
        aces += 1;
        score += 11;
      } else if (['K', 'Q', 'J'].includes(card.rank)) {
        score += 10;
      } else {
        score += parseInt(card.rank);
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return score;
  }

  private createHand(cards: Card[]): Hand {
    return {
      cards,
      score: this.calculateHandScore(cards)
    };
  }

  initializeGame(): GameState {
    const deck = this.createDeck();
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [deck.pop()!, { ...deck.pop()!, hidden: true }];

    return {
      deck,
      playerHand: this.createHand(playerCards),
      dealerHand: this.createHand(dealerCards),
      gameStatus: 'playing',
      canHit: true,
      canStand: true
    };
  }

  hit(state: GameState): GameState {
    if (!state.canHit) return state;

    const newState = { ...state };
    const card = newState.deck.pop()!;
    newState.playerHand.cards.push(card);
    newState.playerHand.score = this.calculateHandScore(newState.playerHand.cards);

    if (newState.playerHand.score > 21) {
      newState.gameStatus = 'playerBusted';
      newState.canHit = false;
      newState.canStand = false;
    }

    return newState;
  }

  stand(state: GameState): GameState {
    if (!state.canStand) return state;

    const newState = { ...state };
    newState.canHit = false;
    newState.canStand = false;

    // Reveal dealer's hidden card
    newState.dealerHand.cards = newState.dealerHand.cards.map(card => ({ ...card, hidden: false }));
    newState.dealerHand.score = this.calculateHandScore(newState.dealerHand.cards);

    // Dealer must hit on 16 and below, stand on 17 and above
    while (newState.dealerHand.score < 17) {
      const card = newState.deck.pop()!;
      newState.dealerHand.cards.push(card);
      newState.dealerHand.score = this.calculateHandScore(newState.dealerHand.cards);
    }

    if (newState.dealerHand.score > 21) {
      newState.gameStatus = 'dealerBusted';
    } else if (newState.dealerHand.score > newState.playerHand.score) {
      newState.gameStatus = 'dealerWon';
    } else if (newState.dealerHand.score < newState.playerHand.score) {
      newState.gameStatus = 'playerWon';
    } else {
      newState.gameStatus = 'push';
    }

    return newState;
  }
} 