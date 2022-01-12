import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn, readDictFromCSV, getExtendedCoinList, excludeStablecoinsAndDerivatives, dotProduct, scaleToSumToOne, toNDecimalPlaces, getFirstItemWhere, getMultiplesUpTo } from "./lib.js";
import { getTopCoinsOnDayMultipleNs, MOON_AND_RUG_DIVISOR, MOON_AND_RUG_SIZES } from "./buyallvsindex.js";
import { makeMarketCapWeightedGenerator, makeSquareRootGenerator, makeEqualWeightedGenerator, makeCappedGenerator, INDEX_GENERATOR_FUNCTIONS } from "./newindices.js";

import _ from "lodash";



/**
  Given a certain timestamp and a certain index-fund-generation strategy
  (from INDEX_GENERATOR_FUNCTIONS), this will spit out a list of the coins
  you should be holding and what fraction of your portfolio should go
  toward each.
*/
export function generateBasket(timestamp, indexGenerator) {
  // Get market data for this timestamp
  const dataForThisDay = readDictFromCSV(`perday/${timestamp}.csv`);

  // Now we can use our index generator to make a list of all the coins we
  // should hold, and in what proportion (since it gives us a percentage of
  // our total fund that should be devoted to each given coin)
  const coinsWeShouldHold = indexGenerator.generator(dataForThisDay);

  // This is actually all we need to make the basket. This tells us exactly
  // what coins we should hold, and in what proportion
  return coinsWeShouldHold;
}

export const EXAMPLE_COST_BASIS = 10000;
export const REBALANCING_FREQUENCY_DAYS = 7;



export function determineRebalanceDelta(lastRebalanceTimestamp, newRebalanceTimestamp, generator) {
  // Figure out the basket we had before the rebalancing
  const oldBasket = generateBasket(lastRebalanceTimestamp, generator);
  // Figure out the basket we should have now, after the rebalancing
  const newBasket = generateBasket(newRebalanceTimestamp, generator);

  // Now we need to figure out the diff between the two baskets and report on
  // what you'd need to buy or sell to get from the old basket to the new one.
  // Coins will fall into three categories:
  // - In both old and new, so you just need to buy or sell a little to
  //   re-adjust to the desired weight
  // - In new but not old, meaning it's brand-new to the index and we need to
  //   buy a bunch of it
  // - In old but not new, meaning it's fallen out of the index and we need to
  //   sell off all of it

  // Let's partition the coins into each category first.
  // Get the IDs of the coins, then we can do some looking up
  const oldBasketCoinIds = oldBasket.map(coin => coin.coinId);
  const newBasketCoinIds = newBasket.map(coin => coin.coinId);

  // console.log("Old basket", oldBasketCoinIds);
  // console.log("New basket", newBasketCoinIds);

  // Join the lists, which will give us a list of all the coins we need to
  // worry about buying or selling. This is the union of all coins in the
  // old basket, the new basket, or both.
  const allCoinIds = _.union(oldBasketCoinIds, newBasketCoinIds);

  // Now we can figure out which coins are in each category (well, at least
  // their IDs). First, some convenience functions...
  const isInOldBasket = (id) => _.indexOf(oldBasketCoinIds, id) !== -1;
  const isInNewBasket = (id) => _.indexOf(newBasketCoinIds, id) !== -1;

  // Go through each coin in our list and see if it needs to be bought
  // (if it's new here or if its weighting went up) or sold (if it's fallen out
  // of the index or its weighting went down).
  const buyAndSellOrders = allCoinIds.map(id => {
    // Let's figure out how much to buy or sell first before we construct a
    // return object.
    // We'll use the convention that positive means we should buy, negative
    // means we should sell. The value is just the delta in weighting... we'll
    // figure out exactly how many coins to buy or sell separately.
    // let buyAmount;

    // The simplest logic is to figure out the old and new weighting. If
    // something was not in the old basket, its weight was zero; if it's not in
    // the new basket, its weight is zero.
    const oldCoinData = getFirstItemWhere(oldBasket, c => c.coinId === id);
    const newCoinData = getFirstItemWhere(newBasket, c => c.coinId === id);
    // Now we can get the weights, which are 0 if an item is undefined
    // (not found).
    const oldWeight = oldCoinData ? oldCoinData.weight : 0;
    const newWeight = newCoinData ? newCoinData.weight : 0;

    // Now the buy amount is just the delta here. The actual dollar amount
    // is (the amount in your portfolio) times this, since this says
    // "you need to spend X% of your portfolio buying or selling this".
    const buyAmount = newWeight - oldWeight;

    // Another convenient piece of info to have is the change in your
    // position. If you need to sell it all, that'll be -1. If you need to
    // buy from zero, that's infinity, so call it null.
    // Multiply this by 100 to get the percent change, which is just easier
    // for humans to read. -100 means sell all; 0 means no change; 200 means
    // it's tripled.
    const percentIncreaseInPosition = oldWeight === 0 ? null :
      buyAmount / oldWeight * 100;

    return {
      // These are the key pieces of info
      coinId: id,
      // Hm try renaming this
      weightIncrease: buyAmount,

      // This is nice to provide for future use
      oldWeight: oldWeight,
      newWeight: newWeight,
      percentIncreaseInPosition: percentIncreaseInPosition,
    };


    // // First, if it's in the new basket but not the old, we know we need
    // // to buy ALL of it.
    // if (!(isInOldBasket(id))) {
    //   // It's new here, so we need to buy the WHOLE thing.
    //   const newCoin
    //   buyAmount =
    // }
  });

  // console.log("Buy or sell by weight", buyAndSellOrders);

  return buyAndSellOrders;
}


