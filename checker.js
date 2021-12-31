import { readDictFromCSV, getExtendedCoinList, dirname } from "./lib.js";
import { existsSync } from "fs";

/**
  Checks if we've downloaded market data for all coins in the
  extended coin list.
*/
export function checkIfAllCoinsHaveData() {
  // Here are all the coins we need to check...
  const allCoins = getExtendedCoinList();

  // Now check if files for each of them exist
  allCoins.forEach(coin => {
    const doesFileExist = existsSync(`${dirname}/coins/${coin.id}.csv`);

    console.log(`${coin.id} exists: ${doesFileExist}`);
  });
}


checkIfAllCoinsHaveData();
