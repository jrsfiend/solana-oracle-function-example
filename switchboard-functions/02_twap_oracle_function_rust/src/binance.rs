// Note: Balancer API requires a non-US IP address

use crate::*;

use switchboard_solana::get_ixn_discriminator;

use srfx_usdc_oracle::{OracleDataBorsh, TradingSymbol};
use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize, Default, Clone, Debug)]
pub struct Ticker {
    pub symbol: String, // BTCUSDT
    pub price: I256,  // 0.00000000
}

#[derive(Clone, Debug)]
pub struct IndexData {
    pub symbol: String,
    pub quote: Ticker,
}
impl Into<OracleDataBorsh> for IndexData {
    fn into(self) -> OracleDataBorsh {
        let oracle_timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .try_into()
            .unwrap_or_default();

        OracleDataBorsh {
            oracle_timestamp,
            price: self.quote.price.as_i128().try_into().unwrap_or_default()
        }
    }
}

pub struct Balancer {
    pub srfx_usdc: IndexData,
}

impl Balancer {
    // Fetch data from the Balancer API
    pub async fn fetch(price: I256) -> std::result::Result<Balancer, SbError> {
        let symbols = ["SRFXUSD"];

        Ok(Balancer {
            srfx_usdc: {
                let symbol = symbols[0];
                
                IndexData {
                    symbol: symbol.to_string(),
                    quote: Ticker {
                        symbol: symbol.to_string(),
                        price: price.try_into().unwrap_or_default(),
                    
                    }
                }
            }
        })
    }

    pub fn to_ixns(&self, runner: &FunctionRunner) -> Vec<Instruction> {
        let rows: Vec<OracleDataWithTradingSymbol> = vec![
            OracleDataWithTradingSymbol {
                symbol: TradingSymbol::Srfx_usdc,
                data: self.srfx_usdc.clone().into(),
            }
            // OracleDataWithTradingSymbol {
            // symbol: TradingSymbol::Sol,
            // data: self.sol_usdt.clone().into(),
            // },
            // OracleDataWithTradingSymbol {
            // symbol: TradingSymbol::Doge,
            // data: self.doge_usdt.clone().into(),
            // },
        ];
        println!("{}, {}", self.srfx_usdc.quote.price, TradingSymbol::Srfx_usdc as u8);

        let params = RefreshOraclesParams { rows };

        let (program_state_pubkey, _state_bump) =
            Pubkey::find_program_address(&[b"SRFXUSDCORACLE"], &PROGRAM_ID);

        let (oracle_pubkey, _oracle_bump) =
            Pubkey::find_program_address(&[b"ORACLE_V1_SEED"], &PROGRAM_ID);

        let ixn = Instruction {
            program_id: srfx_usdc_oracle::ID,
            accounts: vec![
                AccountMeta::new_readonly(program_state_pubkey, false),
                AccountMeta::new(oracle_pubkey, false),
                AccountMeta::new_readonly(runner.function, false),
                // our enclave generated signer must sign to update our program
                AccountMeta::new_readonly(runner.signer, true),
            ],
            data: [
                get_ixn_discriminator("refresh_oracles").to_vec(),
                params.try_to_vec().unwrap(),
            ]
            .concat(),
        };

        vec![ixn]
    }
}

