import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';
import { writeFile, createReadStream, createWriteStream, readFileSync } from 'fs';
import _ from 'lodash';

// For writing files
const dirname = process.cwd(); // Doesn't include the trailing slash


// Get ready to write price data here
// const writeStream = createWriteStream(`${dirname}/history/jan1.txt`, { flags: 'a' });

// // We're going to get the prices and market caps of each coin on 1/1/21
// // Read the whole list of coins on coingecko
// const parser = parse({columns: true}, function (err, records) {
//   // This is an array of coin details (with id, symbol, name).
//   // Once we get this, read the prices & market caps of each coin
//   // back on Jan 1, 2021
//   const innerParser = parse({columns: true}, function(innerErr, innerRecords) {
//     // This is the contents of one of the CSV files for each coin.
//     // Once we get this, look up the row where t=1609459200000
//     // (That's Jan 1, 2021)
//
//     // And then store the price and market cap . Just write a line to
//     // a file (this can be done in parallel hopefully)
//
//     const matchingRecords = innerRecords.filter(record => {
//       return record.timestamp === 1609459200000;
//     });
//     if (matchingRecords.length > 0) {
//       const record = matchingRecords[0];
//       console.log("Writing", record);
//       stream.write(`${record.coinId}, ${record.price}, ${record.marketCap}`);
//     }
//
//   });
//   // Loop over each record
//   records.forEach(record => {
//     createReadStream(`${dirname}/coins/${record.id}.csv`).pipe(innerParser);
//   });
// });
// createReadStream(`${dirname}/coinlist.csv`).pipe(parser);


/**
  Extracts prices for all of the top 500 cryptocurrencies at the given
  timestamp.
*/
function extractPricesAt(timestamp) {
  // Jan 1, 2021
  // const STARTING_TIMESTAMP = 1609459200000;

  // Read our list of all the top coins
  const rawCoinData = readFileSync(`${dirname}/coinlist.csv`);
  const coinList = parseSync(rawCoinData, {columns: true});
  // console.log(records);

  // Now get the prices and market caps of each coin on 1/1/21
  const onThisDayDataRaw = coinList.map(coinList => {
    // Read the CSV for that coin
    const coinHistoryFile = readFileSync(`${dirname}/coins/${coinList.id}.csv`);
    const coinHistoryData = parseSync(coinHistoryFile, {columns: true});

    // Grab data for our chosen day
    const matchingRecords = coinHistoryData.filter(record => {
      return +record.timestamp === timestamp;
    });

    if (matchingRecords.length > 0) {
      const record = matchingRecords[0];
      return {
        coinId: record.coinId,
        timestamp: +record.timestamp,
        readableTimestamp: record.readableTimestamp,
        price: +record.price,
        marketCap: +record.marketCap,
        totalVolume: +record.totalVolume,
      }
    }
    else {
      return undefined;
    }
  });
  const onThisDayData = _.compact(onThisDayDataRaw);
  // console.log(onThisDayData);

  // Write this to a file
  // Write to file
  stringify(onThisDayData, {header: true}, (err, output) => {
    writeFile(`${dirname}/history/${timestamp}.csv`, output, () => {
      console.log("done " + timestamp);
    });
  });
}

// Jan 1
extractPricesAt(1609459200000);
// June 1
extractPricesAt(1622505600000);
// Today, 12/17/21
extractPricesAt(1639699200000);
