# [App Name]

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## Share links

- Starter apps already ship `getShareBase`, `buildShareLink` and `installShareSync` in `src/lib/share.ts`; import them instead of rewriting them.
- Keep shareable state in the URL path or query, not in the `#fragment`.
- Never put a secret (private key, claim secret, seed phrase, session token, API key) in the URL path or query, encoded or not: every in-app path and query is mirrored to the visitor's studio.arc.io address bar and browser history and reaches servers. A bearer claim secret goes only in the `#fragment` appended to the share link (`` `${await buildShareLink('/claim')}#${secret}` ``) and is read from `location.hash` on load. A link to the app's own share URL shown inside the app must be copy-only or open in a new tab with `target="_blank" rel="noopener noreferrer"`.
- Build every link a user copies or sends with `buildShareLink()` from `src/lib/share.ts`.
- Keep the `installShareSync()` call in `src/main.tsx` when editing it; it keeps the Studio address bar in step with in-app navigation.
- Navigate inside the app with relative links.

## To Run

```bash
bun install
bun run dev
```

## DzSuya (Professor Dozzie's Suya) deployment notes

- Contract: `contracts/SuyaShop.sol`, deployed on Arc Testnet at 0x4d51e63a14d681be06ac1c320bc4d120d45091f1 (block 70402726).
- Constructor: (USDC 0x3600000000000000000000000000000000000000, shop wallet 0xf30173e31cb9b6a7234f4318b4a0183324bca743). The shop wallet receives all payments and is the only wallet that can update order status. The shop moves to another wallet only through a two-step handover (`proposeShop`, then `acceptShop` from the new wallet).
- Frontend reads `VITE_SUYA_SHOP_ADDRESS` and `VITE_SUYA_DEPLOY_BLOCK` from `.env`. Prices are computed in the frontend (`src/lib/menu.ts`) and not enforced onchain.
- Payment flow: USDC approve (exact total) then `placeOrder(amount, details)`. Order details are compact JSON stored onchain; receipts are read from the contract.

## DZ ID

- Contract: `contracts/DzID.sol` on Arc Testnet at 0xf323d9703ad7229266493f7580f22a3a4a1a52bf (block 70402716). Constructor arg: USDC 0x3600000000000000000000000000000000000000.
- Names: 3 to 20 chars, a-z 0-9 underscore (not at the start or end), permanent, one per wallet. Claiming is commit/reveal (`commit`, wait 6 seconds, `claim(name, salt)`) so names cannot be sniped; the salt is kept in localStorage until the claim completes. `sendToName` pulls USDC into the contract and forwards it to the owner in the same transaction (needs a USDC allowance to the DzID contract).
- Env: `VITE_DZID_ADDRESS`, `VITE_DZID_DEPLOY_BLOCK`. Pay links use `/?pay=<name>`.
- UI: `src/components/DzIdView.tsx`, `src/components/dz/*`, hooks `src/hooks/useDzId.ts`, `src/hooks/useDzActions.ts`.

## Security notes

- `.env` is gitignored and must never be committed; `.env.example` lists the public variables. Only public values may use the `VITE_` prefix.
- Order prices are computed in the frontend, not enforced by the contract. The seller view and receipt flag any order whose amount differs from the menu price of its items.
- Contracts were reviewed with a full-severity pass (rule corpus plus functional review) and Slither before the latest deploy. Previous deployments (SuyaShop 0xe431c6…90f0, DzID 0x3be0a5…6e95e) are superseded.

## Routing

- `/` is the landing page (`src/components/landing/`). The app lives under `/?app=<menu|orders|dzid|seller>`; `/?order=<id>` opens a receipt and `/?pay=<name>` opens the DZ ID send form. Routing is in `src/App.tsx` (`readRoute`).
