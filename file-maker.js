var fs = require('fs');
var eraseContentFromDir = require('./file-deleter');

/**
 * Create CSV file for based on usable CSV-formatted, string values
 * in the object passed as argument, using a Promise.
 *
 * @param  {array}   csvContents    An object containing fields `meta`, `results`, `errors`
 *                                  with CSV-formatted, string values.
 * @param  {boolean} erasePrevious  Whether all previously created files should be deleted.
 * @return {Promise}                Resolves an object witb fields `meta`, `results`, `errors`,
 *                                  each bearing string values of a link to the generated file.
 */
module.exports = function (csvContents, erasePrevious) {
  return new Promise(function (resolve, reject) {
    try {
      var dir = '/public/downloadables/';
      var filename = 'file.csv';
      var dest = __dirname + dir + filename;

      if (erasePrevious) {
        eraseContentFromDir(__dirname + dir)
          .then(function () {
            generateFile(csvContents, ['meta', 'results', 'errors'], 0, {});
          })
          .catch(function (err) {
            return reject(err.message);
          });
      } else {
        generateFile(csvContents, ['meta', 'results', 'errors'], 0, {});
      }

      /**
       * Generate files recursively, traversing an object with fields `meta`, `results`, `errors`.
       *
       * @param  {object} csvContents An object containing fields `meta`, `results`, `errors`
 *                                    with CSV-formatted, string values.
       * @param  {array}  fields      Array of strings representing the names of the fields to look up.
       * @param  {number} cursor      Integer used as cursor for recursive traversal.
       * @param  {object} results     Payload storage filled recursively then returned when done.
       * @return {object}             The payload object `results`.
       */
      function generateFile(csvContents, fields, cursor, results) {
        if (cursor > fields.length - 1) return resolve(results);

        var data = csvContents[fields[cursor]];
        var fieldName = fields[cursor];
        var filename = '/public/downloadables/IAT_' + fieldName + '_' + Date.now() + '.csv';
        var dest = __dirname + filename;

        fs.writeFile(dest, data, 'utf8', function (err) {
          if (err) throw err;
          results[fieldName] = filename;
          return generateFile(csvContents, fields, ++cursor, results);
        });
      }

    } catch (err) {
      return reject(err.message);
    }
  });
}
