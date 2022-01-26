/**
  Compute various crypto market indices for each day.
*/

import _ from "lodash";

import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getMarketDataOn, excludeStablecoinsAndDerivatives } from "./lib.js";
import { STABLECOIN_IDS, DERIVATIVE_IDS } from "./constants.js";

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
  // const cleanedMarketData = rawMarketData
  //   .filter(record => STABLECOIN_IDS.indexOf(record.coinId) === -1)
  //   .filter(record => DERIVATIVE_IDS.indexOf(record.coinId) === -1);
  const cleanedMarketData = excludeStablecoinsAndDerivatives(
    rawMarketData);

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

/**
  Computes the index for each day we've tracked.
*/
export function generateIndexEveryDay() {
  // Get a list of all the timestamps we've tracked. Pull up the oldest coin
  // (Bitcoin) and extract its list of timestamps.
  const timestamps = getHistoricalData("bitcoin").map(record => record.timestamp);

  // Again ignore the final timestamp since that's an incomplete one
  // for like some random point in the day when we actually pulled the data
  const realTimestamps = timestamps.slice(0, -1);

  // Now, for each day, we will calculate several indices (market weighted only
  // for now).
  const indicesPerDay = realTimestamps.map(timestamp => {
    const marketData = calcMarketDataOn(timestamp);
    return {
      timestamp: timestamp,
      readableTimestamp: new Date(timestamp).toLocaleString(
        'en-US', { timeZone: 'UTC' }),
      top10: calcMarketCapWeightedIndex(marketData, 10),
      top20: calcMarketCapWeightedIndex(marketData, 20),
      top50: calcMarketCapWeightedIndex(marketData, 50),
      top100: calcMarketCapWeightedIndex(marketData, 100),
      top200: calcMarketCapWeightedIndex(marketData, 200),
      top500: calcMarketCapWeightedIndex(marketData, 500),
    };
  });

  // console.log(indicesPerDay);

  // Write this to file
  writeDictToCsv(indicesPerDay, "indices.csv");
}

// generateIndexEveryDay();

// console.log(calcMarketDataOn(dateToTimestamp("December 18, 2021")));

/**
  Calculates market data (i.e. the list of the top coins and their
  market caps, etc.) for the given timestamp, and writes it to a CSV.
*/
export function recordMarketDataOn(timestamp) {
  const marketData = calcMarketDataOn(timestamp);

  writeDictToCsv(marketData, `topcoins/${timestamp}.csv`);
}

// recordMarketDataOn(dateToTimestamp("December 18, 2021"));
