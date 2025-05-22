export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export interface Hand {
  cards: Card[];
  score: number;
}

export interface GameState {
  deck: Card[];
  playerHand: Hand;
  dealerHand: Hand;
  gameStatus: 'waiting' | 'playing' | 'playerWon' | 'dealerWon' | 'push' | 'playerBusted' | 'dealerBusted';
  canHit: boolean;
  canStand: boolean;
} 