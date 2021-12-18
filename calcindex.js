/**
  Compute various crypto market indices for each day.
*/

import _ from "lodash";

import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getMarketDataOn } from "./lib.js";
import { STABLECOIN_IDS, DERIVATIVE_IDS } from "./constants.js";


// Get a list of all the timestamps we've tracked. Pull up the oldest coin
// (Bitcoin) and extract its list of timestamps.
const timestamps = getHistoricalData("bitcoin").map(record => record.timestamp);

/**
  Returns a list of data for all the "normal" (non-stable, non-derivative)
  cryptocurrencies on the given timestamp, sorted by market cap
  descending.
*/
export function calcMarketDataOn(timestamp) {
  // Get the crypto market caps for this day
  const rawMarketData = getMarketDataOn(timestamp);
  // console.log(marketData);

  // Exclude stablecoins & leveraged coins since those aren't really "true"
  // underlying cryptos.
  const cleanedMarketData = rawMarketData
    .filter(record => STABLECOIN_IDS.indexOf(record.coinId) === -1)
    .filter(record => DERIVATIVE_IDS.indexOf(record.coinId) === -1);

  // console.log(cleanedMarketData);

  // Sort the market data by market cap descending .
  // _.sortBy sorts ascending, so multiply it by -1 to flip to descending.
  const sortedMarketData = _.sortBy(cleanedMarketData,
    record => record.marketCap * -1);

  return sortedMarketData;
}

/**
  Calculates the market-cap-weighted average of the top N crypto's on
  the given day, given the market data from calcMarketDataOn().
*/
export function calcMarketCapWeightedIndex(sortedMarketData, topN) {
  // Get just the top N of these
  const topCoins = sortedMarketData.slice(0, topN);

  // Now compute a weighted average of their market caps. That's just the
  // sum of their market caps!
  const weightedAverage = _.sumBy(topCoins, record => record.marketCap);

  // Now we need to divide by a certain "magic number" to make this value
  // a little more tractable to look at. This number is the sum of all
  // crypto market caps, and we know that right now it's roughly in the
  // low trillions (~2E12) so let's divide by 1E9 so the index is in the
  // low thousands
  const DIVISOR = 1e9;

  return weightedAverage / DIVISOR;
}

const marketData = calcMarketDataOn(dateToTimestamp("December 1, 2021"));
console.log(calcMarketCapWeightedIndex(marketData, 10));
console.log(calcMarketCapWeightedIndex(marketData, 20));
console.log(calcMarketCapWeightedIndex(marketData, 50));
console.log(calcMarketCapWeightedIndex(marketData, 100));
console.log(calcMarketCapWeightedIndex(marketData, 200));
console.log(calcMarketCapWeightedIndex(marketData, 500));
