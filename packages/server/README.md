# MobyMask Server

To start `npm start`

To re-deploy, `rm config.json && npm start`.

Requires a `secrets.json` with a `mnemonic` / `privateKey` and `rpcUrl` to target.

Exposes its own JSON-RPC API, defined by `openrpc.json`.

Spins up a ganache by default, but if you set `ENV=PROD` it will spin up pointing to the RPC endpoint set in `secrets.json` instead. Eg. `ENV=PROD npm start`
