module.exports = function (dir) {
  return new Promise(function (resolve, reject) {
    // Options -r recursive -j ignore directory info - redirect to stdout
    var zip = require('child_process').spawn('zip', ['-rj', '-', dir]);
    var writeStream = require('fs').createWriteStream(dir + 'IAT_export_' + Date.now() + '.zip');

    zip.stdout.on('data', function (data) {
      writeStream.write(data);
    });

    zip.stderr.on('data', function (data) {
      console.log(data)
    });

    zip.on('exit', function (code) {
      res.end();
      if (code !== 0) {
        return reject('Error while zipping files...');
      } else {
        console.log('Zip file is ready');
        return resolve(writeStream);
      }
    });
  });
}
