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

const availableTimestamps = getAllSupportedTimestamps();
console.log(generateBasket(
  availableTimestamps[availableTimestamps.length - 1],
  // For testing, suppose we want to get the top 5 coins using the
  // square-root strategy
  makeSquareRootGenerator(5),
));
