/**
  The IDs of all the known stablecoins... at least the major ones.
*/
export const STABLECOIN_IDS = [
  "tether",
  "usd-coin",
  "binance-usd",
  "dai",
  "terrausd",
  "magic-internet-money",
  "frax",
  "true-usd",
  "liquity-usd",
  "fei-usd",
  "husd",
  "alchemix-usd",
  "usdx",
  "nusd",
  "musd",
  "gemini-dollar",
  "origin-dollar",
  "celo-dollar",
  "paxos-standard",
  "neutrino",
  "iron-bank-euro",
  "celo-euro",
  "seur",
  "stasis-eurs",
  // Several of the below coins are hilariously bad. Nominally
  // stablecoins, they've often collapsed and are now worth like
  // 10 cents.
  "usdx",
  "dollars",
  "empty-set-dollar",
  "defidollar",
  "dynamic-set-dollar",
  "steem-dollars",
];

/**
  The IDs of all known derivative (leveraged, etc.) coins.
*/
export const DERIVATIVE_IDS = [
  "interest-bearing-bitcoin",
  "eth-2x-flexible-leverage-index",
  "seth",
  "seth2",
  "obtc",
  "huobi-btc",
  "renbtc",
  "sbtc",
  "btc-standard-hashrate-token",
  "staked-ether",
  "ankreth",
  "wrapped-bitcoin",
  // "wrapped-nxm",
  "nxm", // This is an internal-only token that can't be traded;
         // wrapped-nxm is the equivalent that can be traded
  "wrapped-centrifuge",
  "compound-ether",
  "compound-usd-coin",
  "compound-usdt",
  "compound-basic-attention-token",
  "compound-uniswap",
  "compound-0x",
  "cdai",
  "defipulse-index",
  "lido-staked-sol",
  "msol",
  "tether-gold",
  "tether-eurt",
];

// Same as above, but regexes to catch consistently-named tokens
export const STABLECOIN_REGEXES = [
  // Catch some easy-to-find USD coins
  /-usd$/i,
  /-eur$/i,
];

export const DERIVATIVE_REGEXES = [
  // Ignore Mirrored coins
  /^mirrored-/i,
  // Ignore Compound coins, besides the native compound governance token
  /^compound-(?!governance)/i,
  // And wrapped coins
  /wrapped-/i,
];
