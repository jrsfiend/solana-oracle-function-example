import { SwitchboardProgram, loadKeypair } from "@switchboard-xyz/solana.js";
import * as anchor from "@coral-xyz/anchor";
import { TwapOracle } from "../target/types/twap_oracle";
import dotenv from "dotenv";
import { loadDefaultQueue } from "./utils";
import { PublicKey } from "@solana/web3.js";
dotenv.config();

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(
    process.argv.length > 2
      ? new anchor.AnchorProvider(
          provider.connection,
          new anchor.Wallet(loadKeypair(process.argv[2])),
          {}
        )
      : provider
  );

  const payer = (provider.wallet as anchor.Wallet).payer;
  console.log(`PAYER: ${payer.publicKey}`);

  const program = new anchor.Program({
    "version": "0.1.0",
    "name": "twap_oracle",
    "instructions": [
      {
        "name": "initialize",
        "accounts": [
          {
            "name": "program",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "oracle",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "authority",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "switchboardFunction",
            "isMut": false,
            "isSigner": false,
            "isOptional": true
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
          }
        ],
        "args": []
      },
      {
        "name": "refreshOracles",
        "accounts": [
          {
            "name": "program",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "oracle",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "switchboardFunction",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "enclaveSigner",
            "isMut": false,
            "isSigner": true
          }
        ],
        "args": [
          {
            "name": "params",
            "type": {
              "defined": "RefreshOraclesParams"
            }
          }
        ]
      },
      {
        "name": "setFunction",
        "accounts": [
          {
            "name": "program",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "authority",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "switchboardFunction",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": []
      },
      {
        "name": "triggerFunction",
        "accounts": [
          {
            "name": "program",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "switchboardFunction",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "authority",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "attestationQueue",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "attestationProgram",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": []
      }
    ],
    "accounts": [
      {
        "name": "MyProgramState",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "bump",
              "type": "u8"
            },
            {
              "name": "authority",
              "type": "publicKey"
            },
            {
              "name": "switchboardFunction",
              "type": "publicKey"
            }
          ]
        }
      },
      {
        "name": "MyOracleState",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "bump",
              "type": "u8"
            },
            {
              "name": "srfxUsdc",
              "type": {
                "defined": "OracleData"
              }
            }
          ]
        }
      }
    ],
    "types": [
      {
        "name": "OracleData",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "oracleTimestamp",
              "type": "i64"
            },
            {
              "name": "price",
              "type": "i128"
            }
          ]
        }
      },
      {
        "name": "OracleDataBorsh",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "oracleTimestamp",
              "type": "i64"
            },
            {
              "name": "price",
              "type": "i128"
            }
          ]
        }
      },
      {
        "name": "OracleDataWithTradingSymbol",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "symbol",
              "type": {
                "defined": "TradingSymbol"
              }
            },
            {
              "name": "data",
              "type": {
                "defined": "OracleDataBorsh"
              }
            }
          ]
        }
      },
      {
        "name": "RefreshOraclesParams",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "rows",
              "type": {
                "vec": {
                  "defined": "OracleDataWithTradingSymbol"
                }
              }
            }
          ]
        }
      },
      {
        "name": "TradingSymbol",
        "type": {
          "kind": "enum",
          "variants": [
            {
              "name": "Unknown"
            },
            {
              "name": "Srfx_usdc"
            }
          ]
        }
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "InvalidAuthority",
        "msg": "Invalid authority account"
      },
      {
        "code": 6001,
        "name": "ArrayOverflow",
        "msg": "Array overflow"
      },
      {
        "code": 6002,
        "name": "StaleData",
        "msg": "Stale data"
      },
      {
        "code": 6003,
        "name": "InvalidTrustedSigner",
        "msg": "Invalid trusted signer"
      },
      {
        "code": 6004,
        "name": "InvalidMrEnclave",
        "msg": "Invalid MRENCLAVE"
      },
      {
        "code": 6005,
        "name": "InvalidSymbol",
        "msg": "Failed to find a valid trading symbol for this price"
      },
      {
        "code": 6006,
        "name": "IncorrectSwitchboardFunction",
        "msg": "FunctionAccount pubkey did not match program_state.function"
      },
      {
        "code": 6007,
        "name": "InvalidSwitchboardFunction",
        "msg": "FunctionAccount pubkey did not match program_state.function"
      },
      {
        "code": 6008,
        "name": "FunctionValidationFailed",
        "msg": "FunctionAccount was not validated successfully"
      }
    ]
  } as anchor.Idl, new PublicKey("5Xf8maajW5MCaeUPn1RLSJY2CczZiWN31eGuDWePgvSV" as string), provider)
  console.log(program)
  console.log(`PROGRAM: ${program.programId}`);

  const switchboardProgram = await SwitchboardProgram.fromProvider(provider);

  const [programStatePubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("TWAPORACLE")],
    program.programId
  );
  console.log(`PROGRAM_STATE: ${programStatePubkey}`);

  const [oraclePubkey, bump2] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("ORACLE_V1_SEED")],
    program.programId
  );
  console.log(`ORACLE_PUBKEY: ${oraclePubkey}`);

  try {
    const programState = await program.account.myProgramState.fetch(
      programStatePubkey
    );
    console.log(`Program state already initialized`);
    console.log(
      `PROGRAM_STATE: \n${JSON.stringify(programState, undefined, 2)}`
    );
    return;

    // Account already initialized
  } catch (error) {
    if (!`${error}`.includes("Account does not exist or has no data")) {
      throw error;
    }
  }

  const attestationQueueAccount = await loadDefaultQueue(switchboardProgram);
  console.log(`ATTESTATION_QUEUE: ${attestationQueueAccount.publicKey}`);

  const signature = await program.methods
    .initialize(bump, bump2)
    .accounts({
      program: programStatePubkey,
      oracle: oraclePubkey,
      authority: payer.publicKey,
      switchboardFunction: new PublicKey("CpyxRyNvgddZbZkYw5BB4XWhnbJZLYLx5kAkaK7yf2Nr"),
    })
    .rpc();

  console.log(`[TX] initialize: ${signature}`);
})();
