const { validationResult } = require('express-validator');

const ErrorService = require('./error-service');

module.exports = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorService(422, 'Validation failed. Incorrect data', errors.array());
  }
};
