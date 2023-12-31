use anchor_lang::prelude::*;

#[account]
pub struct Master {
    pub last_id: u32,
}

#[account]
pub struct Auction {
    pub id: u32,
    pub authority: Pubkey,
    pub starting_price: u64,
    pub current_price: u64,
    pub winner_id: Option<u32>,
    pub end_date: u64,
    pub data: String,
    pub rewarded: bool,
    pub last_bidder_id: u32,
}

#[account]
pub struct Bidder {
    pub id: u32,
    pub authority: Pubkey,
    pub auction_id: u32,
    pub reward_amount: u64,
}
