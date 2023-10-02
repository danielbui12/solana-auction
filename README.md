## How to run test

### Building step

0. Create a file named `wallet-keypair.json` and paste your wallet keypair in it. Make sure your wallet balance on Local net is approximately greater than 5.
1. Run `anchor build`, this will add a new keypair to `target/deploy`
2. Run `anchor keys list`, this will give you the new program id
3. Copy the id to the top of your `lib.rs`
4. Run `anchor build` again
5. `anchor deploy`


### Deploying script
```sh
anchor deploy
```

> Note: Anchor will be configured by following setting in `Anchor.toml`.