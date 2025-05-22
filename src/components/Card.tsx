import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card as CardType } from '../lib/types';

interface CardProps {
  card: CardType;
  index: number;
  isDealer?: boolean;
}

// Helper to get SVG filename for a card
function getCardSvgFilename(card: CardType) {
  const rankMap: Record<string, string> = {
    'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K'
  };
  const suitMap: Record<string, string> = {
    spades: 'S',
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
  };
  return `/cards/${rankMap[card.rank]}${suitMap[card.suit]}.svg`;
}

export function Card({ card, index }: CardProps) {
  const cardVariants = {
    initial: {
      opacity: 0,
      scale: 0.8,
      y: -50,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: index * 0.1,
      },
    },
    hover: {
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  };

  const cardStyle = {
    position: 'absolute' as const,
    left: `${index * 48}px`,
    zIndex: index,
    width: '110px',
    height: '154px',
    borderRadius: '0.75rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    background: 'none',
    padding: 0,
    overflow: 'hidden',
    border: 'none',
  };

  if (card.hidden) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        style={cardStyle}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Image
            src="/cards/back.svg"
            alt="Card back"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
      </motion.div>
    );
  }

  const svgSrc = getCardSvgFilename(card);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
      style={cardStyle}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Image
          src={svgSrc}
          alt={`${card.rank} of ${card.suit}`}
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </motion.div>
  );
}