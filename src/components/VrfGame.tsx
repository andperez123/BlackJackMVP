import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { SWITCHBOARD_PROGRAM_ID } from '@switchboard-xyz/switchboard-v2';

// Import your program IDL
const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

// This will be replaced with your actual IDL after building the program
const IDL = {
  "version": "0.1.0",
  "name": "blackjack",
  "instructions": [
    {
      "name": "initializeGame",
      "accounts": [
        {
          "name": "gameState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "requestRandomness",
      "accounts": [
        {
          "name": "gameState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vrf",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "oracleQueue",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "switchboardProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "GameState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "publicKey"
          },
          {
            "name": "status",
            "type": {
              "defined": "GameStatus"
            }
          },
          {
            "name": "result",
            "type": {
              "option": {
                "defined": "GameResult"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "GameStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "WaitingForRandomness"
          },
          {
            "name": "Completed"
          }
        ]
      }
    },
    {
      "name": "GameResult",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PlayerWon"
          },
          {
            "name": "DealerWon"
          },
          {
            "name": "Push"
          }
        ]
      }
    }
  ]
};

export function VrfGame() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const initializeGame = async () => {
    if (!wallet.publicKey) return;
    
    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program(IDL, PROGRAM_ID, provider);

      // Create game state account
      const [gameStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), wallet.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializeGame()
        .accounts({
          gameState: gameStatePda,
          player: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Game initialized:', tx);
      await fetchGameState();
    } catch (error) {
      console.error('Error initializing game:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestRandomness = async () => {
    if (!wallet.publicKey || !gameState) return;

    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program(IDL, PROGRAM_ID, provider);

      // Get VRF account and other required accounts
      // You'll need to replace these with actual Switchboard VRF accounts
      const vrfAccount = new PublicKey('YOUR_VRF_ACCOUNT');
      const oracleQueue = new PublicKey('YOUR_ORACLE_QUEUE');
      // ... other required accounts

      const tx = await program.methods
        .requestRandomness()
        .accounts({
          gameState: gameState.publicKey,
          vrf: vrfAccount,
          oracleQueue,
          // ... other accounts
          payer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          switchboardProgram: SWITCHBOARD_PROGRAM_ID,
        })
        .rpc();

      console.log('Randomness requested:', tx);
      await fetchGameState();
    } catch (error) {
      console.error('Error requesting randomness:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameState = async () => {
    if (!wallet.publicKey) return;

    try {
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program(IDL, PROGRAM_ID, provider);

      const [gameStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game'), wallet.publicKey.toBuffer()],
        program.programId
      );

      const state = await program.account.gameState.fetch(gameStatePda);
      setGameState(state);
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };

  useEffect(() => {
    if (wallet.publicKey) {
      fetchGameState();
    }
  }, [wallet.publicKey]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">VRF Blackjack</h2>
      
      {!gameState ? (
        <button
          onClick={initializeGame}
          disabled={loading || !wallet.publicKey}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Start New Game'}
        </button>
      ) : (
        <div>
          <p>Game Status: {gameState.status}</p>
          {gameState.status === 'WaitingForRandomness' && (
            <button
              onClick={requestRandomness}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 mt-2"
            >
              {loading ? 'Loading...' : 'Request Randomness'}
            </button>
          )}
          {gameState.result && (
            <p className="mt-2">
              Result: {gameState.result}
            </p>
          )}
        </div>
      )}
    </div>
  );
} 