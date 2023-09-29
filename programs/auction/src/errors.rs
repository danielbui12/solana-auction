use anchor_lang::prelude::*;

#[error_code]
pub enum AuctionError {
    #[msg("The price given is not valid.")]
    InvalidPrice,
    #[msg("The offered price must be higher than the current price.")]
    LowerPrice,
    #[msg("This auction sesstion has ended.")]
    EndedAuction,
    #[msg("Winner already exists.")]
    WinnerAlreadyExists,
    #[msg("Can't choose a winner when there is no bidder.")]
    NoBidder,
    #[msg("Reward balance is zero.")]
    InvalidRewardBalance,
}
