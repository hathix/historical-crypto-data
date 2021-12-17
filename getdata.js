// Get historical market data for a coin

import { stringify } from 'csv-stringify';
import { writeFile } from 'fs';

// Set up the client
import CoinGecko from 'coingecko-api';
const CoinGeckoClient = new CoinGecko();

async function run() {
  // let data = await CoinGeckoClient.coins.fetchMarketChart('bitcoin', {
  //   days: 10, // integer or 'max'
  //   vs_currency: 'usd',
  // });
  // console.log(data);


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

run();
