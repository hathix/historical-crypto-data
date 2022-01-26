/**
  A script that gets the list of all the top coins on CoinGecko right now,
  then writes it to "fullcoinlist.csv".
*/

import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { writeFile, createReadStream } from 'fs';
import _ from 'lodash';

import { writeDictToCsv } from "./lib.js";



// For writing files
const dirname = process.cwd(); // Doesn't include the trailing slash


// Set up the client
import CoinGecko from 'coingecko-api';
const CoinGeckoClient = new CoinGecko();

// You only need to run this once, really. Gets a huge list of
// all the top cryptocurrencies and prints it to stdout, which you can
// send to a CSV file.
async function getCoinList() {
  // Get full list of coins. There are 50 per page, so grab a few.
  console.log("Getting 0");
  let data0 = await CoinGeckoClient.coins.all({
    page: 1,
    per_page: 250,
  });
  console.log(data0);
  console.log("Getting 1");
  let data1 = await CoinGeckoClient.coins.all({
    page: 2,
    per_page: 250,
  });
  console.log("Getting 2");
  let data2 = await CoinGeckoClient.coins.all({
    page: 3,
    per_page: 250,
  });
  console.log("Getting 3");
  let data3 = await CoinGeckoClient.coins.all({
    page: 4,
    per_page: 250,
  });
  console.log("Getting 4");
  let data4 = await CoinGeckoClient.coins.all({
    page: 5,
    per_page: 250,
  });
  console.log("Getting 5");
  let data5 = await CoinGeckoClient.coins.all({
    page: 6,
    per_page: 250,
  });
  console.log("Getting 6");
  let data6 = await CoinGeckoClient.coins.all({
    page: 7,
    per_page: 250,
  });
  console.log("Getting 7");
  let data7 = await CoinGeckoClient.coins.all({
    page: 8,
    per_page: 250,
  });
  console.log("Getting 8");
  let data8 = await CoinGeckoClient.coins.all({
    page: 9,
    per_page: 250,
  });
  console.log("Getting 9");
  let data9 = await CoinGeckoClient.coins.all({
    page: 10,
    per_page: 250,
  });

  console.log("Got all 10 pages");

  // Merge all of these pages into one big list of coin data
  const fullCoinList = [
    ...data0.data,
    ...data1.data,
    ...data2.data,
    ...data3.data,
    ...data4.data,
    ...data5.data,
    ...data6.data,
    ...data7.data,
    ...data8.data,
    ...data9.data,
  ];

  // Extract just the name, id (used for the lookup), and ticker symbol
  const shortCoinList = fullCoinList.map(d => {
    return {
      id: d.id,
      symbol: d.symbol,
      name: d.name,
    }
  });

  console.log(shortCoinList);

  writeDictToCsv(shortCoinList, "fullcoinlist.csv");
}

getCoinList();
