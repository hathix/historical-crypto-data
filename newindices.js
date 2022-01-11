import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn, readDictFromCSV, getExtendedCoinList, excludeStablecoinsAndDerivatives } from "./lib.js";
import { calcMarketDataOn } from "./calcindex.js";
import { getTopCoinsOnDayMultipleNs, MOON_AND_RUG_DIVISOR, MOON_AND_RUG_SIZES } from "./buyallvsindex.js";

import _ from "lodash";




/**
  Given a list of coin data (such as the list of all the top N coins
  on a given day) and a strategy function (which converts the list
  to a single index value), computes the index. This is pretty
  general-purpose, so use functions like getTopCoinsOnDayMultipleNs()
  or some other basket-creating function to get coinData (it just needs
  fields like marketCap and price, really).
*/
// export function generateIndex(coinData, strategyFunction) {
//
//   // Pass the coin data through the strategy function
//   return strategyFunction(coinData);


  // // Get the list of top coins on this day
  // const topNsCoins = getTopCoinsOnDayMultipleNs(
  //   // This is the top N's: the top 1, 2, 5, etc.
  //   MOON_AND_RUG_SIZES,
  //   timestamp,
  // );
  //
  // // Now we can compute the indices
  // return MOON_AND_RUG_SIZES.map((size, i) => {
  //   // Get the market data on this day, for this index size
  //   const coinsToInclude = topNsCoins[i];
  //
  //   // This includes a list of all the coins we need to make a
  //   // market-cap-weighted average for
  //
  //   // Fortunately, all we have to do here is just sum up all
  //   // the market caps and divide by a divisor
  //   const sumOfMarketCaps = _.sumBy(coinsToInclude,
  //     coin => coin.marketCap);
  //
  //   // Now just divide it by the divisor and that's it!
  //   return sumOfMarketCaps / MOON_AND_RUG_DIVISOR;
  // });
// }


/**
  Generator functions that return a concrete strategy function for
  generating an index. Use these if you want to have a bunch of
  similar index strategies that only vary in things like the
  number of coins to include.
  This can also include other utility functions or partial functions
  that can be lego-ed together.
*/

/**
  Returns a clone of the given coinData list that is sorted by
  market cap descending.
*/
export function getSortedCoinList(coinData) {
  // As usual, multiply market cap by -1 so we can get a descending
  // list. Note that _.sortBy doesn't sort in place which is nice.
  return _.sortBy(coinData, coin => coin.marketCap * -1);
}

/**
  Another helper function that returns a list of just the top N
  coins by market cap, descending.
*/
export function getTopNCoinsByMarketCap(coinData, n) {
  // Get just the top N coins
  const sortedList = getSortedCoinList(coinData);
  const topN = sortedList.slice(0, n);
  return topN;
}

/**
  Given a list of coins that you include in your index and a function
  that (given a coin) decides what weight to give it, returns a modified
  version of the coin data that's suitable for index computation.

  That function will be called with:
  - coin (includes market cap, volume, etc.)
  - i (index of iteration)
*/
export function addWeightsToCoinList(coinData, weightFunction) {
  return coinData.map((coin, i) => {
      return {
      // Carry over all previous fields from the coin data. Namely:
      // timestamp,readableTimestamp,coinId,price,marketCap,totalVolume
      timestamp: coin.timestamp,
      readableTimestamp: coin.readableTimestamp,
      coinId: coin.coinId,
      price: coin.price,
      marketCap: coin.marketCap,
      totalVolume: coin.totalVolume,

      // Add a new field. The weighting is determined by the function.
      weight: weightFunction(coin, i),
    };
  });
}

/**
  Similar to the above, but use me if you have a list of weights
  that you want to map one-to-one to the given list of coin data.
  e.g. if you have 5 coins, then you might pass a weight list of
  [10, 5, 3, 2, 1]. This applies the 0th weight to the 0th coin,
  the 1st to the 1st, etc.
*/
export function mapWeightsToCoinList(coinData, weightList) {
  return addWeightsToCoinList(coinData, (coin, i) => {
    return weghtList[i];
  });
}


/**
  A generic function that can compute all types of indices,
  as long as they all just use the top N coins available.
*/
export function generateTopNIndex(coinData, n, weightFunction) {
  // Get just the top N
  const topNCoins = getTopNCoinsByMarketCap(coinData, n);

  // Now just add on a `weight` value to the coin data.
  return addWeightsToCoinList(topNCoins, weightFunction);
}



