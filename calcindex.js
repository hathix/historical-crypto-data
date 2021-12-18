/**
  Compute various crypto market indices for each day.
*/
import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getMarketDataOn } from "./lib.js";

// Get a list of all the timestamps we've tracked. Pull up the oldest coin
// (Bitcoin) and extract its list of timestamps.
const timestamps = getHistoricalData("bitcoin").map(record => record.timestamp);

/**
  Calculates the market-cap-weighted average of the top N crypto's on
  the given day.
*/
export function calcMarketCapWeightedIndex(timestamp, topN) {
  // Get the crypto market caps for this day
  const rawMarketData = getMarketDataOn(timestamp);
  // console.log(marketData);

  // Exclude stablecoins & wrapped coins since those aren't relevant
  const cleanedMarketData = rawMarketData
    .filter(record => !(record.price > 1.01 || record.price < 0.99));

  console.log(cleanedMarketData);
}

calcMarketCapWeightedIndex(dateToTimestamp("December 1, 2021"), 10);
