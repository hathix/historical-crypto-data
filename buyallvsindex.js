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

// createBaskets();


// The size of Moon&Rug market-cap-weighted indices we want to compute.
// Like using the top 5, 10, etc. coins.
export const MOON_AND_RUG_SIZES = [1, 2, 5, 10, 20, 50, 100];

// The raw market caps in the Moon&Rug index will be divided by this.
// 1e9 is a billion, so if the total market cap is 2 trillion (which it
// is at the time of writing) then the index would be 2000, which is
// a nice ballpark for an index. (An index of 2 is strange, as is one
// of 2 million).
export const MOON_AND_RUG_DIVISOR = 1e9;

/**
  Computes the market-cap-weighted indices for the given timestamp.
  We'll return an array that corresponds to MOON_AND_RUG_SIZES,
  with one index number per size.
*/
export function computeMoonAndRugIndices(timestamp) {
  // Get the list of top coins on this day
  const topNsCoins = getTopCoinsOnDayMultipleNs(
    // This is the top N's: the top 1, 2, 5, etc.
    MOON_AND_RUG_SIZES,
    timestamp,
  );

  // Now we can compute the indices
  return MOON_AND_RUG_SIZES.map((size, i) => {
    // Get the market data on this day, for this index size
    const coinsToInclude = topNsCoins[i];

    // This includes a list of all the coins we need to make a
    // market-cap-weighted average for

    // Fortunately, all we have to do here is just sum up all
    // the market caps and divide by a divisor
    const sumOfMarketCaps = _.sumBy(coinsToInclude,
      coin => coin.marketCap);

    // Now just divide it by the divisor and that's it!
    return sumOfMarketCaps / MOON_AND_RUG_DIVISOR;
  });
}

// console.log(computeMoonAndRugIndices(1610323200000));

// How many dollars we "spent" on each coin in our baskets.
// Remember that a basket is the top N coins on day 1 of our
// experiment, and we're imagining that we bought an equal dollar amount
// of each.
export const COST_BASIS_OF_EACH_COIN_IN_BASKET = 100;


/**
  A helper function. Computes how much the given basket of coins
  would be worth on a given day, given a full list of market data
  (the list of all coins and their prices, market caps, etc.)
  for the day in question.
*/
export function computeBasketValue(basket, marketDataOnThisDay) {
  // For each coin in the basket, let's figure out how much it's
  // currently worth
  const coinsWithCurrentPerformance = basket.map(coin => {
    // Figure out how much the coin is currently worth
    const currentData = marketDataOnThisDay.filter(record => {
      // Find the matching coin
      return record.coinId === coin.coinId
    })[0];

    // If no coin was found, then currentData will be undefined.
    // That would mean CoinGecko stopped tracking this coin, which
    // would be strange. But we should handle it.
    const currentPrice = currentData ? currentData.price : undefined;

    return {
      // Import old values
      coinId: coin.coinId,
      originalPrice: coin.originalPrice,
      numCoinsHeld: coin.numCoinsHeld,
      costBasis: coin.costBasis,

      // Add new values
      currentPrice: currentPrice,
      // Be sure to guard for undefined. If CoinGecko doesn't track
      // the coin, surely it's worthless.
      currentHoldingsValue: currentPrice
        ? currentPrice * coin.numCoinsHeld
        : 0,
      // Performance is just the ratio of the current to the
      // purchase price. So if it's 3.0, then we've 3x'ed our money.
      // Be sure to guard for undefined.
      performance: currentPrice
        ? currentPrice / coin.originalPrice
        : 0,
    };
  });

  return coinsWithCurrentPerformance;
}

/**
  Computes the dollar value of the basket of currencies we'd "bought"
  on day one of this experiment, on a given day.
*/
export function computeValueOfBasketsOn(timestamp) {
  // Figure out what was in the baskets. We'll have one basket
  // for each size we experimented with.
  const basketContents = TOP_NS_FOR_BASKETS.map(n => {
    return readDictFromCSV(`baskets/simple/top${n}.csv`);
  });

  // Figure out how much of each coin we'd have held on day 1.
  // The basket contents will include the price of each coin on day 1.
  const holdingsOfEachCoin = basketContents.map(basket => {
    // This is now an array of coins. Here we can just simply store
    // the coin ID and number of coins, TBH...
    return basket.map(coin => {
      return {
        coinId: coin.coinId,
        originalPrice: coin.price,
        numCoinsHeld: COST_BASIS_OF_EACH_COIN_IN_BASKET / coin.price,
        costBasis: COST_BASIS_OF_EACH_COIN_IN_BASKET,
      };
    });
  });

  // Now figure out how much each of these was worth on the day
  // in question. First load the list of all coins in our dataset
  // on this day.
  const marketDataOnThisDay = readDictFromCSV(`perday/${timestamp}.csv`);

  // console.log(marketDataOnThisDay);

  // Now let's compute how much each basket would be worth on a given day
  // We need to base this off how many coins we held on day 1.
  return holdingsOfEachCoin.map(basket => {
    const coinsWithCurrentPerformance = computeBasketValue(
      basket, marketDataOnThisDay);

    // console.log(coinsWithCurrentPerformance);

    // Later we might print this to file. But for now, let's just sum
    // up all the holdings and cost bases.
    const totalHoldingsValue = _.sumBy(coinsWithCurrentPerformance,
      coin => coin.currentHoldingsValue);
    const totalCostBasis = _.sumBy(coinsWithCurrentPerformance,
      coin => coin.costBasis);
    const totalPerformance = totalHoldingsValue / totalCostBasis;

    return {
      totalHoldingsValue: totalHoldingsValue,
      totalCostBasis: totalCostBasis,
      totalPerformance: totalPerformance,
      basketSize: basket.length,
    }
  });
}

