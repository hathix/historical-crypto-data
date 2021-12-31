import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn, readDictFromCSV, getExtendedCoinList } from "./lib.js";
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


computePerDayData();
