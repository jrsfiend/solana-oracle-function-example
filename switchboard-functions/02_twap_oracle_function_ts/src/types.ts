export type TwapOracle = {
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
      "name": "myProgramState",
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
      "name": "myOracleState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "btc",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "usdc",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "eth",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "sol",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "doge",
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
          },
          {
            "name": "volume1hr",
            "type": "i128"
          },
          {
            "name": "volume24hr",
            "type": "i128"
          },
          {
            "name": "twap1hr",
            "type": "i128"
          },
          {
            "name": "twap24hr",
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
          },
          {
            "name": "volume1hr",
            "type": "i128"
          },
          {
            "name": "volume24hr",
            "type": "i128"
          },
          {
            "name": "twap1hr",
            "type": "i128"
          },
          {
            "name": "twap24hr",
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
            "name": "Btc"
          },
          {
            "name": "Usdc"
          },
          {
            "name": "Eth"
          },
          {
            "name": "Sol"
          },
          {
            "name": "Doge"
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
};

export const IDL: TwapOracle = {
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
      "name": "myProgramState",
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
      "name": "myOracleState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "btc",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "usdc",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "eth",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "sol",
            "type": {
              "defined": "OracleData"
            }
          },
          {
            "name": "doge",
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
          },
          {
            "name": "volume1hr",
            "type": "i128"
          },
          {
            "name": "volume24hr",
            "type": "i128"
          },
          {
            "name": "twap1hr",
            "type": "i128"
          },
          {
            "name": "twap24hr",
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
          },
          {
            "name": "volume1hr",
            "type": "i128"
          },
          {
            "name": "volume24hr",
            "type": "i128"
          },
          {
            "name": "twap1hr",
            "type": "i128"
          },
          {
            "name": "twap24hr",
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
            "name": "Btc"
          },
          {
            "name": "Usdc"
          },
          {
            "name": "Eth"
          },
          {
            "name": "Sol"
          },
          {
            "name": "Doge"
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
};
