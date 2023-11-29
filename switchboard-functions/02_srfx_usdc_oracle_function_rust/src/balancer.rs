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

    pub async fn fetch_balancer_v2_quote(rpc_url: &str, pool: PoolId, in_token: &str, out_token: &str, amount: U256, slippage: f64) -> Result<U256, SbError> {
        let private_key = PrivateKey::from_str("00e0000a00aaaa0e0a000e0e0000e00e000a000000000000000aaa00a0aaaaaa").unwrap();
        let w3 = build_web3(rpc_url);
        let vault_instance = balancer_sdk::vault::Vault::new(w3);
        let in_token = addr!(in_token);
        let out_token = addr!(out_token);
        let pool_info = vault_instance.get_pool_tokens(pool.into()).call().await.unwrap();
        // println!("{:#?}", pool_info);
        let out_idx = pool_info.0.iter().position(|&x| x == out_token).unwrap();
        let in_idx = pool_info.0.iter().position(|&x| x == in_token).unwrap();
        let in_pool_total = pool_info.1[in_idx];
        let out_pool_total = pool_info.1[out_idx];
        let swap_step = BatchSwapStep {
            pool_id: pool,
            asset_in_index: in_idx,
            asset_out_index: out_idx,
            amount,
            user_data: UserData("0x").into(),
        };
        let funds = FundManagement {
            sender: private_key.public_address(),
            from_internal_balance: false,
            recipient: private_key.public_address(),
            to_internal_balance: false,
        };
        let deltas = vault_instance
            .query_batch_swap(
                SwapKind::GivenIn as u8,
                vec![swap_step.into()],
                pool_info.0,
                funds.into(),
            )
            .from(balancer_sdk::Account::Offline(private_key, None))
            .call()
            .await
            .unwrap();
        // println!("{}", deltas[out_idx].abs());
        let in_percent = Math::get_percentage_of_total(amount, in_pool_total);
        let out_amount = deltas[out_idx].abs().try_into().unwrap();
        let out_percent = Math::get_percentage_of_total(out_amount, out_pool_total);
        if in_percent >= slippage {
            println!("IN CHANGE: {}%", in_percent);
            return Err((SbError::CustomMessage("IN CHANGE".to_string())));
        }
        if out_percent >= slippage {
            println!("OUT CHANGE: {}%", out_percent);
            return Err((SbError::CustomMessage("OUT CHANGE".to_string())));
        }
        Ok(out_amount)
    }

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

