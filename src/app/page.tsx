'use client';

import { BlackjackGame } from '../components/BlackjackGame';
import WalletConnect from '../components/WalletConnect';
import HouseBalance from '../components/HouseBalance';

export default function Home() {
  return (
    <div>
      <WalletConnect />
      <HouseBalance />
      <BlackjackGame />
    </div>
  );
}
