# Auction Smart contract on Solana
## How to run test

### Installing packages

> Make sure you've installed [solana-cli](https://docs.solana.com/cli/install-solana-cli-tools), [anchor](https://www.anchor-lang.com/docs/installation), configured your solana-cli's RPC URL to localhost by following commands:

If you are new to Solana, you can run this command to generate new keypair:
```sh
solana config set --keypair "<path-to-your-keypair>.json"
```

then configure your `solana-cli`
```sh
solana config set --keypair "<path-to-your-keypair>.json"
solana config set --url http://127.0.0.1:8899
```

### Start hacking:

> Optional, if you want to see log of transactions, you can do by "Open a new terminal and run `solana logs`"

0. Update your keypair path in file `Anchor.toml` at `[provider] > wallet` and `utils/secret.ts`
1. Run `anchor build`, this will add a new keypair to `target/deploy`
2. Run `anchor keys list`, this will give you the new program id
3. Copy the new id, and paste it into:
- Set `declare_id!` in `programs/auction/src/lib.rs`
- Set the `programAddress` variable in `tests/auction.test.ts` 
- Set the `[programs.localnet] > auction` variable in `Anchor.toml` 
4. Run `anchor build` again
5. Run `anchor test --skip-local-validator`

## How to deploy smart contract

### Preparing

Update RPC to Solana devnet 

```sh
solana config set --url https://api.devnet.solana.com
```

Faucet SOL to pay for gas

```sh
solana airdrop 5 # maximum amount per airdrop is 5
solana balance
```

Configure variables in `Anchor.toml`
- `[programs.devnet]`
- `[registry]`
- `[provider]`

Update program ID on Nextjs app at `app/utils/constants.js`

### Deploying

1. Run `anchor deploy`
2. `cd app && yarn dev` and direct to `http://localhost:3000` to see UI 

## Cheese!