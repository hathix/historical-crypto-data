import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn, readDictFromCSV, getExtendedCoinList, excludeStablecoinsAndDerivatives, dotProduct, scaleToSumToOne, toNDecimalPlaces } from "./lib.js";
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
  market cap descending. We also will remove blanks and stablecoins/derivatives
  as a bonus.
*/
export function getSortedCoinList(coinData) {
  // Given some raw data, we need to clean it up a bit first.
  // Cut out the empty objects: these ones lack fields like
  // coin ID.
  const nonEmptyData = coinData.filter(record => record.coinId);

  // Sort this list of coins by market cap descending (hence the -1).
  const sortedData = _.sortBy(
    nonEmptyData, coin => coin.marketCap * -1);

  // Exclude the stablecoins and derivatives
  const cleanedData = excludeStablecoinsAndDerivatives(sortedData);

  return cleanedData;
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
  // Let's simply generate a list of weights from the weight function,
  // then map those onto the list of coins.
  // Don't worry about normalizing weights here; we'll take care of that
  // in the main function.
  const weights = coinData.map((coin, i) => weightFunction(coin, i));
  return mapWeightsToCoinList(coinData, weights);
}

/**
  Similar to the above, but use me if you have a list of weights
  that you want to map one-to-one to the given list of coin data.
  e.g. if you have 5 coins, then you might pass a weight list of
  [10, 5, 3, 2, 1]. This applies the 0th weight to the 0th coin,
  the 1st to the 1st, etc.
*/
export function mapWeightsToCoinList(coinData, weightList) {
  // NEW: we will actually apply the weightings here, rather than
  // using the mapping function.

  // Before we do anything else, we should scale down all the weights, since
  // different generation strategies may yield weights of hilariously different
  // orders of magnitude, with some being like 1 billion and others being like
  // 1. To make things more standardized, we can normalize the list of weights
  // so that they all add to 1
  const scaledWeights = scaleToSumToOne(weightList);

  // Now we can simply map each scaled weight onto the list.
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

      // Add a new field. The weighting comes from the list.
      weight: scaledWeights[i],
    };
  });

  // return addWeightsToCoinList(coinData, (coin, i) => {
  //   return weightList[i];
  // });
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

  // console.log(actualWeights);

  // Now we can apply the weights to the coin data
  return mapWeightsToCoinList(topNCoins, actualWeights);
}


/**
  Creates metadata for a generator function, with `n` being the number
  of coins to include in a market-cap-weighted Moon & Rug index.
*/
export function makeMarketCapWeightedGenerator(n) {
  // Simply fill in the template
  return {
    name: `moonRug${n}`,
    size: n,
    generator: coinData => makeMarketCapWeightedIndex(coinData, n),
  };
};

/**
  Like the above, but for making equal-weighted index generators.
*/
export function makeEqualWeightedGenerator(n) {
  return {
    name: `equalWeight${n}`,
    size: n,
    generator: coinData => makeEqualWeightedIndex(coinData, n),
  };
};

/**
  Like the above, but for making square-root index generators.
*/
export function makeSquareRootGenerator(n) {
  return {
    name: `squareRoot${n}`,
    size: n,
    generator: coinData => makeSquareRootIndex(coinData, n),
  };
};

/**
  Creates max-weight index generators. Note that there are two params!
  Pass `maxWeightPercent` as a whole number (i.e. 10 => 10%)!
*/
export function makeCappedGenerator(n, maxWeightPercent) {
  return {
    name: `moonRug${n}_cap${maxWeightPercent}p`,
    size: n,
    // Note that the generator function requires a fraction (between 0 and 1),
    // so we have to cut the
    generator: coinData => makeCappedIndex(coinData, n,
      maxWeightPercent / 100),
  };
};


