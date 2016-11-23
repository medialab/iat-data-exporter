var fs = require('fs');
var csvParser = require('papaparse');

/**
 * Parse metadata and return a metadata file.
 *
 * @param  {array} meta The metadata for all user, that we'll traverse.
 * @param  {array} iat  The IAT data for all user, that we'll traverse.
 * @return {string}     The parsed, CSV formatted data.
 */
var metaData = function (meta, iat) {
  // Define header labels while initializing the payload.
  var toCsv = [[
    'Player.id_in_group', 'Participant.code', 'Participant.label',
    'Participant.time_started', 'Trials order', 'Error percentage'
  ]];

  // Recursively traverse and process entries of metadata.
  // Accumulate it into the payload array.
  toCsv.push((function processRow(meta, iat, cursor, results) {
    if (cursor >= meta.length - 1) return results;

    var row = meta[cursor].split(',');

    results.push([row[0], row[1], row[2], row[10], iat[cursor].order, iat[cursor].error_percentage]);

    return processRow(meta, iat, ++cursor, results)
  })(meta, iat, 0, []));

  // Transform the array of data into a CSV formatted string and return it.
  return csvParser.unparse(toCsv);
};

/**
 * Generic function to parse and return CSV formatted data for a user's results and errors.
 *
 * @param  {array} meta                   The metadata for all user, that we'll traverse.
 * @param  {array} iat                    The IAT data for all user, that we'll traverse.
 * @param  {array} headerLabelsArray      An array of strings representing header label names.
 * @param  {array} timeRelatedFieldsArray An array of strings bearing the names of fields used for time-related data,
 *                                        varying from one set of data to another.
 * @return {string}                       The parsed, CSV formatted data.
 */
var trialsFile = function (meta, iat, headerLabelsArray, timeRelatedFieldsArray) {
  var toCsv = [headerLabelsArray];

  // Recursively traverse and process each user.
  toCsv = toCsv.concat((function processUser(meta, iat, cursor, results) {
    if (cursor >= iat.length - 1) return results;

    // Prepare meta data for the user. We'll need to pluck only a small amount of it.
    metaData = meta[cursor].split(',');

    // Prepare IAT results for the user.
    var userResults = iat[cursor].results;

    // Recursively traverse and process IAT results for the user.
    (function processRow(mTurkId, code, label, timeStarted, data, index, results) {
      if (index >= data.length - 1) return results;

      // Accumulate the common data...
      // Prune HTML formatting when needed.
      var row = [
        data[index].id, mTurkId, code, label, timeStarted,
        data[index].left.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].right.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].stimuli, data[index].correctPosition,
        data[index].correctCategory.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
      ];

      // ...and granularily obtain time-related data, as it varies in `results` and `errors` sets.
      row = row.concat(timeRelatedFieldsArray.map(function (field) {
        return data[index][field];
      }));

      results.push(row);

      return processRow(mTurkId, code, label, timeStarted, data, ++index, results);
    })('N/A', metaData[1], metaData[2], metaData[10], userResults, 0, results);

    return processUser(meta, iat, ++cursor, results);
  })(meta, iat, 0, []));

  // Transform the array of data into a CSV formatted string and return it.
  return csvParser.unparse(toCsv);
};

/**
 * Parse the `results` sets and generate a CSV formatted string.
 *
 * @param  {array} meta The metadata for all user, that we'll traverse.
 * @param  {array} iat  The IAT data for all user, that we'll traverse.
 * @return {string}     The parsed, CSV formatted data.
 */
var resultsData = function (meta, iat) {
  return trialsFile(meta, iat, [
    'Trial ID', 'Player MTurk ID', 'Code', 'Label', 'Time started', 'Left category',
    'Right category', 'Stimuli word', 'Correct position',
    'Correct category', 'Time taken'
  ], ['timing']);
};

/**
 * Parse the `errors` sets and generate a CSV formatted string.
 *
 * @param  {array} meta The metadata for all user, that we'll traverse.
 * @param  {array} iat  The IAT data for all user, that we'll traverse.
 * @return {string}     The parsed, CSV formatted data.
 */
var errorsData = function (meta, iat) {
  return trialsFile(meta, iat, [
    'Trial ID', 'Player MTurk ID', 'Code', 'Label', 'Time started', 'Left category',
    'Right category', 'Stimuli word', 'Correct position',
    'Correct category', 'Failed by time out', 'Time taken'
  ], ['timedOut', 'timing']);
};

module.exports = function (pathToFile) {
  // Read the given file (hopefully the one that was downloaded).
  // Return a promise that'll resolve an object,
  // with fields bearing CSV formatted strings for
  // `results`, `errors`, and `meta` data sets.
  return new Promise(function (resolve, reject) {
    fs.readFile(pathToFile, 'utf8', function(err, contents) {
      var lines = contents.split('\n');
      var data = {meta: [], iat: []};

      (function processLine(lines, cursor, results, percent) {
        if (cursor >= lines.length - 1) return results;

        var line = lines[cursor];

        // Get non-IAT data.
        var raw = line.indexOf('"') > -1 ?
                  line.substring(0, line.indexOf('"') - 2) :
                  null;

        if (!raw) {
          processLine(lines, ++cursor, results, percent);
          return;
        }

        // Get JSON data payload from IAT.
        var iat = line.indexOf('"{""') > -1 ?
                  line.substring(line.indexOf('"{""') + 1 , line.length - 5) :
                  null;

        if (!iat) {
          processLine(lines, ++cursor, results, percent);
          return;
        }

        // For some reason, double-quotes are doubled again in the file.
        // Clean them.
        iat = iat.split('""').join('"').trim();

        try {
          iat = JSON.parse(iat);
          results.meta.push(raw);
          results.iat.push(iat);
        } catch (err) {
          // Errors might occur during parsing, empirically...
          // Not necessarily a big deal (e.g. unknown characters).
          console.log('Caught an error while parsing IAT data — ', err.message);
        }

        // Update `percent` module with a rough estimate of the progress.
        percent((cursor / lines.length - 1) / 100);

        return processLine(lines, ++cursor, results, percent);
      })(lines, 0, data, require('./percent'));

      return resolve({
        meta: metaData(data.meta, data.iat),
        results: resultsData(data.meta, data.iat),
        errors: errorsData(data.meta, data.iat)
      })
    });
  });
};
