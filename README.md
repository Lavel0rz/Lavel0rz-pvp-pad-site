# PvP Pad website

The website for **PvP Pad v3** on Robinhood Chain (chain 4663): a launchpad where every launch is a 50-minute Pepito game, and every game ends in a coin.

It is a static site. It has no backend and no indexer and holds no keys. Every number on it is read live from the contracts through the public RPC.

## Contracts (PvP Pad v3)

| Contract | Address |
|---|---|
| PvPPad | `0xf425c5130208847f2e8422e35bcd37dcb7540bc5` |
| PadLiquidity | `0x3ebbe5148eb9a2c45c5d2206dd9b8d9bf7ef7700` |
| KingOfThePad | `0xafb61b177e7522c748f9b3e138843a39ac189b37` |
| PadGame (template) | `0x82c032a933bf351c3b14d356b694e63f3cbb51eb` |
| PadToken (template) | `0x6870b7777e30a3f152a5bb6476d1152211a017f0` |

Source: [launch-1764-pvp-pad-v3-robinhood](https://github.com/identity-md-launches/launch-1764-pvp-pad-v3-robinhood) at `c3a2fac`. The deployment details are in `deploy/v3-deployment.json`.

Before it sends any transaction, the site checks that the code at each address matches that build, with immutables masked (`public/verification.json`).

## Layout

```
public/        static files copied as-is (index.html, style.css, config.json, abi.json, fonts, assets)
src/           TypeScript: app.ts (pages), data.ts (chain reads), board.ts (rhombus + Pepitos), wallet.ts, math.ts
third_party/   ethers 6.15.0, the official upstream bundle, bundled INTO app.js at build time
scripts/       build, typecheck, unit tests, ABI/hash regeneration, social card
tests/         headless-browser end-to-end tests against a mock chain
dist/          the built site: this folder is what gets hosted
```

## Build and test

```sh
npm install          # esbuild, typescript, playwright (devDependencies)
npm run build        # -> dist/
npm run typecheck
npm test             # unit tests
npm run test:browser # end-to-end in headless Chromium against a mock chain
```

`dist/` is committed so it can be hosted without a build step. It is self-contained and uses relative paths only. ethers is bundled inside `app.js`, so there is no separate library file that a partial upload could drop. The Coinbase Smart Wallet module (`vendor/coinbase.js`) loads only when someone picks that wallet.

## Hosting

Host the `dist/` folder exactly as committed: every file, unchanged, served from the site root. After hosting, check that each of these loads with HTTP 200 and is not an HTML error page: `index.html`, `app.js`, `salt-worker.js`, `style.css`, `config.json`, `abi.json`, `verification.json`, `fonts/*`, `assets/*`, `vendor/coinbase.js`.

## Changing things

- **Text and pages:** `src/app.ts`. **Styles:** `public/style.css`. **Board and Pepito sprites:** `src/board.ts`.
- **Addresses and RPC:** `public/config.json`.
- **New contract deployment:** build the contracts with Foundry, then run `node scripts/abi.mjs <contracts>/out deploy/<deployment>.json` to regenerate `abi.json` and `verification.json`.
- Then run `npm run build` and commit `dist/`.

## Credits

The board layout comes from [The Spireth](https://github.com/Lavel0rz/Spireth) (MIT). The Pepitos (original pixel frogs), tiles, icons and social card are original. Fonts are Geist and Geist Mono (OFL). ethers is MIT; its license is in `third_party/ethers/`.

Experimental contracts, reviewed by IMD's agent swarm but not independently audited. You can lose everything you put in. Not financial advice.
