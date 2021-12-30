import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv } from "./lib.js";
import { calcMarketDataOn } from "./calcindex.js";

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

// export function
console.log(getTopNCoinsOn(10, 1639785600000));
