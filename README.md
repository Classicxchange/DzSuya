# DzSuya

A mobile-first ordering app for DzSuya (Professor Dozzie's), a suya stand on Woji Road, Port Harcourt. Customers browse the menu, customise their order, pay in USDC on Arc Testnet and get a digital receipt with a QR code and a live order status. The shop owner has a wallet-protected dashboard to move orders from confirmed to preparing to ready.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Menu with sizes, spice levels, extras, quantity and special instructions
- Wallet connection with automatic prompt to add or switch to Arc Testnet
- USDC payment straight to the shop wallet
- Full-screen receipt with transaction link, timestamp, QR code, copy and share
- Order history that follows your wallet across devices
- Live status: Order confirmed, Preparing, Ready for pickup
- Seller dashboard, available only to the shop wallet
- DZ ID: claim a short name for your wallet (one per wallet, permanent) and get paid in USDC by anyone who types it; payments go through the DZ ID contract and reach the wallet in the same transaction, and shareable pay links open the send form
- Prices shown in your own currency (about 160 currencies) using live exchange rates from [Exchange Rate API](https://www.exchangerate-api.com); you always pay in USDC

## Tech stack

React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit, Solidity (Foundry).

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://getfoundry.sh).

```bash
bun install
bun run dev
```

Other commands:

```bash
bun run check            # lint and typecheck
bun run contracts:build  # compile the contract
bun run contracts:test   # run contract tests
```

### Environment variables

- `VITE_SUYA_SHOP_ADDRESS`: address of the deployed shop contract on Arc Testnet.
- `VITE_DZID_ADDRESS`: address of the deployed DZ ID registry on Arc Testnet.
- `VITE_DZID_DEPLOY_BLOCK`: block the registry was deployed at (where payment history scans start). Optional.
- `VITE_SUYA_DEPLOY_BLOCK`: block the contract was deployed at (used to look up transaction hashes for shared receipts). Optional.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: provisioned by Arc Studio, optional elsewhere.

## Using the app

Get test USDC on Arc Testnet, connect a wallet and order. To manage orders, connect the shop wallet that was set when the contract was deployed and open the Seller tab.

## Photo credits

Menu photos come from Wikimedia Commons and are cropped and resized for display:

- Beef suya: "Steak Suya.jpg" by Wikipedianaija, CC BY-SA 4.0
- Chicken suya: "Chicken suya also known as kebab.jpg" by Nakandealiyu, CC BY-SA 4.0
- Goat: "Peppered goat meat.jpg" by Omolarabasirat, CC BY-SA 4.0
- Fish: "Street Barbecue Catfish.jpg" by Aderiqueza, CC BY-SA 4.0
- Mixed suya: "SuyavarietiesTX.JPG" by WhisperToMe, CC0
- Street grill scene: "Sichimedia5.jpg" by Sichi Media, CC BY-SA 4.0

The credits are also kept next to the images in `public/images/CREDITS.txt`.
