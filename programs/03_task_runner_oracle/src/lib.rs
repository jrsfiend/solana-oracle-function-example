#![allow(clippy::result_large_err)]
// Program: Solana Basic Oracle
// This Solana program will allow you to peridoically relay information from Binance to your
// program and store in an account. When a user interacts with our program they will reference
// the price from the previous push.
// - initialize:        Initializes the program and creates the accounts.
pub use switchboard_solana::prelude::*;
use raydium_amm_v3::states::POSITION_SEED;
use raydium_amm_v3::states::TICK_ARRAY_SEED;
use raydium_amm_v3::states::ProtocolPositionState;
use raydium_amm_v3::states::PersonalPositionState;
use raydium_amm_v3::states::PoolState;
use crate::anchor_spl::token::Approve;
use crate::anchor_spl::token::Transfer;
pub mod models;
pub use models::*;

declare_id!("C4cm9mYew1kS6N6woKquiVs1TUUEgvbHm5fm9985oM7v");

/// The seed used to derive the global program state PDA.
pub const PROGRAM_SEED: &[u8] = b"TASKRUNNERORACLE";

/// The maximum number of data feeds the oracle can support.
pub const MAX_NUM_DATA_FEEDS: usize = 1000;

// Store 100 samples for each data feed, along with their updated timestamp
pub const DATA_FEED_HISTORY_SIZE: usize = 100;

// Store 9 digits of precision for each data feed sample.
// Fixed precision makes it easiser to manage and scale.
// Dynamic scales = unpredictable gas/compute costs.
pub const DATA_FEED_PRECISION: usize = 9;

#[program]
pub mod task_runner_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> anchor_lang::Result<()> {
        let program = &mut ctx.accounts.program.load_init()?;
        program.bump = *ctx.bumps.get("program").unwrap();
        program.authority = ctx.accounts.authority.key();
        program.oracle = ctx.accounts.oracle.key();

        // Optionally set the switchboard_function if provided
        program.switchboard_function = ctx.accounts.switchboard_function.key();

        ctx.accounts.oracle.load_init()?;
        // oracle.max_feeds = MAX_NUM_DATA_FEEDS as u32;

