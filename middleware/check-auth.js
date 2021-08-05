const jwt = require('jsonwebtoken');

const ErrorService = require('../utils/error-service');

module.exports = (req, res, next) => {
  try {
    // const token = req.headers.authorization.split(' ')[1]; // or
    const token = req.get('Authorization')?.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    if (!decodedToken) {
      throw ErrorService(401, 'Auth failed.');
    }
    req.userId = decodedToken.userId;
    next();
  } catch (err) {
    return next(err);
  }
};