/**
  A set of generator functions (plus metadata) for making indices.
  The idea is that, if you feed in a set of coin data, we can
  compute all kinds of indices on it.
*/
export const INDEX_GENERATOR_FUNCTIONS = [

  // Some Moon & Rug indices (market-cap weighted)
  makeMarketCapWeightedGenerator(10),
  makeMarketCapWeightedGenerator(20),
  makeMarketCapWeightedGenerator(50),
  makeMarketCapWeightedGenerator(100),

  // Some equal-weighted indices
  makeEqualWeightedGenerator(10),
  makeEqualWeightedGenerator(20),
  makeEqualWeightedGenerator(50),
  makeEqualWeightedGenerator(100),

  // Some square-root-weighted indices
  makeSquareRootGenerator(10),
  makeSquareRootGenerator(20),
  makeSquareRootGenerator(50),
  makeSquareRootGenerator(100),

  // Some capped funds. Note that the number of assets in the fund
  // and the max weight of each asset must multiply to at least 100...
  // otherwise, you'd never be able to fill up 100% of the index!
  // e.g. this one below would give all 10 assets 5% of the index each...
  // which lets us only fill up half the index.
  // makeCappedGenerator(10, 5),
  // The ones that multiply to exactly 100 are also a bit nonsensical, since
  // they're just clones of equal-weighted funds because everything gets
  // the same percent. On my experiments this does indeed work out --
  // e.g. the 10/10 capped index is the same as the 10 equal-weighted index,
  // and the 20/5 capped index is the same as the 20 equal-weighted index.
  // So that's cool.
  // makeCappedGenerator(10, 10),
  makeCappedGenerator(10, 20),
  // makeCappedGenerator(20, 5),
  makeCappedGenerator(20, 10),
  makeCappedGenerator(20, 20),
  makeCappedGenerator(50, 5),
  makeCappedGenerator(50, 10),
  makeCappedGenerator(50, 20),
  makeCappedGenerator(100, 5),
  makeCappedGenerator(100, 10),
  makeCappedGenerator(100, 20),
];


/**
  Given an index generator function and a set of data of all the coins you care
  to track, computes the value of that index. Please pass a generator
  OBJECT, which contains metadata in addition to just the generator
  function itself.

  Pass the set of all coins at the beginning of the sample period (the base
  amount) plus the set of coins for the day you wish you compute an index for.
*/
export function computeSingleIndexValue(baselineCoinData, testCoinData, generatorObject) {
  // Like stock market indices, these indices only make sense when
  // compared to some baseline. So instead of calculating some disembodied
  // index number like we used to, we're going to compare today's market
  // to the baseline and use that to compute the index itself.

  // The way we do this is to compare the market caps of the coin at slot
  // `i` for each coin in our sample. Then we'll see how much the market
  // cap of coin `i` differs from the baseline. If every coin in the sample
  // doubled, then our market index probably doubled as well.
  // Note that we care about the _position_ of each coin, not the names of
  // the coins. If coin 3 and coin 5 traded places, taking each other's market
  // caps, nobody is really richer or poorer, so that should be a no-op.
  // If an index fund rebalances properly, it should be able to capture
  // the new coins that enter the index's range and the old ones that exit.

  // OK, so first let's figure out the stats of the coins in the baseline.
  // We really only care about the market caps of coin `i`, but we can
  // use the generator to get this (since it filters for just the
  // top N coins in the sample), so might as well.
  const generatorFunction = generatorObject.generator;
  const baselineWithWeights = generatorFunction(baselineCoinData);

  // And similarly let's figure out the stats of the coins in the sample.
  // THIS is where the weighting becomes important.
  const testWithWeights = generatorFunction(testCoinData);

  // Now the trick is that we compute the change in market cap for the coin
  // at `i` (as a fraction, where 1 = no change, 2 = doubled, .7 = 30% down,
  // etc.) Then we just take the weighted average of those changes to see
  // the overall index change.
  const marketCapChanges = testWithWeights.map((testCoin, i) => {
    // Get the corresponding coin at `i` in the baseline data
    const baselineCoin = baselineWithWeights[i];

    // Now just compare the market caps.
    return testCoin.marketCap / baselineCoin.marketCap;
  });

  // Now let's just get the list of weights
  const weights = testWithWeights.map(coin => coin.weight);

  // Now take a weighted arithmetic mean of the changes, based on weight.
  // We do a sort of dot product here.
  const weightedAverage = dotProduct(marketCapChanges, scaledWeights);

  // Because we're doing so much math, the value might be off by a small
  // amount here or there. For instance, on day 1 (where the index value
  // should always be 1.000.... by definition), we sometimes get 0.999...8
  // or 1.000..4. That usually happens around 15 sigdigs.
  // So let's cut this down to a more reasonable 4-8 sigdigs to avoid
  // this inelegant "fuzzing" at the end of the value.
  const fewerSigDigs = toNDecimalPlaces(weightedAverage, 8);
  return fewerSigDigs;

}


