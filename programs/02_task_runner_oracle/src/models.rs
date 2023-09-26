use crate::*;

#[account(zero_copy(unsafe))]
pub struct MyProgramState {
    pub bump: u8,
    /// The account delegated to manage the program and make config changes.
    pub authority: Pubkey,
    /// The oracle's pubkey
    pub oracle: Pubkey,
    /// The Switchboard Function authorized to 'write' oracle updates to our oracle state.
    pub switchboard_function: Pubkey,
    // Here you could have a mapping between the oracle offset and some oracle consumer like a market.
}

// This should be a keypair account so we arent limited by space
// space = 8 + (1672 * 1000) = 1672000
#[repr(packed)]
#[account(zero_copy(unsafe))]
pub struct MyOracleState {
    // Config
    // /// The current number of feeds supported.
    // pub num_feeds: u32,
    // /// The maximum number of feeds that can be supported.
    // pub max_feeds: u32,

    // Data
    pub feeds: [DataFeed; MAX_NUM_DATA_FEEDS],
}

// Is i128 the best type for this?
// u64 might be good enough.
#[repr(packed)]
#[zero_copy(unsafe)]
#[derive(Default)]
pub struct DataFeedHistoryRow {
    /// The data feed result.
    pub value: u64,
    /// The unix timestamp when the feed was last updated.
    pub timestamp: i64,
}

// space = 1672 bytes = 72 + (100 * 16)
#[repr(packed)]
#[zero_copy(unsafe)]
pub struct DataFeed {
    // Config
    /// Name of the feed.
    pub name: [u8; 32],
    /// IPFS hash of the job definition
    pub ipfs_hash: [u8; 32],
    /// The target update interval of the feed. Used to determine if the feed is stale.
    pub update_interval: u32,

    // History
    /// The current idx of the history buffer.
    pub history_idx: u32,
    /// The stored results for this feed.
    pub history: [DataFeedHistoryRow; DATA_FEED_HISTORY_SIZE],
}
impl Default for DataFeed {
    fn default() -> Self {
        Self {
            name: [0u8; 32],
            ipfs_hash: [0u8; 32],
            update_interval: 0,
            history_idx: 0,
            history: [Default::default(); DATA_FEED_HISTORY_SIZE],
        }
    }
}
impl DataFeed {
    pub fn save_result(&mut self, result: u64) -> anchor_lang::Result<()> {
        let curr_history_idx = self.history_idx as usize;
        let history_idx = curr_history_idx + 1 % DATA_FEED_HISTORY_SIZE;

        self.history[history_idx] = DataFeedHistoryRow {
            value: result,
            timestamp: Clock::get()?.unix_timestamp,
        };
        self.history_idx = history_idx as u32;

        // TODO: calculate the median from the last 9 samples
        // TODO: calculate the TWAP from the last 9 samples

        Ok(())
    }
}
