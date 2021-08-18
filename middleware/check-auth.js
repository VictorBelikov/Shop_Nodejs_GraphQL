const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const header = req.get('Authorization');
    if (!header) {
      req.isAuth = false;
      return next();
    }

    const token = header.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    if (!decodedToken) {
      req.isAuth = false;
      return next();
    }
    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
  } catch (err) {
    req.isAuth = false;
    return next();
  }
};
