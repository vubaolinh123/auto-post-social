import request from 'request'
import fs from 'fs'
import path from 'path'
import axios from 'axios';

const download = function (uri, filename, callback) {
  request.head(uri, function (err, res) {
    if (err) {
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(new Error('Failed to download: Server responded with status code ' + res.statusCode));
    }
    
    const customPath = filename ? path.join(filename, path.basename(uri)) : path.basename(uri);
    const stream = fs.createWriteStream(customPath);

    request(uri)
      .pipe(stream)
      .on("error", callback) 
      .on("close", callback);
  });
};

const downloadTumblr = function (imageUrl, filename) {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream'
    }).then(response => {
      const filePath = path.join(filename, path.basename(imageUrl));
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    }).catch(reject);
  });
};

module.exports = { download, downloadTumblr };