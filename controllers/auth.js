const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const validateInputErrors = require('../utils/validate-input-errors');
const ErrorService = require('../utils/error-service');

const findUser = async (req) => {
  let user;
  let field;
  if (req.url === '/login') {
    field = req.body.email;
    user = await User.findOne({ email: field });
  } else {
    field = req.userId;
    user = await User.findById(field);
  }
  if (!user) {
    throw ErrorService(404, `Could not find a user with ${field}`);
  }
  return user;
};

exports.signup = async (req, res, next) => {
  try {
    validateInputErrors(req);
    const { email, name, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await new User({ email, name, password: hashedPassword }).save();
    res.status(201).json({ message: 'User created', createdUser: user });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const user = await findUser(req);
    const doMatch = await bcrypt.compare(req.body.password, user.password);
    if (!doMatch) {
      throw ErrorService(401, 'Incorrect password');
    }
    // JWT will save in browser local storage
    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_KEY, {
      expiresIn: '1h',
    });
    res.status(200).json({ token, userId: user._id.toString() });
  } catch (e) {
    next(e);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await findUser(req);
    res.status(200).json({ status: user.status });
  } catch (e) {
    next(e);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const user = await findUser(req);
    user.status = req.body.status;
    await user.save();
    res.status(200).json({ message: `User update with status: "${user.status}"` });
  } catch (e) {
    next(e);
  }
};
