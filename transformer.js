var fs = require('fs');
var csvParser = require('papaparse');

var createMedataFile = function (meta, iat) {
  var toCsv = [[
    'Player.id_in_group', 'Participant.code', 'Participant.label',
    'Participant.time_started', 'Trials order', 'Error percentage'
  ]];

  (function processRow(meta, iat, cursor, results) {
    if (cursor >= meta.length - 1) return toCsv.push(results);

    var row = meta[cursor].split(',');

    results.push([row[0], row[1], row[2], row[10], iat[cursor].order, iat[cursor].error_percentage]);

    processRow(meta, iat, ++cursor, results)
  })(meta, iat, 0, []);

  return csvParser.unparse(toCsv);
};

var createResultsFile = function (data) {

};

var createErrorsFile = function (data) {

};

module.exports = function (pathToFile) {
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
        console.log(err);
      }

      processLine(lines, ++cursor, results, percent);
    })(lines, 0, data, require('./percent'));

    var metaDataFile = createMedataFile(data.meta, data.iat);
  });
};
