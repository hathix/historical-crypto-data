// Get a list of every supported coin on coinbase

import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv, getAllSupportedTimestamps, makeReadableTimestamp, getMarketDataOn } from "./lib.js";
import _ from 'lodash';


// Set up the client
import CoinGecko from 'coingecko-api';
const CoinGeckoClient = new CoinGecko();

// Download the list of coins
const data = await CoinGeckoClient.coins.list();
console.log(data);
