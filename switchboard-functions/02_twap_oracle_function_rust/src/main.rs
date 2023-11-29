pub use switchboard_solana::prelude::*;
use std::future::Future;
use std::pin::Pin;
use std::boxed::Box;
use rust_decimal::Decimal;
use ethers::{
    providers::{Http, Provider},
 };
 pub mod binance;
 pub use binance::*;
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


pub async fn fetch_balancer_v2_quote(rpc_url: &str, pool: PoolId, in_token: &str, out_token: &str, amount: U256, slippage: f64) -> Result<U256> {
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
    let in_percent = get_percentage_of_total(amount, in_pool_total);
    let out_amount = deltas[out_idx].abs().try_into().unwrap();
    let out_percent = get_percentage_of_total(out_amount, out_pool_total);
    if in_percent >= slippage {
        println!("IN CHANGE: {}%", in_percent);
        return Err(Box::new(SbError::CustomMessage("IN CHANGE".to_string())));
    }
    if out_percent >= slippage {
        println!("OUT CHANGE: {}%", out_percent);
        return Err(Box::new(SbError::CustomMessage("OUT CHANGE".to_string())));
    }
    Ok(out_amount)
}

fn median(mut numbers: Vec<Decimal>) -> Option<balancer_sdk::I256> {

    if numbers.is_empty() {
        return None; // Cannot find the median of an empty list
    }

    // Sort the numbers using `partial_cmp` because `Decimal` doesn't implement `Ord`
    numbers.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));

    let mid = numbers.len() / 2; // Find the middle index
    Some(if numbers.len() % 2 == 0 {
        // If even number of elements, average the middle two
        let decimal = (numbers[mid - 1] + numbers[mid]) / Decimal::from(2);
        let i256 = (balancer_sdk::I256::from(decimal.to_u128().unwrap()));
        i256
    } else {
        // If odd, return the middle element
        let decimal = numbers[mid];
        let i256 = (balancer_sdk::I256::from(decimal.to_u128().unwrap()));
        i256
    })
}

fn u256_to_f64(value: U256) -> f64 {
    // This function assumes that the value can fit within an f64
    // It's a simple way to convert, and more sophisticated methods may be needed for larger values
    value.as_u128() as f64
}

fn get_percentage_of_total(part: U256, total: U256) -> f64 {
    if total.is_zero() {
        panic!("Total must not be zero");
    }

    // Convert both U256 values to f64
    let part = u256_to_f64(part);
    let total = u256_to_f64(total);

    // Calculate the percentage
    (part / total) * 100.0
}

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

pub use srfx_usdc_oracle::{
    self, OracleData, OracleDataWithTradingSymbol, RefreshOracles, RefreshOraclesParams,
    SwitchboardDecimal, TradingSymbol, ID as PROGRAM_ID,
};

pub async fn perform(runner: &FunctionRunner) -> Result<()> {
    // Then, write your own Rust logic and build a Vec of instructions.
    // Should  be under 700 bytes after serialization

    // setup the provider + signer
    let provider = Provider::<Http>::try_from("https://goerli-rollup.arbitrum.io/rpc").unwrap();

    let SFRXETH_WSTETH_POOL = pool_id!("0x42ed016f826165c2e5976fe5bc3df540c5ad0af700000000000000000000058b");
    let WSTETH_WETH_POOL = pool_id!("0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd0000000000000000000005c2");
    // let WETH_USDC_POOL_UNSAFE = pool_id!("0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019");
    // https://ethereumnodes.com/
    let rpc_url = "https://rpc.flashbots.net/";

    let pool_id = SFRXETH_WSTETH_POOL;
    let wsteth_amount = fetch_balancer_v2_quote(rpc_url, SFRXETH_WSTETH_POOL, SFRX_ETH, WST_ETH, u256!(10u128.pow(SFRXETH_DECIMALS).to_string()), 0.1).await.unwrap();
    let weth_amount = fetch_balancer_v2_quote(rpc_url, WSTETH_WETH_POOL, WST_ETH, WETH, wsteth_amount, 0.1).await.unwrap();
    // let usdc_amount = fetch_balancer_v2_quote(rpc_url, WETH_USDC_POOL_UNSAFE, WETH, USDC, weth_amount, 0.1).await?;
    let bitfinex_quote = switchboard_utils::exchanges::BitfinexApi::fetch_ticker("tETHUSD", None).await.unwrap();
    let coinbase_quote = switchboard_utils::exchanges::CoinbaseApi::fetch_ticker("ETH-USD", None).await.unwrap();
    let huobi_quote = switchboard_utils::exchanges::HuobiApi::fetch_ticker("ethusdt", None).await.unwrap();
    let kraken_quote = switchboard_utils::exchanges::KrakenApi::fetch_ticker("ETHUSD", None).await.unwrap();
    println!("Bitfinex: {}", bitfinex_quote.last_price);
    println!("Coinbase: {}", coinbase_quote.price);
    println!("Huobi: {}", huobi_quote.close);
    println!("Kraken: {}", kraken_quote.close[0]);
    let eth_prices = vec![
        bitfinex_quote.last_price,
        coinbase_quote.price,
        Decimal::from_f64(huobi_quote.close).unwrap(),
        kraken_quote.close[0],
    ];
    let eth_price = median(eth_prices).unwrap();
    println!("ETH Price: {}", eth_price);
    println!("WETH Amount: {}", weth_amount);
    msg!("sending transaction");

    // Finally, emit the signed quote and partially signed transaction to the functionRunner oracle
    // The functionRunner oracle will use the last outputted word to stdout as the serialized result. This is what gets executed on-chain.
    println!("{} {}", eth_price, ((eth_price * I256::from_dec_str(weth_amount.to_string().as_str()).unwrap())).to_string().as_str());
    let binance = Balancer::fetch((eth_price * I256::from_dec_str(weth_amount.to_string().as_str()).unwrap())).await?;
    println!("{} {}", binance.srfx_usdc.quote.price, TradingSymbol::Srfx_usdc as u8);
    let ixs: Vec<Instruction> = binance.to_ixns(&runner);
    runner.emit(ixs).await?;
    Ok(())
}

#[tokio::main(worker_threads = 12)]
async fn main() -> Result<()> {
    // First, initialize the runner instance with a freshly generated Gramine keypair
    let runner = FunctionRunner::from_env(None)?;
    if runner.assert_mr_enclave().is_err() {
        runner.emit_error(199).await?;
    }

    let res = perform(&runner).await;
    if let Some(e) = res.err() {
        println!("Error: {}", e);
        runner.emit_error(1).await?;
    }
    Ok(())
}