// console.log(computeValueOfBasketsOn(1610323200000));

/**
  Returns an array of all the timestamps we tracked, plus the
  performance of each Moon&Rug index and the performance of this
  equal-weighted basket we constructed.
*/
export function computeAllIndices() {
  // Like before, get some essential data to start with
  // Get the list of all coins we've tracked
  const extendedCoinList = getExtendedCoinList();
  // Figure out which timestamps we care about
  const timestamps = getAllSupportedTimestamps();

  // We will be dividing the indices by their values on day 1 of
  // our analysis, so it's all 1-based. So get that
  const indexValuesOnDayOne = computeMoonAndRugIndices(timestamps[0]);

  // Go through each timestamp and compute the indices
  // and basket performances. (Both will be normalized such that their
  // value on day 1 of our experiment was 1.00.)
  const dataPerTimestamp = timestamps.map(timestamp => {
    const indices = computeMoonAndRugIndices(timestamp);
    const basketPerformances = computeValueOfBasketsOn(timestamp);

    // Make an object and stuff these items in there
    let dataObj = {
      timestamp: timestamp,
      readableTimestamp: makeReadableTimestamp(timestamp),
    };

    // Add the indices
    indices.map((indexValue, i) => {
      // Figure out how many coins were included in this index
      const indexSize = MOON_AND_RUG_SIZES[i];
      // Normalize the index value by dividing it by the starting value
      const normalizedIndex = indexValue / indexValuesOnDayOne[i];
      // Now write it
      dataObj[`m&r-${indexSize}`] = normalizedIndex;
    });

    // Add the basket valeus
    basketPerformances.map((basketPerformance, i) => {
      // Like before, figure out the basket size
      const basketSize = basketPerformance.basketSize;
      // Now write it
      dataObj[`basket-${basketSize}`] = basketPerformance.totalPerformance;
    });

    return dataObj;
  });

  return dataPerTimestamp;
}

// Let's grab and store this data
// const allIndices = computeAllIndices();
// writeDictToCsv(allIndices, "indices-and-baskets.csv");


/**
  Returns an array of baskets (each of which is an array of coin data).
  This covers all the "buy each of the top N coins" baskets we
  tracked for this experiment.
*/
export function loadAllBaskets() {
  // Figure out what was in the baskets. We'll have one basket
  // for each size we experimented with.
  return TOP_NS_FOR_BASKETS.map(n => {
    return readDictFromCSV(`baskets/simple/top${n}.csv`);
  });
}


/**
  Computes and returns the year-long performance of all the coins
  in the given basket. Returns a dictionary with one entry per coin,
  each of which includes `performance` among others.
*/
export function computeFinalBasketPerformance(basket) {
  // Like before, get some essential data to start with
  // Get the list of all coins we've tracked
  const extendedCoinList = getExtendedCoinList();
  // Figure out which timestamps we care about
  const timestamps = getAllSupportedTimestamps();

  // Get the market data on the last day in our sample.
  const lastTimestamp = timestamps[timestamps.length - 1];

  // Get market data for this timestamp
  const finalMarketData = readDictFromCSV(`perday/${lastTimestamp}.csv`);
  console.log("F", finalMarketData);

  // Compute basket's value at this time
  const finalBasketPerformance = computeBasketValue(
    basket,
    finalMarketData
  );

  console.log("P", finalBasketPerformance);

  // This is an array of coins, which includes stuff like performance
  // (which is what we really care about)
  // You can write it to file yourself
  return finalBasketPerformance;
}


/**
  Computes the performance of all baskets and writes it to file.
*/
export function writeAllBasketsPerformance() {
  // Get all the baskets we care about
  const baskets = loadAllBaskets();

  // For each, compute and write the performance
  baskets.map((basket, i) => {
    if (i >= 2) { return; }
    // Figure out how many coins are in this basket, for future reference
    const basketSize = TOP_NS_FOR_BASKETS[i];

    // Now compute performance
    console.log(`Computing performance for basket of top ${basketSize}`);
    const performance = computeFinalBasketPerformance(basket);
    console.log(performance);

    // Write it
    // writeDictToCsv(performance,
    //   `baskets/simple/results/top${basketSize}.csv`);
  });
}

writeAllBasketsPerformance();
