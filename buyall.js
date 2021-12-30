import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn } from "./lib.js";
import { calcMarketDataOn } from "./calcindex.js";

import _ from "lodash";


/**
  Returns data on the top N coins by market cap on the given timestamp.
*/
export function getTopNCoinsOn(n, timestamp) {
  // Get the full list of coins on this day, sorted by market cap descending
  const coinListSorted = calcMarketDataOn(timestamp);

  // Get just the top N of these
  const topNCoins = coinListSorted.slice(0, n);

  return topNCoins;
}

/**
  If you bought a certain number of dollars of the given coin, how many
  would you own? This returns a new coinData object that adds a "holdings" field.
*/
export function computeHoldingsOf(coinData, dollarsToBuy) {
  // Clone the object
  const newCoinData = _.clone(coinData);

  // Add a new field that's simply the dollars divided by the price
  newCoinData.numCoinsHeld = dollarsToBuy / newCoinData.price;
  // Also report the original cost basis, just so we have it
  newCoinData.costBasis = dollarsToBuy;

  // OK we're good
  return newCoinData;
}


// export function
// console.log(getTopNCoinsOn(10, 1639785600000).map(c => computeHoldingsOf(c, 1000)));

export function run() {
  // Get the oldest data we have
  const timestampsAvailable = getAllSupportedTimestamps();
  const oldestTimestamp = timestampsAvailable[0];

  // Now let's imagine we bought the top 100 coins available then
  const topCoinsOnOldestDay = getTopNCoinsOn(100, oldestTimestamp);

  // Let's imagine we bought, say, $1000 of each
  const ourPortfolio = topCoinsOnOldestDay.map(coinData =>
    computeHoldingsOf(coinData, 1000));

  // Print what we'd have
  // console.log(ourHoldings);


  // Now let's see how this would have performed on each day in our sample
  const holdingsPerDay = timestampsAvailable.map(timestamp => {
    // Get the market data for this day (list of all coins and their market
    // caps)
    const marketDataForThisDay = getMarketDataOn(timestamp);
    // console.log(marketDataForThisDay);

    // For each coin in our portfolio, compute the dollar value of our holdings
    // on this day. e.g. if we held 2 XYZcoin, and today's price was $20 per
    // XYZcoin, our holdings would be worth $40.
    // Just for kicks, let's NOT record just the sum total of all our holdings.
    // Let's compute the value of each individual coin in our portfolio.
    const holdingsForThisDay = ourPortfolio.map(coinData => {
      // Let's get some intermediate values. First, we need to figure out
      // the price of this coin on this day. Look it up in the market data
      // object.
      const dataForThisCoinOnThisDay = _.filter(marketDataForThisDay, data => {
        return data.coinId === coinData.coinId
      })[0];
      // NOTE: this coin might have fallen out of the top list, in which
      // case we can assume it's a completely worthless coin and worth $0.
      // Now we can compute the price
      const coinPrice = dataForThisCoinOnThisDay
        ? dataForThisCoinOnThisDay.price
        : 0;

      // We can now compute how much this holding is worth on this day:
      // the number of coins held times the price of the coin at this moment
      const valueOfHoldings = coinPrice * coinData.numCoinsHeld;

      // Compute how much this coin is now worth. Create a new object.
      // Overwrite the original timestamp with the current timestamp.
      // Main thing we need to port over is the coin ID and the number of
      // coins we hold of it (plus cost basis).
      return {
        // Carry over this info...
        coinId: coinData.coinId,
        numCoinsHeld: coinData.numCoinsHeld,
        costBasis: coinData.costBasis,

        // Put in this fresh new data
        timestamp: timestamp,
        readableTimestamp: makeReadableTimestamp(timestamp),
        price: coinPrice,
        valueOfHoldings: valueOfHoldings,
        // Compute a decimal that represents the performance: 1.00 means
        // no gain or no loss, 0.60 means 40% loss, 1.30 means 30% gain,
        // 2.50 means 150% gain, etc.
        performance: valueOfHoldings / coinData.costBasis,
      };
    });

    // return holdingsForThisDay;

    // So... that's a ton of data. For this day, we have price and volume
    // data for every single coin in our portfolio. Let's also compute
    // the overall portfolio value and cost basis.
    const totalPortfolioValue = _.sum(holdingsForThisDay.map(
      h => h.valueOfHoldings));
    const totalCostBasis = _.sum(holdingsForThisDay.map(
      h => h.costBasis));
    // Like before, compute the performance: value divided by cost basis.
    // 1.50 means 50% gain, 0.80 means 20% loss, etc.
    const overallPerformance = totalPortfolioValue / totalCostBasis;

    // console.log(timestamp, totalPortfolioValue, totalCostBasis, performance);

    // Now report all of this mountain of data
    return {
      // Metadata
      timestamp: timestamp,
      readableTimestamp: makeReadableTimestamp(timestamp),

      // Overall data
      totalPortfolioValue: totalPortfolioValue,
      totalCostBasis: totalCostBasis,
      overallPerformance: overallPerformance,

      // Per-day data
      holdings: holdingsForThisDay,
    };
  });

  console.log(holdingsPerDay[360]);
}


run();