        Ok(())
    }
    pub fn update_program(ctx: Context<UpdateProgram>) -> anchor_lang::Result<()> {
        let program = &mut ctx.accounts.program.load_mut()?;
        program.switchboard_function = ctx.accounts.switchboard_function.key();
        Ok(())
    }
    pub fn add_feed(ctx: Context<AddFeed>, params: AddFeedParams) -> anchor_lang::Result<()> {
        // Params validation
        if params.name.len() > 32 {
            return Err(error!(OracleError::ArrayOverflow));
        }
        // IPFS hash is always required to add a feed
        if params.ipfs_hash.len() != 32 {
            return Err(error!(OracleError::ArrayOverflow));
        }

        let mut name = [0u8; 32];
        name[0..params.name.len()].clone_from_slice(&params.name);

        let mut ipfs_hash = [0u8; 32];
        ipfs_hash.clone_from_slice(&params.ipfs_hash);

        let oracle = &mut ctx.accounts.oracle.load_mut()?;

        // let idx: usize = if let Some(idx) = params.idx {
        //     idx as usize
        // } else {
        //     oracle.num_feeds as usize + 1
        // };

        let idx: usize = params.idx as usize;

        if idx > MAX_NUM_DATA_FEEDS {
            return Err(error!(OracleError::ArrayOverflow));
        }

        if oracle.feeds[idx].ipfs_hash != [0u8; 32] {
            return Err(error!(OracleError::DataFeedExistsAtIdx));
        }

        oracle.feeds[idx] = DataFeed {
            name,
            ipfs_hash,
            update_interval: params.update_interval,
            history_idx: 0,
            history: [Default::default(); DATA_FEED_HISTORY_SIZE],
        };

        Ok(())
    }    
    pub fn open_position(
        ctx: Context<RemoveFeed>,
        tick_lower_index: i32,
        tick_upper_index: i32,
        tick_array_lower_start_index: i32,
        tick_array_upper_start_index: i32,
        liquidity: u128,
        amount_0_max: u64,
        amount_1_max: u64,
    ) -> anchor_lang::Result<()> {
        // cpi into raydium_amm_v3 and use authority_seeds [PROGRAM_SEED] to derive the authority for invoke_signed
        let cpi_program = ctx.accounts.raydium_amm_v3_program.clone();
    
        let cpi_accounts = raydium_amm_v3::cpi::accounts::OpenPosition {
            payer: ctx.accounts.program.to_account_info(),
            position_nft_owner: ctx.accounts.program.to_account_info(),
            position_nft_mint: ctx.accounts.position_nft_mint.to_account_info(),
            position_nft_account: ctx.accounts.position_nft_account.to_account_info(),
            metadata_account: ctx.accounts.metadata_account.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            protocol_position: ctx.accounts.protocol_position.to_account_info(),
            tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
            tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
            personal_position: ctx.accounts.personal_position.to_account_info(),
            token_account_0: ctx.accounts.token_account_0.to_account_info(),
            token_account_1: ctx.accounts.token_account_1.to_account_info(),
            token_vault_0: ctx.accounts.token_vault_0.to_account_info(),
            token_vault_1: ctx.accounts.token_vault_1.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
            metadata_program: ctx.accounts.metadata_program.to_account_info(),

        };
        // MyProgramState is signing
        let program_bump = ctx.accounts.program.load()?.bump;
        let seeds = &[PROGRAM_SEED.as_ref(), &[program_bump]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        raydium_amm_v3::cpi::open_position(
            cpi_ctx,
            tick_lower_index,
            tick_upper_index,
            tick_array_lower_start_index,
            tick_array_upper_start_index,
            liquidity,
            amount_0_max,
            amount_1_max,
        )?;

        // we're not done yet! we the program are currently owner of the position_nft.
        // first DelegateAccount to the pogram
        // then transfer the position_nft to the user

        // delegate
        
        let cpi_accounts = Approve {
            delegate: ctx.accounts.position_nft_account.to_account_info(),
            authority: ctx.accounts.program.to_account_info(),
            to: ctx.accounts.program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            cpi_accounts,
            signer,
        );
        anchor_spl::token::approve(cpi_ctx, 1)?;

        // transfer
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.position_nft_account.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
            authority: ctx.accounts.program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            cpi_accounts,
            signer,
        );
        anchor_spl::token::transfer(cpi_ctx, 1)?;


        Ok(())
    }

    pub fn remove_feed(
        ctx: Context<RemoveFeed>,
        idx: u32,
        ipfs_hash: Option<Vec<u8>>,
    ) -> anchor_lang::Result<()> {
        let oracle = &mut ctx.accounts.oracle.load_mut()?;

        if let Some(ipfs_hash_vec) = ipfs_hash.as_ref() {
            if ipfs_hash_vec.len() != 32 {
                return Err(error!(OracleError::ArrayOverflow));
            }
            let mut ipfs_hash = [0u8; 32];
            ipfs_hash.clone_from_slice(ipfs_hash_vec);

            if oracle.feeds[idx as usize].ipfs_hash != ipfs_hash {
                return Err(error!(OracleError::DataFeedHashMismatch));
            }
        } else if oracle.feeds[idx as usize].ipfs_hash == [0u8; 32] {
            return Err(error!(OracleError::DataFeedMissingAtIdx));
        };

        oracle.feeds[idx as usize] = Default::default();

        Ok(())
    }

    pub fn save_feed_result(
        ctx: Context<SaveFeedResult>,
        params: SaveFeedResultParams,
    ) -> anchor_lang::Result<()> {
        let oracle = &mut ctx.accounts.oracle.load_mut()?;

        oracle.save_result(params.idx as usize, params.result, params.ipfs_hash)?;

        msg!(
            "Data feed {} updated with result {}",
            params.idx,
            params.result
        );

        // msg!("Sanity check: {}", {
        //     oracle.feeds[params.idx as usize].history[0].value
        // },);

        Ok(())
    }

    pub fn save_feed_results(
        ctx: Context<SaveFeedResult>,
        params: Vec<SaveFeedResultParams>,
    ) -> anchor_lang::Result<()> {
        let oracle = &mut ctx.accounts.oracle.load_mut()?;
        for save_result in params {
            match oracle.save_result(
                save_result.idx as usize,
                save_result.result,
                save_result.ipfs_hash,
            ) {
                Ok(_) => {}
                Err(e) => {
                    msg!(
                        "failed to save feed result for idx {}: {:?}",
                        save_result.idx,
                        e
                    );
                }
            }
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        space = 8 + std::mem::size_of::<MyProgramState>(),
        payer = payer,
        seeds = [PROGRAM_SEED],
        bump
    )]
    pub program: AccountLoader<'info, MyProgramState>,

    #[account(zero)]
    pub oracle: AccountLoader<'info, MyOracleState>,

    pub authority: Signer<'info>,

    pub switchboard_function: AccountLoader<'info, FunctionAccountData>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct AddFeedParams {
    pub idx: u32,
    pub name: Vec<u8>,
    pub ipfs_hash: Vec<u8>,
    pub update_interval: u32,
}

