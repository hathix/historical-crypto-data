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
  // back on Jan 1, 2021
  const innerParser = parse({columns: true}, function(innerErr, innerRecords) {
    // This is the contents of one of the CSV files for each coin.
    // Once we get this, look up the row where t=1609459200000
    // (That's Jan 1, 2021)
    
  });
  // Loop over each record
  records.forEach(record => {
    createReadStream(`${dirname}/coins/${record.id}.csv`).pipe(innerParser);
  });
});
createReadStream(`${dirname}/coindata.csv`).pipe(parser);
