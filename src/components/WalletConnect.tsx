'use client';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export default function WalletConnect() {
  const { publicKey } = useWallet();

  return (
    <div>
      <WalletMultiButton />
      {publicKey && (
        <div className="mt-2 text-xs text-gray-400">
          Connected: {publicKey.toBase58()}
        </div>
      )}
    </div>
  );
}
