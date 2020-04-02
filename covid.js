const request = require('request');

function getCovidStats(stateName, callback) {
  request('https://api.covid19india.org/v2/state_district_wise.json', { json: true }, (err, res, body) => {
    if (err) {
      return callback(err.message);
    }

    if (stateName && stateName.length > 0) {
      callback(getForState(body, stateName));
    } else {
      callback(getAllStates(body).msg);
    }
  });
}

function getAllStates(statesData) {
  const result = statesData.reduce((acc, stateData) => {
    let countMsg = sumForState(stateData);
    if (countMsg) {
      let count = countMsg.total;
      acc.msg += `\n${stateData.state}: ${count}`;
      acc.total += count;
      return acc;
    } else {
      return acc;
    }
  }, { total: 0, msg: '<code>All States' });

  result.msg = `${result.msg}\nTotal: ${result.total}</code>`;
  return result;
}

function getForState(statesData, stateName) {
  stateName = stateName.toLowerCase()
  let stateData = statesData.find(data => data.state.toLowerCase() === stateName);
  return stateData ? sumForState(stateData).msg : 'Could not find the search term';
}

function sumForState(stateData) {
  // Their website ignores this number
  if (stateData.state === 'Unknown')
    return;
  const result = stateData.districtData
    .reduce((acc, district) => {
      acc.msg += `\n${district.district}: ${district.confirmed}`;
      acc.total += district.confirmed;
      return acc;
    }, { total: 0, msg: `<code>${stateData.state}` });

  result.msg += `\nTotal: ${result.total}</code>`;
  return result;
}

module.exports.getCovidStats = getCovidStats;