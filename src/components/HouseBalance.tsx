'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';

const HOUSE_TOKEN_MINT = 'DKkFc3xYDmkkJLKLDTK4j5HUqvXBmF3KWqLztx1ryLK8';

export default function HouseBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    (async () => {
      try {
        // Get all token accounts for this wallet
        const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          mint: new PublicKey(HOUSE_TOKEN_MINT),
        });

        if (accounts.value.length > 0) {
          const amount = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          setBalance(amount);
        } else {
          setBalance(0);
        }
      } catch (e) {
        setBalance(null);
      }
    })();
  }, [publicKey, connection]);

  if (!publicKey) return null;

  return (
    <div className="mt-2 text-sm text-green-600">
      $HOUSE Balance: {balance !== null ? balance : '...'}
    </div>
  );
}
