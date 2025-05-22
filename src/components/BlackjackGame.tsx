'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlackjackEngine } from '../lib/blackjack-engine';
import { Card } from './Card';
import { GameState } from '../lib/types';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

const engine = new BlackjackEngine();

const gameStatusMessages = {
  waiting: '🎲 Click "New Game" to start!',
  playing: '🤔 Your turn! Hit or Stand?',
  playerWon: '🎉 You won!',
  dealerWon: '😔 Dealer won. Better luck next time!',
  push: "🤝 It's a tie!",
  playerBusted: '💥 Bust! You went over 21!',
  dealerBusted: '🎯 Dealer busted! You won!'
};

const buttonVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  },
  hover: { 
    scale: 1.05,
    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { scale: 0.95 }
};

const statusVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
};

const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const HOUSE_TOKEN_MINT = 'DKkFc3xYDmkkJLKLDTK4j5HUqvXBmF3KWqLztx1ryLK8';
const HOUSE_TREASURY = '5xYPJ8ZBE1ZtaJhTwVrHbzCYZLXKRyurQHEse5BMYmTi';

export function BlackjackGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [betAmount, setBetAmount] = useState(10); // default bet
  const [currentBet, setCurrentBet] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<{won: boolean, amount: number} | null>(null);
  const [playerBalance, setPlayerBalance] = useState<number>(0);

  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const startNewGame = () => {
    if (!currentBet) {
      alert('Please place a bet first!');
      return;
    }
    setGameState(engine.initializeGame());
    setGameResult(null);
  };

  const handleHit = () => {
    if (!gameState) return;
    const newState = engine.hit(gameState);
    setGameState(newState);
    
    // Check for game end conditions
    if (newState.gameStatus === 'playerBusted' || newState.gameStatus === 'playerWon' || 
        newState.gameStatus === 'dealerWon' || newState.gameStatus === 'push') {
      handleGameEnd(newState.gameStatus);
    }
  };

  const handleStand = () => {
    if (!gameState) return;
    const newState = engine.stand(gameState);
    setGameState(newState);
    handleGameEnd(newState.gameStatus);
  };

  const handleDeposit = async (amount: number) => {
    if (!publicKey) {
      alert('Please connect your wallet!');
      return;
    }

    try {
      // 1. Get user's associated token account for $HOUSE
      const userTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(HOUSE_TOKEN_MINT),
        publicKey
      );

      // 2. Get house's associated token account for $HOUSE
      const houseTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(HOUSE_TOKEN_MINT),
        new PublicKey(HOUSE_TREASURY)
      );

      // 3. Create transfer instruction
      const transferIx = createTransferInstruction(
        userTokenAccount,
        houseTokenAccount,
        publicKey,
        amount * 1e9 // $HOUSE has 9 decimals
      );

      // 4. Create and send transaction
      const tx = new Transaction().add(transferIx);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // 5. Update player balance
      setPlayerBalance(prev => prev + amount);
      alert('Deposit successful! You can now place bets.');
    } catch (err) {
      console.error(err);
      alert('Failed to deposit: ' + (err as Error).message);
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!publicKey) {
      alert('Please connect your wallet!');
      return;
    }

    try {
      // 1. Get user's associated token account for $HOUSE
      const userTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(HOUSE_TOKEN_MINT),
        publicKey
      );

      // 2. Get house's associated token account for $HOUSE
      const houseTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(HOUSE_TOKEN_MINT),
        new PublicKey(HOUSE_TREASURY)
      );

      // 3. Create transfer instruction (from house to user)
      const transferIx = createTransferInstruction(
        houseTokenAccount,
        userTokenAccount,
        new PublicKey(HOUSE_TREASURY),
        amount * 1e9 // $HOUSE has 9 decimals
      );

      // 4. Create and send transaction
      const tx = new Transaction().add(transferIx);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // 5. Update player balance
      setPlayerBalance(prev => prev - amount);
      alert(`Withdrawal of ${amount} $HOUSE successful!`);
    } catch (err) {
      console.error(err);
      alert('Failed to withdraw: ' + (err as Error).message);
    }
  };

  const handlePlaceBet = (amount: number) => {
    if (amount > playerBalance) {
      alert('Insufficient balance!');
      return;
    }
    setCurrentBet(amount);
    setPlayerBalance(prev => prev - amount);
  };

  const handleGameEnd = (status: string) => {
    if (!currentBet) return;
    
    let won = false;
    let amount = 0;
    
    switch (status) {
      case 'playerWon':
      case 'dealerBusted':
        won = true;
        amount = currentBet * 2; // Player wins 2x their bet
        break;
      case 'push':
        won = true;
        amount = currentBet; // Player gets their bet back
        break;
      case 'dealerWon':
      case 'playerBusted':
        won = false;
        amount = currentBet; // Player loses their bet
        break;
    }
    
    // Update player balance based on game result
    setPlayerBalance(prev => won ? prev + amount : prev);
    setGameResult({ won, amount });

    // Reset game state to allow placing new bet
    setGameState(null);
    setCurrentBet(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 p-4 sm:p-8">
      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="max-w-6xl mx-auto"
      >
        {/* Casino Table */}
        <div className="relative bg-gradient-to-br from-green-800 to-green-900 rounded-[2.5rem] p-8 shadow-2xl border-8 border-amber-950/30 min-h-[80vh]">
          {/* Table Pattern */}
          <div className="absolute inset-0 rounded-[2rem] background-pattern opacity-10" />
          
          {/* Game Content */}
          <div className="relative">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-6xl font-bold text-white mb-12 text-center tracking-tight"
            >
              Blackjack
              <span className="text-xl sm:text-2xl font-normal block mt-2 text-white/80">MVP Edition</span>
            </motion.h1>

            {/* Balance and Deposit UI */}
            <div className="mb-8 text-center">
              <div className="bg-black/20 p-6 rounded-xl inline-block">
                <h2 className="text-white text-2xl mb-4">Your Balance: {playerBalance} $HOUSE</h2>
                <div className="flex items-center justify-center gap-4">
                  <input
                    type="number"
                    min={1}
                    value={betAmount}
                    onChange={e => setBetAmount(Number(e.target.value))}
                    className="border rounded px-4 py-2 w-32 text-lg"
                  />
                  <button
                    onClick={() => handleDeposit(betAmount)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => handleWithdraw(playerBalance)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                    disabled={playerBalance <= 0}
                  >
                    Withdraw All
                  </button>
                </div>
              </div>
            </div>

            {/* Betting UI */}
            {!gameState && playerBalance > 0 && (
              <div className="mb-8 text-center">
                <div className="bg-black/20 p-6 rounded-xl inline-block">
                  <h2 className="text-white text-2xl mb-4">Place Your Bet</h2>
                  <div className="flex items-center justify-center gap-4">
                    <input
                      type="number"
                      min={1}
                      max={playerBalance}
                      value={betAmount}
                      onChange={e => setBetAmount(Number(e.target.value))}
                      className="border rounded px-4 py-2 w-32 text-lg"
                    />
                    <button
                      onClick={() => handlePlaceBet(betAmount)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                    >
                      Place Bet
                    </button>
                  </div>
                  {currentBet && (
                    <div className="mt-4 text-white">
                      Current Bet: {currentBet} $HOUSE
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Game Result */}
            {gameResult && (
              <div className={`text-center mb-8 p-4 rounded-lg ${gameResult.won ? 'bg-green-600' : 'bg-red-600'}`}>
                <h2 className="text-white text-2xl font-bold">
                  {gameResult.won ? 'You Won!' : 'You Lost!'}
                </h2>
                <p className="text-white text-xl">
                  {gameResult.won 
                    ? `+${gameResult.amount} $HOUSE` 
                    : `-${gameResult.amount} $HOUSE`}
                </p>
              </div>
            )}

            {/* Game Controls */}
            <div className="flex justify-center gap-4 sm:gap-6 mb-12">
              <motion.button
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                onClick={startNewGame}
                className="bg-gradient-to-b from-blue-500 to-blue-600 text-white px-6 sm:px-8 py-3 rounded-xl 
                         font-bold shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all border border-blue-400/20"
              >
                New Game
              </motion.button>
              <AnimatePresence mode="popLayout">
                {gameState?.canHit && (
                  <motion.button
                    key="hit-button"
                    variants={buttonVariants}
                    initial="initial"
                    animate="animate"
                    exit="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleHit}
                    className="bg-gradient-to-b from-green-500 to-green-600 text-white px-6 sm:px-8 py-3 
                             rounded-xl font-bold shadow-lg hover:from-green-600 hover:to-green-700 
                             transition-all border border-green-400/20"
                  >
                    Hit
                  </motion.button>
                )}
                {gameState?.canStand && (
                  <motion.button
                    key="stand-button"
                    variants={buttonVariants}
                    initial="initial"
                    animate="animate"
                    exit="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleStand}
                    className="bg-gradient-to-b from-red-500 to-red-600 text-white px-6 sm:px-8 py-3 
                             rounded-xl font-bold shadow-lg hover:from-red-600 hover:to-red-700 
                             transition-all border border-red-400/20"
                  >
                    Stand
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Game Status */}
            <AnimatePresence mode="wait">
              {gameState && (
                <motion.div
                  key={gameState.gameStatus}
                  variants={statusVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="text-white text-2xl sm:text-3xl text-center mb-12 font-bold tracking-wide"
                >
                  {gameStatusMessages[gameState.gameStatus]}
                </motion.div>
              )}
            </AnimatePresence>

            {gameState && (
              <div className="space-y-16">
                {/* Dealer's Hand */}
                <div>
                  <h2 className="text-white/90 text-xl sm:text-2xl mb-8 font-bold tracking-wide flex items-center gap-2 
                               bg-black/20 p-4 rounded-xl inline-block">
                    <span className="text-2xl sm:text-3xl">🎩</span>
                    Dealer&apos;s Hand {!gameState.dealerHand.cards[1]?.hidden && `(${gameState.dealerHand.score})`}
                  </h2>
                  <div className="flex justify-center perspective-1000">
                    <div className="relative w-[400px] h-[160px]">
                      {gameState.dealerHand.cards.map((card, index) => (
                        <Card 
                          key={`dealer-${card.suit}-${card.rank}-${index}`}
                          card={card} 
                          index={index} 
                          isDealer 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Player's Hand */}
                <div>
                  <h2 className="text-white/90 text-xl sm:text-2xl mb-8 font-bold tracking-wide flex items-center gap-2 
                               bg-black/20 p-4 rounded-xl inline-block">
                    <span className="text-2xl sm:text-3xl">👤</span>
                    Your Hand ({gameState.playerHand.score})
                  </h2>
                  <div className="flex justify-center perspective-1000">
                    <div className="relative w-[400px] h-[160px]">
                      {gameState.playerHand.cards.map((card, index) => (
                        <Card 
                          key={`player-${card.suit}-${card.rank}-${index}`}
                          card={card} 
                          index={index} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}