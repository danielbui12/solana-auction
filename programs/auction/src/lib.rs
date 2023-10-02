use anchor_lang::{
    prelude::*,
    solana_program::{
        clock::Clock, program::invoke, system_instruction::transfer,
    },
};

mod constants;
mod errors;
mod states;
use crate::{constants::*, errors::*, states::*};

// declare_id!("7QWxoHUMnEJAWr2LxpBzSKSgD9us2thCMeMZuiPRA9Ns");
declare_id!("Em2iU1X286qZ6Mii2B6Bh8EK863nTKhSep8cJdH7PeXE");

#[program]
mod auction {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        starting_price: u64,
        end_date: u64,
        data: String,
    ) -> Result<()> {
        let auction: &mut Account<Auction> = &mut ctx.accounts.auction;
        let master: &mut Account<Master> = &mut ctx.accounts.master;

        // increment the ticket id
        master.last_id = master.last_id.checked_add(1).unwrap();

        // set auction values
        auction.id = master.last_id;
        auction.starting_price = starting_price;
        auction.authority = ctx.accounts.authority.key();
        auction.end_date = end_date;
        auction.data = data;

        Ok(())
    }

    pub fn bidding(ctx: Context<Bidding>, auction_id: u32, _price: u64) -> Result<()> {
        let auction: &mut Account<Auction> = &mut ctx.accounts.auction;
        let bidder: &mut Account<Bidder> = &mut ctx.accounts.bidder;
        let prev_bidder: &mut Account<Bidder> = &mut ctx.accounts.prev_bidder;
        let authority: &mut Signer = &mut ctx.accounts.authority;

        let current_timestamp = Clock::get()?.unix_timestamp as u64;

        if auction.winner_id.is_some() || auction.end_date < current_timestamp {
            return err!(AuctionError::EndedAuction);
        }

        if _price < auction.starting_price && _price < auction.current_price {
            return err!(AuctionError::InvalidPrice);
        }

        // Transfer SOL to Auction PDA
        invoke(
            &transfer(&authority.key(), &auction.key(), _price),
            &[
                authority.to_account_info(),
                auction.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // reward to previous bidder
        if auction.last_bidder_id > 0 {
            prev_bidder.reward_amount = prev_bidder
                .reward_amount
                .checked_add(auction.current_price)
                .unwrap();
        }

        // save info bidder
        auction.last_bidder_id += 1;
        auction.current_price = _price;
        bidder.id = auction.last_bidder_id;
        bidder.authority = authority.key();
        bidder.auction_id = auction_id;

        Ok(())
    }

    pub fn pick_winner(ctx: Context<PickWinner>, _auction_id: u32) -> Result<()> {
        let auction: &mut Account<Auction> = &mut ctx.accounts.auction;

        if auction.winner_id.is_some() {
            return err!(AuctionError::WinnerAlreadyExists);
        }

        if auction.last_bidder_id == 0 {
            return err!(AuctionError::NoBidder);
        }

        let winner_id: u32 = auction.last_bidder_id;
        auction.winner_id = Some(winner_id);
        // // leave this for now
        // auction.rewarded = true;

        Ok(())
    }

    pub fn claim_reward(
        ctx: Context<ClaimReward>,
        _auction_id: u32,
        _bidder_id: u32,
    ) -> Result<()> {
        let auction: &mut Account<Auction> = &mut ctx.accounts.auction;
        let bidder: &mut Account<Bidder> = &mut ctx.accounts.bidder;
        let authority: &mut Signer = &mut ctx.accounts.authority;

        if bidder.reward_amount > 0 {
            return err!(AuctionError::InvalidRewardBalance);
        }

        let amount: u64 = bidder.reward_amount;
        bidder.reward_amount = 0;

        // reward to account
        **auction.to_account_info().try_borrow_mut_lamports()? -= amount;
        **authority.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = signer, space = 4 + 8, seeds = [MASTER_SEED], bump)]
    pub master: Account<'info, Master>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateAuction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 32 + 8 + 5 + 16 + 24 + 1 ,
        seeds = [AUCTION_SEED, &(master.last_id + 1).to_le_bytes()],
        bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 32 + 4 + 8 + 8,
        seeds = [
            BIDDER_SEED,
            auction.key().as_ref(),
            &(auction.last_bidder_id).to_le_bytes()
        ],
        bump,
    )]
    pub _dump_bidder: Account<'info, Bidder>,

    #[account(mut, seeds = [MASTER_SEED], bump)]
    pub master: Account<'info, Master>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(auction_id: u32)]
pub struct Bidding<'info> {
    #[account(
        mut,
        seeds = [AUCTION_SEED, &auction_id.to_le_bytes()],
        bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [
            BIDDER_SEED,
            auction.key().as_ref(),
            &(auction.last_bidder_id).to_le_bytes()
        ],
        bump,
    )]
    pub prev_bidder: Account<'info, Bidder>,

    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 32 + 4 + 8 + 8,
        seeds = [
            BIDDER_SEED,
            auction.key().as_ref(),
            &(auction.last_bidder_id + 1).to_le_bytes()
        ],
        bump,
    )]
    pub bidder: Account<'info, Bidder>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_auction_id: u32)]
pub struct PickWinner<'info> {
    #[account(
        mut,
        seeds = [AUCTION_SEED, &_auction_id.to_le_bytes()],
        bump,
        has_one = authority,
    )]
    pub auction: Account<'info, Auction>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_auction_id: u32, _bidder_id: u32)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        seeds = [AUCTION_SEED, &_auction_id.to_le_bytes()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [
            BIDDER_SEED,
            auction.key().as_ref(),
            &_bidder_id.to_le_bytes(),
        ],
        bump,
        has_one = authority,
    )]
    pub bidder: Account<'info, Bidder>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
