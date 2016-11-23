var fs = require('fs');

/**
 * Delete content (non-recursively) from a directory.
 *
 * @param  {string} path Path to the directory.
 * @return {Promise}     Resolves `true` when done.
 */
module.exports = function (path) {
  return new Promise(function (resolve, reject) {
    fs.readdir(path, function (err, files) {
      if (err) throw err;

      (function del(files, cursor) {
        if (cursor > files.length - 1) return resolve(true);

        if (files[cursor][0] !== '.') {
          var file = path + files[cursor];

          fs.stat(file, function (err, stats) {
            if (err) throw err;

            if (stats.isFile()) {
              fs.unlink(file, function(err) {
                if (err) console.log(err.message);
                console.log('Deleted file at ' + file);
                return del(files, ++cursor);
              });
            }
          });
        } else {
          return del(files, ++cursor);
        }
      })(files, 0);
    });
  });
}
