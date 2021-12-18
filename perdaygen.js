import { dirname, getCoinList, getHistoricalData, getDataForDay, dateToTimestamp, writeDictToCsv } from "./lib.js";

/**
  Returns the market data for all 500 coins we track on the given
  timestamp.
  The coinList is the output of getCoinList(), which includes the names and ids
  of all coins we track.
*/
export function getAllCoinsOnDay(coinList, timestamp) {
  // Get a list of all coin IDs
  const coinIds = coinList.map(record => record.id);

  // Let's look into its file and grab the data for each.
  // This will give us market cap data for the given day.
  const dailyData = coinIds.map(id => {
    // If the data we get back is undefined, just give an empty array
    // instead of undefined.
    return getDataForDay(getHistoricalData(id), timestamp) || {};
  });

  return dailyData;
}

const coinList = getCoinList();
// console.log();

// Get a list of all the timestamps we've tracked. Pull up the oldest coin
// (Bitcoin) and extract its list of timestamps.
const timestamps = getHistoricalData("bitcoin").map(record => record.timestamp);
// console.log(timestamps);

// The last timestamp is some random leftover timestamp from the middle of the
// day when we pulled the data. So exclude that. We only care about the
// full days.
timestamps.slice(0, -1).forEach(timestamp => {
  // Get data for this day
  const dataForDay = getAllCoinsOnDay(coinList, timestamp);
  console.log("Got data for", timestamp);

  // Let's write this to file so we don't have to hit all 500 files over and
  // over again.
  writeDictToCsv(dataForDay, `perday/${timestamp}.csv`);
});
