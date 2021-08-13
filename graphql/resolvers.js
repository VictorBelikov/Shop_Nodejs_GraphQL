const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/user');
const ErrorService = require('../utils/error-service');

module.exports = {
  hello() {
    return { text: 'Hello, world!', views: 245 };
  },

  async createUser({ userData }) {
    const { email, name, password } = userData;
    const errs = [];

    if (!validator.isEmail(email)) {
      errs.push({ message: 'E-Mail is invalid.' });
    }
    if (validator.isEmpty(password) || !validator.isLength(password, { min: 3 })) {
      errs.push({ message: 'Password too short' });
    }
    if (errs.length > 0) {
      throw ErrorService(422, 'Invalid input', errs);
    }

    const user = await User.findOne({ email });
    if (user) {
      throw ErrorService(400, 'User exists already!');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await new User({ email, name, password: hashedPassword }).save();
    return { ...newUser._doc, _id: newUser._id.toString() };
  },
};
