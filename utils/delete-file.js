const fs = require('fs');

const ErrorService = require('./error-service');

module.exports = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      throw ErrorService(400, err.message);
    }
  });
};
