/**
  Reusable function library.
*/

import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';
import { writeFile, createReadStream, createWriteStream, readFileSync } from 'fs';
import _ from 'lodash';

import { STABLECOIN_IDS, DERIVATIVE_IDS, STABLECOIN_REGEXES, DERIVATIVE_REGEXES } from "./constants.js";

// For reading/writing files
export const dirname = process.cwd(); // Doesn't include the trailing slash


/**
  Synchronously reads and returns the list of all coins we track.
  Each record will include:

  - id
  - symbol
  - name

  All are strings.
*/
export function getCoinList() {
  // Read our list of all the top coins
  const coinFile = readFileSync(`${dirname}/coinlist.csv`);
  const coinList = parseSync(coinFile, {
    columns: true,
    cast: true,
  });
  return coinList;
}

/**
  Gets data on all 2500 coins in the extended list.
*/
export function getExtendedCoinList() {
  return readDictFromCSV("fullcoinlist.csv");
}

/**
  Reads the CSV from the given file into a CSV. No need to put
  the directory name at the front; we'll append that. Just pass
  like `filename.txt`.
*/
export function readDictFromCSV(filename) {
  const file = readFileSync(`${dirname}/${filename}`);
  return parseSync(file, {
    columns: true,
    cast: true,
  });
}

/**
  Synchronously gets the historical market data for a coin with the
  given ID (use getCoinList() for a list of those).
  The returned value is an array of dicts, each of which represents a certain
  day. It includes:

  - timestamp: number
  - readableTimestamp: string
  - coinId: string
  - price: number
  - marketCap: number
  - totalVolume: number
*/
export function getHistoricalData(coinId) {
  // Read the CSV for that coin
  const coinHistoryFile = readFileSync(`${dirname}/coins/${coinId}.csv`);
  const coinHistoryData = parseSync(coinHistoryFile, {
    columns: true,
    cast: true,
  });
  return coinHistoryData;
}

// console.log(getHistoricalData("shiba-inu"));

/**
  Given historical data about a coin (from getHistoricalData())
  and a timestamp, returns an object with market data about that coin on
  that timestamp. Includes:

  - timestamp: number
  - readableTimestamp: string
  - coinId: string
  - price: number
  - marketCap: number
  - totalVolume: number

  If nothing matches the given timestamp, returns undefined.
*/
export function getDataForDay(historicalCoinData, timestamp) {
  return historicalCoinData.filter(record => {
    return +record.timestamp === +timestamp;
  })[0];
}

/**
  Makes a numerical timestamp (for midnight UTC) out of the given date string,
  such as "December 1, 2021".
*/
export function dateToTimestamp(dateString) {
  return +(new Date(`${dateString} UTC`));
}

// console.log(getDataForDay(getHistoricalData("1inch"), 1639612800000));
// console.log(
//   getDataForDay(
//     getHistoricalData("1inch"),
//     dateToTimestamp("December 16, 2021"),
//   )
// );

/**
  Asynchronously writes the given dict to a given CSV file. You do not
  need to provide the `dirname`; we'll take care of that.
  e.g. pass:
    writeDictToCsv(myDict, "data/hello.csv")
*/
export function writeDictToCsv(dict, filename) {
  console.log("Writing to ", filename);
  stringify(dict, {header: true}, (err, output) => {
    writeFile(`${dirname}/${filename}`, output, () => {
      console.log("done " + filename);
    });
  });
}



/**
  Synchronously reads and returns the market cap data for the given day.
  There's one record per crypto, each of which includes:

  - timestamp: number
  - readableTimestamp: string
  - coinId: string
  - price: number
  - marketCap: number
  - totalVolume: number
*/
export function getMarketDataOn(timestamp) {
  // Read our list of all the top coins
  const marketFile = readFileSync(`${dirname}/perday/${timestamp}.csv`);
  const marketList = parseSync(marketFile, {
    columns: true,
    cast: true,
  });

  // Some of the dicts we get out might be empty (since some CSV rows are empty)
  // so exclude those.
  return marketList.filter(record => record.coinId.length > 0);
}

/**
  Returns a list of all timestamps that we have proper market data for.
*/
export function getAllSupportedTimestamps() {
  // Get a list of all the timestamps we've tracked. Pull up the oldest coin
  // (Bitcoin) and extract its list of timestamps.
  const timestamps = getHistoricalData("bitcoin").map(record => record.timestamp);

  // Again ignore the final timestamp since that's an incomplete one
  // for like some random point in the day when we actually pulled the data
  const realTimestamps = timestamps.slice(0, -1);

  // Cut it down for testing's sake
  // return realTimestamps.slice(0,5);

  return realTimestamps;
}

/**
  Returns a nice stringified representation of the given timestamp.
*/
export function makeReadableTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', { timeZone: 'UTC' });
}

/**
  Returns true if the given string matches ANY regex in the given array,
  else false.
*/
export function doesStringMatchAnyRegex(string, regexes) {
  // Just loop through each regex and short-circuit once we've found
  // one that matches
  for (let i = 0; i < regexes.length; i++) {
    if (regexes[i].test(string)) {
      return true;
    }
  }
  // If we've gotten here, nothing matches
  return false;
}



/**
  Given a list of coins, excludes the ones known to be stablecoins
  and derivatives (e.g. Compound or wrapped versions).
*/
export function excludeStablecoinsAndDerivatives(coinList) {
  return coinList
    .filter(record => {
      // Exclude anything that's in the list of stablecoins or
      // derivatives (using either our string list or regex list)
      return STABLECOIN_IDS.indexOf(record.coinId) === -1
        && DERIVATIVE_IDS.indexOf(record.coinId) === -1
        && !(doesStringMatchAnyRegex(record.coinId,
          [...STABLECOIN_REGEXES, ...DERIVATIVE_REGEXES]));
    });
}


/**
  Returns the dot product of two vectors. This multiplies the corresponding
  items at each index `i` and sums 'em up.
    dotProduct([1,2,3],[4,5,6]) = 1*4 + 2*5 + 3*6.
*/
export function dotProduct(listA, listB) {
  // Make a list of products of the `i`th elements.
  // I'm throwing away the iteration item for readability.
  const products = listA.map((__, i) => listA[i] * listB[i]);
  return _.sum(products);
}

/**
  Given a list of numbers, scales them all up or down such that the whole
  list sums to 1, while preserving the relationships between numbers
  (i.e. if A is twice as large as B, it will remain that way). Useful as a
  way or normalizing lists whose numbers are of wildly variable orders
  of magnitude.
*/
export function scaleToSumToOne(nums) {
  // Just divide everything by the sum
  const sum = _.sum(nums);
  return nums.map(n => n / sum);
}
