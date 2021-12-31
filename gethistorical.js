// Get historical market data for a coin

import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { writeFile, createReadStream } from 'fs';
import _ from 'lodash';


// For writing files
const dirname = process.cwd(); // Doesn't include the trailing slash


// Set up the client
import CoinGecko from 'coingecko-api';
const CoinGeckoClient = new CoinGecko();


// Outputs the historical pricing data for a given coin to CSV.
async function getHistoricalDataFor(coinId) {

  console.log("Getting ", coinId);

  // This returns an object with { data: { prices, market_caps, total_volumes }}
  // And each of these is an array of `days` items. Each item includes the
  // timestamp of that day and the corresponding value.
  let rawData = await CoinGeckoClient.coins.fetchMarketChart(coinId, {
    days: 365, // integer or 'max'
    vs_currency: 'usd',
  });

  // Sometimes the raw data won't include anything, in which case bail out
  if (rawData.data == null || rawData.data.prices == null) {
    console.log(`No data for ${coinId}, bailing out`);
    return;
  }

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

  // console.log(mergedData);

  // Write to file
  stringify(mergedData, {
    header: true,
  }, (err, output) => {
    writeFile(`${dirname}/coins/${coinId}.csv`, output, () => {
      console.log("done");
    });
  });
}


// coinsOfInterest.forEach(coin => getHistoricalDataFor(coin));
//
// Grab the list of all coins from the coindata file
const parser = parse({columns: true}, function (err, records) {
  // This is an array of coin details (with id, symbol, name)
  // We get 50 operations per minute with the API, so about every ~2 seconds
  // let's grab data for another coin.
  for (let i = 0; i < records.length; i++) {
    // TEMP: let's start over from 1950 since our scraper broke
    // halfway through. If you want to scrape from the beginning
    // in the future, just set j=i
    setTimeout((i) => {
      const j = i + 1950;
      console.log(`Getting data for ${j}: ${records[j].name}`);
      getHistoricalDataFor(records[j].id);
    }, 2000 * i, i);
  }
});
createReadStream(`${dirname}/fullcoinlist.csv`).pipe(parser);