#[derive(Accounts)]
#[instruction(params: AddFeedParams)] // rpc parameters hint
pub struct AddFeed<'info> {
    #[account(
        seeds = [PROGRAM_SEED],
        bump = program.load()?.bump,
        has_one = authority,
        has_one = oracle,
    )]
    pub program: AccountLoader<'info, MyProgramState>,

    #[account(mut)]
    pub oracle: AccountLoader<'info, MyOracleState>,

    pub authority: Signer<'info>,
}


#[derive(Accounts)]
pub struct UpdateProgram<'info> {
    #[account(mut,
        seeds = [PROGRAM_SEED],
        bump = program.load()?.bump,
        has_one = authority,
    )]
    pub program: AccountLoader<'info, MyProgramState>,

    pub switchboard_function: AccountLoader<'info, FunctionAccountData>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveFeed<'info> {
    #[account(
        seeds = [PROGRAM_SEED],
        bump = program.load()?.bump,
        has_one = authority,
        has_one = oracle,
    )]
    pub program: AccountLoader<'info, MyProgramState>,

    #[account(mut)]
    pub oracle: AccountLoader<'info, MyOracleState>,

    pub authority: Signer<'info>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SaveFeedResultParams {
    pub idx: u32,
    pub ipfs_hash: Option<Vec<u8>>,
    pub result: u64,
}

