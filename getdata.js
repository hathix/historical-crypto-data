// Get historical market data for a coin

import { stringify } from 'csv-stringify';
import { writeFile } from 'fs';
import _ from 'lodash';


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
  let data0 = await CoinGeckoClient.coins.all({
    page: 0,
  });
  let data1 = await CoinGeckoClient.coins.all({
    page: 1,
  });
  let data2 = await CoinGeckoClient.coins.all({
    page: 2,
  });
  let data3 = await CoinGeckoClient.coins.all({
    page: 3,
  });
  let data4 = await CoinGeckoClient.coins.all({
    page: 4,
  });

  // Merge all of these pages into one big list of coin data
  const fullCoinList = [
    ...data0.data,
    ...data1.data,
    ...data2.data,
    ...data3.data,
    ...data4.data,
  ];

  // Extract just the name, id (used for the lookup), and ticker symbol
  const shortCoinList = fullCoinList.map(d => {
    return {
      id: d.id,
      symbol: d.symbol,
      name: d.name,
    }
  });

  // console.log(shortCoinList);

  // Write to standard output; you can send it to a file
  stringify(shortCoinList, {
    header: true,
  }, (err, output) => {
    console.log(output);
  });
}

// getCoinList();


// Prints the historical pricing data for a given coin.
async function getHistoricalDataFor(coinId) {
  // This returns an object with { data: { prices, market_caps, total_volumes }}
  // And each of these is an array of `days` items. Each item includes the
  // timestamp of that day and the corresponding value.
  let rawData = await CoinGeckoClient.coins.fetchMarketChart(coinId, {
    days: 100, // integer or 'max'
    vs_currency: 'usd',
  });
  const prices = rawData.data.prices;
  const marketCaps = rawData.data.market_caps;
  const totalVolumes = rawData.data.total_volumes;

  // Each of these has the same keys but different values. Let's zip
  // them together.
  const timestamps = prices.map(([timestamp, price]) => timestamp);
  // Now extract the price, market cap, and volume at that price.
  // Remember that each is an array of tuples where the timestamp is the
  // 0th element and the payload is the 1st.
  const mergedData = timestamps.map((timestamp, i) => {
    return {
      timestamp: timestamp,
      readableTimestamp: new Date(timestamp).toLocaleString(
        'en-US', { timeZone: 'UTC' }),
      coinId: coinId,
      price: prices[i][1],
      marketCap: marketCaps[i][1],
      totalVolume: totalVolumes[i][1],
    }
  });

  console.log(mergedData);

  // Write to file
  stringify(mergedData, {
    header: true,
  }, (err, output) => {
    writeFile(`${dirname}/coins/${coinId}.csv`, output, () => {
      console.log("done");
    });
  });
}

getHistoricalDataFor('bitcoin');
