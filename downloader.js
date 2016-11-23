'use strict';

var https = require('https');
var fs = require('fs');
var percent = require('./percent');
var filename;
var dest;
var file;
var req;
var isBusy = false;

module.exports = function (uri) {
  return new Promise(function (resolve, reject) {
    filename = Date.now() + '_' + uri.substring(uri.indexOf('.com/') + 5);
    dest = __dirname + '/public/' + filename;

    if (isBusy) {
      return resolve(dest);
    }

    isBusy = true;

    file = fs.createWriteStream(dest);

    req = require('request')({method: 'GET', uri: uri})
    req.pipe(file);

    req.on('response', function (data) {
      return resolve({
        size: data.headers['content-length'],
        promise: new Promise(function (resolve, reject) {
          var current = 0;
          var total = +data.headers['content-length'];

          req.on('data', function (chunk) {
            current += +chunk.length;
            percent(((current / total) * 100).toFixed(2));
          });

          req.on('end', function () {
            isBusy = true;
            return resolve(dest);
          });
        })
      });
    });
  });
};
