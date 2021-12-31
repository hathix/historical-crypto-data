import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn, readDictFromCSV, getExtendedCoinList, excludeStablecoinsAndDerivatives } from "./lib.js";
import { calcMarketDataOn } from "./calcindex.js";

import _ from "lodash";

/**
  An intermediate function that computes the stats for each coin
  on each day in the sample.
*/
export function computePerDayData() {
  // Get the list of all coins we've tracked
  const extendedCoinList = getExtendedCoinList();

  // Figure out which timestamps we care about
  const timestamps = getAllSupportedTimestamps();

  // Before we loop through each timestamp, it'll be more efficient
  // if we read data for every single coin in our list. It'll be
  // a lot, but it'll save us the hassle of constantly opening and
  // reopening files.
  const allCoinData = extendedCoinList.map(basicCoinData => {
    // Read the file for this coin
    const fullCoinData = readDictFromCSV(
      `coins/${basicCoinData.id}.csv`);

    // Just return it. We'll store it all in one gigantic data structure.
    return fullCoinData;
  });

  console.log("Raw data pulled from files");

  // Like before, let's stash intermediate data in the `perday` folder.
  const dataPerDay = timestamps.map(timestamp => {
    // Get data for each coin on this day
    const dataForThisDay = allCoinData.map(coinData => {
      // This is an array of data, one item per day
      // Filter by just this day
      const forToday = _.filter(coinData, dailyData => {
        return +(dailyData.timestamp) === +timestamp;
      })[0];

      // If there was no match, this value will be undefined; return
      // an empty object instead of undefined, to avoid errors
      return forToday || {};
    });

    console.log(`Got data for ${timestamp}`);

    // OK, now we can write to perday
    writeDictToCsv(dataForThisDay, `perday/${timestamp}.csv`);
  });


  //
  // Before we go compute indices, the first thing we need to do is to
  // compute the top 10/20/50/... coins on day 1. This will be used
  // to compute the value of our "basket" over time.
  //
  // Now let's go through all the timestamps we care about and compute
  // indices for each
}

/**
  Like the other topNCoinsOn, except this one requires you to pass
  a list of the
*/
// const topNCoinsOn(allCoinData, n, timestamp) {
//   // Get
// }


// computePerDayData();


/**
  Returns data on the top N coins on the given day, for MULTIPLE
  top N's. This is for greater efficiency.
*/
export function getTopCoinsOnDayMultipleNs(topNs, timestamp) {
  // Get market data for this day (all coins and their prices, market
  // caps, etc.)
  const dataForThisDay = readDictFromCSV(`perday/${timestamp}.csv`);

  // Sort this list of coins by market cap descending (hence the -1).
  const sortedData = _.sortBy(
    dataForThisDay, coin => coin.marketCap * -1);

  // Exclude the stablecoins and derivatives
  const cleanedData = excludeStablecoinsAndDerivatives(sortedData);

  // Extract just the top N of these, for each N
  // (so like the top 5, 10, 20, etc.)
  return topNs.map(n => cleanedData.slice(0, n));
}

/**
  Convenience function to get just a single-dimensional list of top
  coins, for just one value of topN. So if you want JUST the top 50,
  etc. coins on a given day, use me.
*/
export function getTopNCoinsOnDay(topN, timestamp) {
  return getTopCoinsOnDayMultipleNs([topN], timestamp)[0];
}


/**
  The below is to create our "baskets" of coins that we would have
  bought on the first day in our sample.
*/

// What if we bought the top 1, 2, 5, etc. coins on day one?
const TOP_NS_FOR_BASKETS = [1, 2, 5, 10, 20, 50, 100];

export function createBaskets() {
  // Like before, get some essential data to start with
  // Get the list of all coins we've tracked
  const extendedCoinList = getExtendedCoinList();
  // Figure out which timestamps we care about
  const timestamps = getAllSupportedTimestamps();

  // OK, first thing is to figure out which coins were in the top
  // 5/10/20/etc. on the first day in our sample. This makes up the
  // "basket" of coins that we will track.


  const topNsCoinsOnDayOne = getTopCoinsOnDayMultipleNs(
    // Use our list
    TOP_NS_FOR_BASKETS,
    // Get the very first day in the sample
    timestamps[0],
  );

  // Now let's write it
  topNsCoinsOnDayOne.forEach((topNCoinsDict, i) => {
    // Recover the top N in this case
    const topN = TOP_NS_FOR_BASKETS[i];
    writeDictToCsv(topNCoinsDict, `baskets/simple/top${topN}.csv`);
  });
}

createBaskets();
