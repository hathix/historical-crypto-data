import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps } from "./lib.js";
import { calcMarketDataOn } from "./calcindex.js";

import _ from "lodash";


/**
  Returns data on the top N coins by market cap on the given timestamp.
*/
export function getTopNCoinsOn(n, timestamp) {
  // Get the full list of coins on this day, sorted by market cap descending
  const coinListSorted = calcMarketDataOn(timestamp);

  // Get just the top N of these
  const topNCoins = coinListSorted.slice(0, n);

  return topNCoins;
}

/**
  If you bought a certain number of dollars of the given coin, how many
  would you own? This returns a new coinData object that adds a "holdings" field.
*/
export function computeHoldingsOf(coinData, dollarsToBuy) {
  // Clone the object
  const newCoinData = _.clone(coinData);

  // Add a new field that's simply the dollars divided by the price
  newCoinData.numCoinsHeld = dollarsToBuy / newCoinData.price;
  // Also report the original cost basis, just so we have it
  newCoinData.costBasis = dollarsToBuy;

  // OK we're good
  return newCoinData;
}


// export function
// console.log(getTopNCoinsOn(10, 1639785600000).map(c => computeHoldingsOf(c, 1000)));

export function run() {
  // Get the oldest data we have
  const timestampsAvailable = getAllSupportedTimestamps();
  const oldestTimestamp = timestampsAvailable[0];

  // Now let's imagine we bought the top 100 coins available then
  const topCoinsOnOldestDay = getTopNCoinsOn(100, oldestTimestamp);

  // Let's imagine we bought, say, $1000 of each
  const ourHoldings = topCoinsOnOldestDay.map(coinData =>
    computeHoldingsOf(coinData, 1000));

  // Print what we'd have
  console.log(ourHoldings);
}


run();
