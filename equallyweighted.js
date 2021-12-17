import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { writeFile, createReadStream } from 'fs';
import _ from 'lodash';

// For writing files
const dirname = process.cwd(); // Doesn't include the trailing slash


// Read the whole list of coins on coingecko
const parser = parse({columns: true}, function (err, records) {
  // This is an array of coin details (with id, symbol, name).
  // Once we get this, read the prices & market caps of each coin
  // back on Jan 1 20
  for (let i = 0; i < records.length; i++) {
    setTimeout((i) => {
      console.log(`Getting data for ${records[i].name}`);
      getHistoricalDataFor(records[i].id);
    }, 2000 * i, i);
  }
});
createReadStream(`${dirname}/coindata.csv`).pipe(parser);