/**
  Creates a market-cap-weighted index of the top `n` coins in the sample.
*/
export function makeMarketCapWeightedIndex(coinData, n) {
  return generateTopNIndex(coinData, n, coin => {
    // The weighting of a given coin is exactly equal to its
    // market cap. This is a market-cap-weighted index, after all!
    return coin.marketCap;
  });


  // const clonedList = _.cloneDeep(topNCoins);
  //
  // // Add the weighting: it's proportional to market cap. So you
  // // can just put the market cap and that'll be good
  // clonedList.forEach(coin => {
  //   // Modify it in-place so the previous
  // })


  // Now just sum 'em all up to get the weighted average
  // const sumOfMarketCaps = _.sumBy(topNCoins, coin => coin.marketCap);

  // Cut it down to size and we're good
  // return sumOfMarketCaps / MOON_AND_RUG_DIVISOR;
}

/**
  Like above, but gives each coin in the index an equal weight.
*/
export function makeEqualWeightedIndex(coinData, n) {
  return generateTopNIndex(coinData, n, coin => {
    // Give each coin the same weight
    return 1;
  });
}

/**
  Like before, but I heard that Pearson weighting is a method
  that uses square roots to compromise between equal weighting
  and capitalization-based weighting.
*/
export function makeSquareRootIndex(coinData, n) {
  return generateTopNIndex(coinData, n, coin => {
    // Square root of market cap
    return Math.sqrt(coin.marketCap);
  });
}

/**
  Similar to the standard market-cap-weighted index, but limits each
  asset to no more than X% of the overall index.
  `maxWeightPerAsset` should be a fraction between 0 and 1
  (i.e. 10% = 0.1).
*/
export function makeCappedIndex(coinData, n, maxWeightPerAsset) {
  // This is actually a lot more complicated to compute than the others.
  // See https://quant.stackexchange.com/questions/39818/algorithm-for-calculating-capped-index-weightings
  // And https://docs.google.com/spreadsheets/d/1nSVxcO4CwKJkh-W79gWrAt99z9z_DBV9Ezr3CRl2P7o/edit#gid=1584017289

  // Let's go through the top N coins and figure out the original weightings
  // for each. The indices of this list will be the same as that of the sorted
  // coin data.

  // Speaking of which, let's first sort the coin data and limit ourselves
  // to just the top N.
  const topNCoins = getTopNCoinsByMarketCap(coinData, n);

  // Now we can figure out the naive weights -- the percent of the market
  // that each constituent takes up
  const totalMarketCap = _.sumBy(topNCoins, coin => coin.marketCap);
  const naiveWeights = topNCoins.map(coin => coin.marketCap / totalMarketCap);

  // Now basically we have 100 percent that we have to dole out to each
  // asset. Each asset will claim its percent of whatever is left (from
  // top to bottom), with the share limited to X%.
  let fractionOfIndexLeft = 1;
  let fractionOfMarketLeft = 1;
  let actualWeights = [];
  for (let i = 0; i < topNCoins.length; i++) {
    // We're going down the list of coins from highest to lowest
    // market cap.
    let thisCoin = topNCoins[i];
    // First, figure out what percent of the index this SHOULD get
    // before capping.
    // This is equal to the proportion of the remaining market
    // that this coin takes up. That's the proportion of the total
    // amount of index weighting that we have left to dole out.
    const percentOfMarket = thisCoin.marketCap / totalMarketCap;
    const uncappedWeight = percentOfMarket / fractionOfMarketLeft * fractionOfIndexLeft;
    // Now cap this to the max percent
    const cappedWeight = Math.min(uncappedWeight, maxWeightPerAsset);
    // Set this
    actualWeights[i] = cappedWeight;

    // Now we can update the loop variables
    // We took away a different percent of the index and
    // the market.
    fractionOfIndexLeft -= cappedWeight;
    fractionOfMarketLeft -= percentOfMarket;
  }

  // Now we can apply the weights to the coin data
  return mapWeightsToCoinList(topNCoins, actualWeights);
}



/**
  A set of generator functions (plus metadata) for making indices.
  The idea is that, if you feed in a set of coin data, we can
  compute all kinds of indices on it.
*/
export const indexGeneratorFunctions = [
  {
    name: "moon_rug_50",
    size: 50,
    generator: coinData => makeMarketCapWeightedIndex(50),
  },
  {
    name: "equal_weight_50",
    size: 50,
    generator: coinData => makeEqualWeightedIndex(50),
  },
  {
    name: "square_root_50",
    size: 50,
    generator: coinData => makeSquareRootIndex(50),
  },
];