/**
  Determines what would happen if you rebalanced an index (computed with the
  given generator) every `N` days throughout our sample.
*/
export function analyzeRebalancingSchedule(rebalanceIntervalDays, generator) {
  // We first need to figure out all of the rebalancings we're going to do,
  // realized as the list of timestamps we're going to rebalance on.
  // We don't technically rebalance at timestamp 0 (the start of our sample).
  const availableTimestamps = getAllSupportedTimestamps();
  const timestampIndicesToRebalanceOn = getMultiplesUpTo(
    rebalanceIntervalDays, availableTimestamps.length);

  // console.log(timestampIndicesToRebalanceOn);

  // Now look up the list of timestamps to actually rebalance on
  const timestampsToRebalanceOn = timestampIndicesToRebalanceOn.map(
    n => availableTimestamps[n]);
  //
  // console.log("Rebalance on", timestampsToRebalanceOn.map(
  //   t => makeReadableTimestamp(t)));

  // If there are `n` timestamps to rebalance on, there will be `n`
  // rebalancings. Each one will be based on the prior one... except the first,
  // which will be based on the baseline (day 0).

  // The code is cleaner if we include day 0 as a "rebalancing" date but
  // start rebalancing with index 1.
  // const timestampsToRebalanceOnPlusZero = [0, ...timestampsToRebalanceOn];

  const rebalancings = timestampsToRebalanceOn.map((thisTimestamp, i) => {
    // Figure out the previous basket we will compare against. This is
    // the `i-1`th basket, or the baseline if `i=0`.
    const lastRebalanceTimestamp = i === 0 ? availableTimestamps[0]
      : timestampsToRebalanceOn[i-1];

    // Now we can compute how rebalancing would go
    const buyAndSellOrders = determineRebalanceDelta(lastRebalanceTimestamp,
      thisTimestamp, generator);

    // The amount of money bought should be equal to the amount sold (but
    // with the sign flipped). Just check this...
    // EDIT: yes, this is true, just checked. No need to run the code.
    // To get amount bought, just zero out the sales and sum it all up
    // const amountBought = _.sum(
    //   buyAndSellOrders.map(order => Math.max(0, order.weightIncrease)));
    // // The reverse applies to sales
    // const amountSold = _.sum(
    //   buyAndSellOrders.map(order => Math.min(0, order.weightIncrease)));
    //
    // console.log("Bought", amountBought);
    // console.log("Sold", amountSold);

    // Another interesting question we may ask of this dataset is, what's the
    // net "churn"? This is the total amount of coins that we'd have to buy
    // and sell to implement this rebalancing. This is relevant since we
    // usually pay fees proportional to the churn.
    // Buying and selling count equally, so use the absolute-value function
    console.log(buyAndSellOrders);
    const churn = _.sum(
      buyAndSellOrders.map(order => Math.abs(order.weightIncrease)));

    // Now we can return data about it
    return {
      // Metadata
      timestamp: thisTimestamp,
      readableTimestamp: makeReadableTimestamp(thisTimestamp),
      rebalancingNumber: i,

      // Now, payload
      // This is an array of dicts containing data on what you're buying
      // and selling
      buyAndSellOrders: buyAndSellOrders,
      // This is the amount of churn we'd run into -- the total amount of money
      // (relative to our portfolio size) that we'd be buying or selling.
      // Buy amount should be equal to sell amount.
      churn: churn,
    };
  });

  // Each rebalancing will have a lot of data about what you'd buy and sell.
  return rebalancings;
}


