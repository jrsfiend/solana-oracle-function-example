use crate::*;
use bytemuck::{Pod, Zeroable};

#[account(zero_copy(unsafe))]
pub struct MyProgramState {
    pub bump: u8,
    pub authority: Pubkey,
    pub switchboard_function: Pubkey,
}

#[repr(packed)]
#[zero_copy(unsafe)]
pub struct OracleData {
    pub oracle_timestamp: i64,
    pub price: u64
}

#[derive(Copy, Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub struct OracleDataBorsh {
    pub oracle_timestamp: i64,
    pub price: u64
}
impl From<OracleDataBorsh> for OracleData {
    fn from(value: OracleDataBorsh) -> Self {
        Self {
            oracle_timestamp: value.oracle_timestamp,
            price: value.price
        }
    }
}

#[derive(Copy, Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub struct OracleDataWithTradingSymbol {
    pub symbol: TradingSymbol,
    pub data: OracleDataBorsh,
}

impl OracleData {
    pub fn get_fair_price(&self) -> anchor_lang::Result<f64> {
        // Check the price was updated in the last 10 seconds

        // Do some logic here based on the twap

        let price: f64 = SwitchboardDecimal {
            mantissa: self.price as i128,
            scale: 9,
        }
        .try_into()?;

        Ok(price)
    }
}

#[repr(packed)]
#[account(zero_copy(unsafe))]
pub struct MyOracleState {
    pub bump: u8,
    pub srfx_usdc: OracleData,
    // can always re-allocate to add more
    // pub reserved: [u8; 2400],
}

impl MyOracleState {
    pub fn save_rows(&mut self, rows: &[OracleDataWithTradingSymbol]) -> anchor_lang::Result<()> {
        for row in rows.iter() {
            match row.symbol {
                TradingSymbol::Srfx_usdc => {
                    self.srfx_usdc = row.data.into();
                    msg!("price: {}", { self.srfx_usdc.price });
                }
                _ => {
                    msg!("no trading symbol found for {:?}", row.symbol);
                    // TODO: emit an event so we can detect and fix
                }
            }
        }

        Ok(())
    }
}

#[repr(u8)]
#[derive(Copy, Clone, Default, Debug, Eq, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum TradingSymbol {
    #[default]
    Unknown = 0,
    Srfx_usdc = 1
}

unsafe impl Pod for TradingSymbol {}
unsafe impl Zeroable for TradingSymbol {}

impl From<TradingSymbol> for u8 {
    fn from(value: TradingSymbol) -> Self {
        match value {
            TradingSymbol::Srfx_usdc => 1,
            _ => 0,
        }
    }
}
impl From<u8> for TradingSymbol {
    fn from(value: u8) -> Self {
        match value {
            1 => TradingSymbol::Srfx_usdc,
            _ => TradingSymbol::Unknown,
        }
    }
}
