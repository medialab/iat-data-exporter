'use strict';

var https = require('https');
var fs = require('fs');
var filename;
var dest;
var file;
var req;

module.exports = function (uri) {
  return new Promise(function (resolve, reject) {
    filename = Date.now() + '_' + uri.substring(uri.indexOf('.com/') + 5);
    dest = __dirname + '/public/' + filename;
    file = fs.createWriteStream(dest);

    req = require('request')({method: 'GET', uri: uri})
    req.pipe(file);

    req.on('response', function (data) {
      return resolve({
        size: data.headers['content-length'],
        promise: new Promise(function (resolve, reject) {
          var current = 0;
          var total = +data.headers['content-length'];
          var percent = 0;

          req.on('data', function (chunk) {
            process.stdout.write('\x1Bc');

            current += +chunk.length;
            percent = (current / total) * 100;

            console.log('Fetching (' + percent.toFixed(2) + '%)');
          });

          req.on('end', function () {
            process.stdout.write('\x1Bc');
            return resolve(dest);
          });
        })
      });
    });
  });
};