/**
  Compares churn (total amount transacted during rebalances)
  for multiple values of:

  - The frequency of rebalancing, in days
  - The size of the index

  Given a certain generator function. Here, pass a unary function like
  `makeSquareRootGenerator` (don't invoke it! we're going to invoke it!)

  Returns a dict that you can write to CSV. It compares churn for each
  (frequency, index) pair for your given generator.
*/
export function computeChurnForRebalancingStrategy(generatorFn) {
  // Try a bunch of different rebalancing frequences
  const rebalancingFrequencies = [364];
  // And try a bunch of different index sizes
  const indexSizes = [5];

  // Now go through the cross product of these (i.e. each pair of
  // frequency & index size) and compute churn for each combination.
  // To analyze the data, we'll want to output it into a 2x2 CSV where
  // there's 1 row per frequency and 1 row per index size (and the filename
  // is the generator name). So let's construct that.
  // To do this, we need to create one dict per frequency
  const churnDicts = rebalancingFrequencies.map(frequency => {
    // And inside each dict, we'll have 1 column for each index size.
    // It's easiest to just construct this imperatively.
    // We'll calculate churn for each and add a column for it.
    const churnDict = {
      frequencyDays: frequency,
    };

    indexSizes.forEach(indexSize => {
      // Get data on the rebalancing
      const rebalancingResults = analyzeRebalancingSchedule(
        frequency,
        generatorFn(indexSize),
      );
      // This includes a list of rebalancings, each of which store their
      // net churn
      const churn = _.sumBy(rebalancingResults, r => r.churn);

      // Add it to the dict
      churnDict[`size${indexSize}`] = churn;
    });

    return churnDict;
  });

  // Now we can write this to file. But we won't do that here; we'll just
  // return our findings.
  // console.log(churnDict);
  return churnDicts;
}

/**
  Iterates through all index generator types and reports on the (frequency,
  indexSize) => churn results for each. This will be useful in analyzing
  which frequency makes the most sense for rebalancing.
  Writes the results to file.
*/
export function writeChurnReports() {
  // For each of our known index generator types (square root, etc.),
  // we can compute churn stats
  // Note that this is different than the generators themselves! These are
  // *families* of generators, like the equal-weighted strategy. Not an
  // individual generator like the equal-weighted-20 one.
  const generatorFamilies = [
    {
      generatorFn: makeMarketCapWeightedGenerator,
      name: "marketcap-weighted"
    },
    {
      generatorFn: makeEqualWeightedGenerator,
      name: "equal-weighted"
    },
    {
      generatorFn: makeSquareRootGenerator,
      name: "square-root"
    },
    {
      // The capped generators where there's a max 5% weighting.
      // Since this is a 2-arg function, it has to be curried to become unary.
      generatorFn: (size) => makeCappedGenerator(size, 5),
      name: "capped-5"
    },
    {
      // The capped generators where there's a max 5% weighting.
      // Since this is a 2-arg function, it has to be curried to become unary.
      generatorFn: (size) => makeCappedGenerator(size, 10),
      name: "capped-10"
    },
    {
      // The capped generators where there's a max 5% weighting.
      // Since this is a 2-arg function, it has to be curried to become unary.
      generatorFn: (size) => makeCappedGenerator(size, 20),
      name: "capped-20"
    },
  ];

  // Now we can compute some churn data
  generatorFamilies.forEach(generatorFamily => {
    // Get churn data for this
    const churnData = computeChurnForRebalancingStrategy(
      generatorFamily.generatorFn);

    // Write to file
    writeDictToCsv(churnData, `newresults/churn/${generatorFamily.name}.csv`);
  });
}

writeChurnReports();

// compareChurnByRebalancingStrategy(makeSquareRootGenerator);

// const res = analyzeRebalancingSchedule(7, makeSquareRootGenerator(20));
// console.log("Rebalancings", res);
// // console.log("Last rebalance", res[res.length-1]);
// const totalChurn = _.sumBy(res, r => r.churn);
// console.log("Total churn", totalChurn);

//
// const availableTimestamps = getAllSupportedTimestamps();
// const result = determineRebalanceDelta(
//   // From oldest...
//   availableTimestamps[0],
//   // To newest...
//   availableTimestamps[availableTimestamps.length - 1],
//   // For testing, suppose we want to get the top few coins using the
//   // square-root strategy.
//   // I tested it with an equal-weighted generator and it worked too!
//   // In that case, it always returns a 0% change (stayed in index),
//   // -100% change (left index), or `null` change (joined index).
//   // It works with a market-cap-weighted generator too; it has pretty
//   // aggressive rebalancing since a coin could easily gain or lose
//   // a ton of its weight.
//   // makeSquareRootGenerator(10),
//   // makeMarketCapWeightedGenerator(100),
//   // makeEqualWeightedGenerator(100),
//   makeCappedGenerator(20, 10),
// );
//
// console.log("Old weights", _.sum(result.map(c => c.oldWeight)));
// console.log("New weights", _.sum(result.map(c => c.newWeight)));
// console.log("Churn", _.sum(result.map(c => Math.abs(c.weightIncrease))));