#[derive(Accounts)]
#[instruction(tick_lower_index: i32, tick_upper_index: i32,tick_array_lower_start_index:i32,tick_array_upper_start_index:i32)]
pub struct OpenPosition<'info> {
    #[account(
        init,
        space = 8 + std::mem::size_of::<MyProgramState>(),
        payer = payer,
        seeds = [PROGRAM_SEED],
        bump
    )]
    pub program: AccountLoader<'info, MyProgramState>,
    /// User account
    /// CHECK: any old uncheckedaccount
    #[account(mut)]
    pub user: UncheckedAccount<'info>,
    pub raydium_amm_v3_program: AccountInfo<'info>,
    /// Pays to mint the position
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Receives the position NFT
    pub position_nft_owner: UncheckedAccount<'info>,

    /// Unique token mint address
    #[account(
        init,
        mint::decimals = 0,
        mint::authority = pool_state.key(),
        payer = payer,
        mint::token_program = token_program,
    )]
    pub position_nft_mint: Box<Account<'info, Mint>>,

    /// Token account where position NFT will be minted
    #[account(
        init,
        associated_token::mint = position_nft_mint,
        associated_token::authority = position_nft_owner,
        payer = payer,
        token::token_program = token_program,
    )]
    pub position_nft_account: Box<Account<'info, TokenAccount>>,

    /// To store metaplex metadata
    /// CHECK: Safety check performed inside function body
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// Add liquidity for this pool
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    /// Store the information of market marking in range
    #[account(
        init_if_needed,
        seeds = [
            POSITION_SEED.as_bytes(),
            pool_state.key().as_ref(),
            &tick_lower_index.to_be_bytes(),
            &tick_upper_index.to_be_bytes(),
        ],
        bump,
        payer = payer,
        space = ProtocolPositionState::LEN
    )]
    pub protocol_position: Box<Account<'info, ProtocolPositionState>>,

    /// CHECK: Account to mark the lower tick as initialized
    #[account(
        mut,
        seeds = [
            TICK_ARRAY_SEED.as_bytes(),
            pool_state.key().as_ref(),
            &tick_array_lower_start_index.to_be_bytes(),
        ],
        bump,
    )]
    pub tick_array_lower: UncheckedAccount<'info>,

    /// CHECK:Account to store data for the position's upper tick
    #[account(
        mut,
        seeds = [
            TICK_ARRAY_SEED.as_bytes(),
            pool_state.key().as_ref(),
            &tick_array_upper_start_index.to_be_bytes(),
        ],
        bump,
    )]
    pub tick_array_upper: UncheckedAccount<'info>,

    /// personal position state
    #[account(
        init,
        seeds = [POSITION_SEED.as_bytes(), position_nft_mint.key().as_ref()],
        bump,
        payer = payer,
        space = PersonalPositionState::LEN
    )]
    pub personal_position: Box<Account<'info, PersonalPositionState>>,

    /// The token_0 account deposit token to the pool
    #[account(
        mut,
        token::mint = token_vault_0.mint
    )]
    pub token_account_0: Box<Account<'info, TokenAccount>>,

    /// The token_1 account deposit token to the pool
    #[account(
        mut,
        token::mint = token_vault_1.mint
    )]
    pub token_account_1: Box<Account<'info, TokenAccount>>,

    /// The address that holds pool tokens for token_0
    #[account(
        mut,
        constraint = token_vault_0.key() == pool_state.load()?.token_vault_0
    )]
    pub token_vault_0: Box<Account<'info, TokenAccount>>,

    /// The address that holds pool tokens for token_1
    #[account(
        mut,
        constraint = token_vault_1.key() == pool_state.load()?.token_vault_1
    )]
    pub token_vault_1: Box<Account<'info, TokenAccount>>,

    /// Sysvar for token mint and ATA creation
    pub rent: Sysvar<'info, Rent>,

    /// Program to create the position manager state account
    pub system_program: Program<'info, System>,

    /// Program to create mint account and mint tokens
    pub token_program: Program<'info, Token>,
    /// Program to create an ATA for receiving position NFT
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// Program to create NFT metadata
    /// CHECK: Metadata program address constraint applied
    pub metadata_program: UncheckedAccount<'info>,
    // remaining account
    // #[account(
    //     seeds = [
    //         POOL_TICK_ARRAY_BITMAP_SEED.as_bytes(),
    //         pool_state.key().as_ref(),
    //     ],
    //     bump
    // )]
    // pub tick_array_bitmap: AccountLoader<'info, TickArrayBitmapExtension>,
}
#[derive(Accounts)]
#[instruction(params: SaveFeedResultParams)] // rpc parameters hint
pub struct SaveFeedResult<'info> {
    #[account(
        seeds = [PROGRAM_SEED],
        bump = program.load()?.bump,
        has_one = switchboard_function,
        has_one = oracle,
    )]
    pub program: AccountLoader<'info, MyProgramState>,

    #[account(mut)]
    pub oracle: AccountLoader<'info, MyOracleState>,

    // We use this to verify the functions enclave state was verified successfully
    #[account(
        constraint =
                switchboard_function.load()?.validate(
                &enclave_signer.to_account_info()
            )? @ OracleError::FunctionValidationFailed
    )]
    pub switchboard_function: AccountLoader<'info, FunctionAccountData>,
    pub enclave_signer: Signer<'info>,
}

#[error_code]
#[derive(Eq, PartialEq)]
pub enum OracleError {
    #[msg("Invalid authority account")]
    InvalidAuthority,
    #[msg("Array overflow")]
    ArrayOverflow,
    #[msg("Data feed already exists at the provided idx.")]
    DataFeedExistsAtIdx,
    #[msg("Data feed does not exist at the provided idx.")]
    DataFeedMissingAtIdx,
    #[msg("Data feed at given idx has an unexpected ipfs hash")]
    DataFeedHashMismatch,
    #[msg("Stale data")]
    StaleData,
    #[msg("Invalid trusted signer")]
    InvalidTrustedSigner,
    #[msg("Invalid MRENCLAVE")]
    InvalidMrEnclave,
    #[msg("Failed to find a valid trading symbol for this price")]
    InvalidSymbol,
    #[msg("FunctionAccount pubkey did not match program_state.function")]
    IncorrectSwitchboardFunction,
    #[msg("FunctionAccount pubkey did not match program_state.function")]
    InvalidSwitchboardFunction,
    #[msg("FunctionAccount was not validated successfully")]
    FunctionValidationFailed,
}
