var fs = require('fs');
var csvParser = require('papaparse');

var metaDataFile = function (meta, iat) {
  var toCsv = [[
    'Player.id_in_group', 'Participant.code', 'Participant.label',
    'Participant.time_started', 'Trials order', 'Error percentage'
  ]];

  toCsv.push((function processRow(meta, iat, cursor, results) {
    if (cursor >= meta.length - 1) return results;

    var row = meta[cursor].split(',');

    results.push([row[0], row[1], row[2], row[10], iat[cursor].order, iat[cursor].error_percentage]);

    return processRow(meta, iat, ++cursor, results)
  })(meta, iat, 0, []));

  return csvParser.unparse(toCsv);
};

var trialsFile = function (meta, iat, headerLabelsArray, timeRelatedFieldsArray) {
  var toCsv = [headerLabelsArray];

  toCsv = toCsv.concat((function processUser(meta, iat, cursor, results) {
    if (cursor >= iat.length - 1) return results;

    metaData = meta[cursor].split(',');

    var userResults = iat[cursor].results;

    (function processRow(mTurkId, code, label, timeStarted, data, index, results) {
      if (index >= data.length - 1) return results;

      var row = [
        data[index].id, mTurkId, code, label, timeStarted,
        data[index].left.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].right.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].stimuli, data[index].correctPosition,
        data[index].correctCategory.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
      ];

      row = row.concat(timeRelatedFieldsArray.map(function (field) {
        return data[index][field];
      }));

      results.push(row);

      return processRow(mTurkId, code, label, timeStarted, data, ++index, results);
    })('N/A', metaData[1], metaData[2], metaData[10], userResults, 0, results);

    return processUser(meta, iat, ++cursor, results);
  })(meta, iat, 0, []));

  return csvParser.unparse(toCsv);
};

var resultsFile = function (meta, iat) {
  return trialsFile(meta, iat, [
    'Trial ID', 'Player MTurk ID', 'Code', 'Label', 'Time started', 'Left category',
    'Right category', 'Stimuli word', 'Correct position',
    'Correct category', 'Time taken'
  ], ['timing']);
  /*var toCsv = [[
    'Trial ID', 'Player MTurk ID', 'Code', 'Label', 'Time started', 'Left category',
    'Right category', 'Stimuli word', 'Correct position',
    'Correct category', 'Time taken'
  ]];

  toCsv = toCsv.concat((function processUser(meta, iat, cursor, results) {
    if (cursor >= iat.length - 1) return results;

    metaData = meta[cursor].split(',');

    var userResults = iat[cursor].results;

    (function processRow(mTurkId, code, label, timeStarted, data, index, results) {
      if (index >= data.length - 1) return results;

      results.push([
        data[index].id, mTurkId, code, label, timeStarted,
        data[index].left.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].right.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].stimuli, data[index].correctPosition,
        data[index].correctCategory.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].timing
      ]);

      return processRow(mTurkId, code, label, timeStarted, data, ++index, results);
    })('N/A', metaData[1], metaData[2], metaData[3], userResults, 0, results);

    return processUser(meta, iat, ++cursor, results);
  })(meta, iat, 0, []));

  return csvParser.unparse(toCsv);*/
};

var errorsFile = function (meta, iat) {
  return trialsFile(meta, iat, [
    'Trial ID', 'Player MTurk ID', 'Code', 'Label', 'Time started', 'Left category',
    'Right category', 'Stimuli word', 'Correct position',
    'Correct category', 'Failed by time out', 'Time taken'
  ], ['timedOut', 'timing']);
  /*var toCsv = [[
    'Trial ID', 'Player MTurk ID', 'Code', 'Label', 'Time started', 'Left category',
    'Right category', 'Stimuli word', 'Correct position',
    'Correct category', 'Failed by time out', 'Time taken'
  ]];

  toCsv = toCsv.concat((function processUser(meta, iat, cursor, results) {
    if (cursor >= iat.length - 1) return results;

    metaData = meta[cursor].split(',');

    var userErrors = iat[cursor].errors;

    (function processRow(mTurkId, code, label, timeStarted, data, index, results) {
      if (index >= data.length - 1) return results;

      results.push([
        data[index].id, mTurkId, code, label, timeStarted,
        data[index].left.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].right.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].stimuli, data[index].correctPosition,
        data[index].correctCategory.split('<br /><span style="color:white">').join(' ').split('</span><br />').join(' '),
        data[index].timedOut, data[index].timing
      ]);

      processRow(mTurkId, code, label, timeStarted, data, ++index, results);
    })('N/A', metaData[1], metaData[2], metaData[3], userErrors, 0, results);

    return processUser(meta, iat, ++cursor, results);
  })(meta, iat, 0, []));

  return csvParser.unparse(toCsv);*/
};

module.exports = function (pathToFile) {
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
          console.log('Caught an error while parsing IAT data — ', err.message);
        }

        processLine(lines, ++cursor, results, percent);
      })(lines, 0, data, require('./percent'));

      console.log('xxx')

      return resolve({
        meta: metaDataFile(data.meta, data.iat),
        results: resultsFile(data.meta, data.iat),
        errors: errorsFile(data.meta, data.iat)
      })
    });
  });
};