/**
  Returns an array of index values (basically the weighted sum of all the
  coins in the sample, according to various weighting strategies) for the
  given set of coins -- which you could load from ther `perday` folder or
  something.
*/
// export function calculateIndices(coinData) {
//   return INDEX_GENERATOR_FUNCTIONS.map((metadata, i) => {
//     // We're going to return some old data like the name and size, plus
//     // obviously the index value.
//     // Note that the index values will be hilariously
//   });
// }


/**
  Generates an object that contains coin data for each timestamp in our
  sample. Each coin data object can be used to generate indices.
*/
export function getAllTimestampMarkedData() {
  // Get some essential data to start with
  // Get the list of all coins we've tracked
  const extendedCoinList = getExtendedCoinList();
  // Figure out which timestamps we've gathered data on
  const timestamps = getAllSupportedTimestamps();

  // Load market data for each timestamp
  return timestamps.map(timestamp => {
    // Get the data for this timestamp
    const dataForThisDay = readDictFromCSV(`perday/${timestamp}.csv`);

    // Return some data about it
    return {
      timestamp: timestamp,
      readableTimestamp: makeReadableTimestamp(timestamp),
      coinData: dataForThisDay,
    };
  });
}

/**
  Runner function.
*/
export function computeIndicesForEachTimestamp() {
  // Get all market data, marked with timestamps
  const allDaysData = getAllTimestampMarkedData();

  console.log("Got all daily data");

  // For each day, compute some indices
  // We'll need to compare day's market data to the baseline, so just grab
  // that up front. This is the market data for the very first day in the
  // sample.
  const baselineCoinData = allDaysData[0].coinData;

  // OK now loop over each day. Get a dict with timestamp and index info
  // for each day
  const dailyDicts = allDaysData.map(dailyData => {
    // console.log(dailyData.readableTimestamp);

    // Compute each index for this day
    let indices = INDEX_GENERATOR_FUNCTIONS.map(generator => {
      // This is for a specific index, on this specific day.
      const indexValue = computeSingleIndexValue(
        baselineCoinData, dailyData.coinData, generator
      );

      // Give back a simple mapping between generator names and values;
      // we will use this to construct a single dict later
      return {
        generatorName: generator.name,
        indexValue: indexValue,
      };

      // return indexValue;
      // console.log(generator.name, indexValue);
    });

    // Now construct a dict that includes all of the indices. Start with
    // the basic scalar values, then tack on the indices.
    let resultDict = {
      timestamp: dailyData.timestamp,
      readableTimestamp: dailyData.readableTimestamp,
    };

    indices.forEach(index => {
      resultDict[index.generatorName] = index.indexValue;
    });

    // Now we can return this
    return resultDict;
  });

  console.log(dailyDicts);

  // We now have an array of dicts, one per day. We can now write this!!
  writeDictToCsv(dailyDicts, `newresults/allindices.csv`);
}

computeIndicesForEachTimestamp();
