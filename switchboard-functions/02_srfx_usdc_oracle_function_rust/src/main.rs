pub use switchboard_solana::prelude::*;
use std::future::Future;
use std::pin::Pin;
use std::boxed::Box;
use rust_decimal::Decimal;
use crate::futures::future::join_all;
use ethers::{
    providers::{Http, Provider},
 };
 pub mod balancer;
 pub use balancer::*;
 pub mod math;
 pub use math::*;
use ethers::prelude::Wallet;
use std::process::ExitCode;
use std::process::Termination;
use switchboard_utils::ToPrimitive;
use std::time::SystemTime;
use tokio;
use balancer_sdk;
use tokio::time::Duration;
use balancer_sdk::Web3;
use web3;
use balancer_sdk::helpers::build_web3;
use balancer_sdk::helpers::*;
use std::sync::Arc;
use balancer_sdk::*;
use balancer_sdk::{Address, U256};
use balancer_sdk::helpers::*;
use std::str::FromStr;
use web3::signing::Key;
use balancer_sdk::PoolId;
use switchboard_utils;
use web3::futures::TryFutureExt;
use web3::futures::FutureExt;
use switchboard_utils::FromPrimitive;
use switchboard_utils::SbError;
use std::cmp::Ordering;
use switchboard_solana::switchboard_function;
use switchboard_solana::sb_error;


declare_id!("DApMSLHYpnXB4qk71vbZS8og4w31hg8Dkr14coaRFANb");

pub const PROGRAM_SEED: &[u8] = b"SRFXUSDCORACLE";

pub const ORACLE_SEED: &[u8] = b"ORACLE_V1_SEED";

pub const SFRX_ETH: &str = "0xac3e018457b222d93114458476f3e3416abbe38f";
pub const SFRXETH_DECIMALS: u32 = 18;

pub const WST_ETH: &str = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";
pub const WSTETH_DECIMALS: u32 = 18;


pub const WETH: &str = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
pub const WETH_DECIMALS: u32 = 18;

pub const USDC: &str = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
pub const USDC_DECIMALS: u32 = 6;

#[account(zero_copy(unsafe))]
pub struct MyProgramState {
    pub bump: u8,
    pub authority: Pubkey,
    pub switchboard_function: Pubkey,
    pub btc_price: f64,
}

pub use srfx_usdc_oracle::{
    self, OracleData, OracleDataWithTradingSymbol, RefreshOracles, RefreshOraclesParams,
    SwitchboardDecimal, TradingSymbol, ID as PROGRAM_ID,
};


#[switchboard_function]
pub async fn sb_function(runner: FunctionRunner, params: Vec<u8>) -> Result<Vec<Instruction>, SbFunctionError> {
   
    if runner.assert_mr_enclave().is_err() {
        runner.emit_error(199).await.unwrap();
    }

    // setup the provider + signer
    let provider = Provider::<Http>::try_from("https://goerli-rollup.arbitrum.io/rpc").unwrap();

    let SFRXETH_WSTETH_POOL = pool_id!("0x42ed016f826165c2e5976fe5bc3df540c5ad0af700000000000000000000058b");
    let WSTETH_WETH_POOL = pool_id!("0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd0000000000000000000005c2");
    // let WETH_USDC_POOL_UNSAFE = pool_id!("0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019");
    // https://ethereumnodes.com/
    let rpc_url = "https://rpc.flashbots.net/";

    let pool_id = SFRXETH_WSTETH_POOL;
    let wsteth_amount = Balancer::fetch_balancer_v2_quote(rpc_url, SFRXETH_WSTETH_POOL, SFRX_ETH, WST_ETH, u256!(10u128.pow(SFRXETH_DECIMALS).to_string()), 0.1).await.unwrap();
    let weth_amount = Balancer::fetch_balancer_v2_quote(rpc_url, WSTETH_WETH_POOL, WST_ETH, WETH, wsteth_amount, 0.1).await.unwrap();
    // let usdc_amount = fetch_balancer_v2_quote(rpc_url, WETH_USDC_POOL_UNSAFE, WETH, USDC, weth_amount, 0.1).await?;
    let v: Vec<Pin<Box<dyn Future<Output = Result<Decimal, SbError>>>>> = vec![
        Box::pin(switchboard_utils::exchanges::BitfinexApi::fetch_ticker("tETHUSD", None).map_ok(|x| x.last_price)),
        Box::pin(switchboard_utils::exchanges::CoinbaseApi::fetch_ticker("ETH-USD", None).map_ok(|x| x.price)),
        Box::pin(switchboard_utils::exchanges::HuobiApi::fetch_ticker("ethusdt", None).map_ok(|x| Decimal::from_f64(x.close).unwrap())),
        Box::pin(switchboard_utils::exchanges::KrakenApi::fetch_ticker("ETHUSD", None).map_ok(|x| x.close[0]))
    ];
    let eth_prices: Vec<Decimal> = join_all(v).await.into_iter().map(|x| x.unwrap()).collect();
    let eth_price = Math::median(eth_prices).unwrap();
    println!("ETH Price: {}", eth_price);
    println!("WETH Amount: {}", weth_amount);
    msg!("sending transaction");

    // Finally, emit the signed quote and partially signed transaction to the functionRunner oracle
    // The functionRunner oracle will use the last outputted word to stdout as the serialized result. This is what gets executed on-chain.
    println!("{} {}", eth_price, ((eth_price * I256::from_dec_str(weth_amount.to_string().as_str()).unwrap())).to_string().as_str());
    let binance = Balancer::fetch((eth_price * I256::from_dec_str(weth_amount.to_string().as_str()).unwrap())).await.unwrap();
    println!("{} {}", binance.srfx_usdc.quote.price, TradingSymbol::Srfx_usdc as u8);
    let ixs: Vec<Instruction> = binance.to_ixns(&runner);
   
    Ok(ixs)
}
