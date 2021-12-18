/**
  Reusable function library.
*/

import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';
import { writeFile, createReadStream, createWriteStream, readFileSync } from 'fs';
import _ from 'lodash';

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
  const coinFile = readFileSync(`${dirname}/coindata.csv`);
  const coinList = parseSync(coinFile, {
    columns: true,
    cast: true,
  });
  return coinList;
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

console.log(getDataForDay(getHistoricalData("1inch"), 1639612800000);
