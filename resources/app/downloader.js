const https = require('https');
const fs = require('fs');
const percent = require(__dirname + '/percent');
const request = require('request');
let isBusy = false;
let filename;
let dest;
let file;
let req;

module.exports = uri => {
  return new Promise((resolve, reject) => {
    filename = Date.now() + '_' + uri.substring(uri.indexOf('.com/') + 5);
    dest = __dirname + '/public/dump/' + filename;

    if (isBusy) {
      return resolve(dest);
    }

    isBusy = true;

    file = fs.createWriteStream(dest);

    // Make a first, unfollowed-through request.
    // Just to trigger cache-busting of dataclip.
    request({method: 'GET', uri: uri});
    console.log('GET requesting to bust cache at Heroku...');

    return setTimeout(() => {
      console.log('Actual GET request of data.');
      req = request({method: 'GET', uri: uri});
      req.pipe(file);

      req.on('response', data => {
        return resolve({
          size: data.headers['content-length'],
          promise: new Promise((resolve, reject) => {
            let current = 0;
            let total = +data.headers['content-length'];

            req.on('data', function (chunk) {
              current += +chunk.length;
              percent(parseInt((current / total) * 100));
            });

            req.on('end', function () {
              isBusy = false;
              return resolve(dest);
            });
          })
        });
      }, 2000);
    });
  });
};
