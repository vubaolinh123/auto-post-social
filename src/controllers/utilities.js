import request from 'request'
import fs from 'fs'
import path from 'path'
import axios from 'axios';

const download = async (uri, filename, callback) => {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('Invalid URI');
  }

  const response = await axios({
    url: uri,
    method: 'GET',
    responseType: 'stream'
  });

  const filePath = path.join(filename, path.basename(uri));
  const writer = fs.createWriteStream(filePath);

  response.data.pipe(writer);

  writer.on('finish', async () => {
    try {
      await callback(filePath);
    } finally {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting the file:', err);
        else console.log('File deleted successfully');
      });
    }
  });

  writer.on('error', (err) => {
    console.error('Error downloading the file:', err);
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