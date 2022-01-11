import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn, readDictFromCSV, getExtendedCoinList, excludeStablecoinsAndDerivatives, dotProduct, scaleToSumToOne, toNDecimalPlaces } from "./lib.js";
import { getTopCoinsOnDayMultipleNs, MOON_AND_RUG_DIVISOR, MOON_AND_RUG_SIZES } from "./buyallvsindex.js";
import { makeMarketCapWeightedIndex, makeSquareRootGenerator, makeEqualWeightedGenerator, makeCappedGenerator, INDEX_GENERATOR_FUNCTIONS } from "./newindices.js";

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
  // We'll call these Category 1, 2, and 3.

  // Let's partition the coins into each category first.
  // Get the IDs of the coins, then we can do some looking up
  const oldBasketCoinIds = oldBasket.map(coin => coin.coinId);
  const newBasketCoinIds = newBasket.map(coin => coin.coinId);

  console.log("Old basket", oldBasketCoinIds);
  console.log("New basket", newBasketCoinIds);

  // Join the lists, which will give us a list of all the coins we need to
  // worry about buying or selling. This is the union of all coins in the
  // old basket, the new basket, or both.
  const allCoinIds = _.union(oldBasketCoinIds, newBasketCoinIds);

  // Now we can figure out which coins are in each category (well, at least
  // their IDs). First, some convenience functions...
  const isInOldBasket = (id) => _.indexOf(oldBasketCoinIds, id) !== -1;
  const isInNewBasket = (id) => _.indexOf(newBasketCoinIds, id) !== -1;

  const coinIdsStillInBasket = allCoinIds.filter(id => {
    return isInOldBasket(id) && isInNewBasket(id);
  });
  const coinIdsInNewButNotOld = allCoinIds.filter(id => {
    return !(isInOldBasket(id)) && isInNewBasket(id);
  });
  const coinIdsInOldButNotNew = allCoinIds.filter(id => {
    return isInOldBasket(id) && !(isInNewBasket(id));
  });

  // Now we can do different logic for each
  console.log("In old and new baskets", coinIdsStillInBasket);
  console.log("New addition", coinIdsInNewButNotOld);
  console.log("Outta here", coinIdsInOldButNotNew);
}

const availableTimestamps = getAllSupportedTimestamps();
determineRebalanceDelta(
  // From oldest...
  availableTimestamps[0],
  // To newest...
  availableTimestamps[availableTimestamps.length - 1],
  // For testing, suppose we want to get the top few coins using the
  // square-root strategy
  makeSquareRootGenerator(10),
);
