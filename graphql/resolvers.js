const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/user');
const Post = require('../models/post');
const ErrorService = require('../utils/error-service');
const deleteFile = require('../utils/delete-file');

const checkAuth = (req) => {
  // In check-auth.js
  if (!req.isAuth) {
    throw ErrorService(401, 'Not authenticated!');
  }
};

const findPost = async (postId) => {
  const post = await Post.findById(postId).populate('creator');
  if (!post) {
    throw ErrorService(404, `Could not find a post with ID ${postId}`);
  }
  return post;
};

const findUser = async (id) => {
  const user = await User.findById(id); // In check-auth.js
  if (!user) {
    throw ErrorService(404, 'User not found.');
  }
  return user;
};

const validatePost = (title, content) => {
  const errs = [];

  if (validator.isEmpty(title) || !validator.isLength(title, { min: 3 })) {
    errs.push({ message: 'Title is invalid' });
  }
  if (validator.isEmpty(content) || !validator.isLength(content, { min: 3 })) {
    errs.push({ message: 'Content is invalid' });
  }
  if (errs.length > 0) {
    throw ErrorService(422, 'Invalid input', errs);
  }
};

module.exports = {
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

  async login({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      throw ErrorService(404, 'User not found.');
    }
    const doMatch = await bcrypt.compare(password, user.password);
    if (!doMatch) {
      throw ErrorService(401, 'Incorrect password');
    }

    const userId = user._id.toString();
    const token = jwt.sign({ userId, email }, process.env.JWT_KEY, { expiresIn: '5h' });
    return { token, userId };
  },

  async createPost({ postData }, req) {
    checkAuth(req);

    const { title, content, imageUrl } = postData;
    validatePost(title, content);
    const user = await findUser(req.userId);

    const newPost = await new Post({ title, content, imageUrl, creator: user }).save();
    user.posts.push(newPost);
    await user.save();

    return {
      ...newPost._doc,
      _id: newPost._id.toString(),
      createdAt: newPost.createdAt.toISOString(),
      updatedAt: newPost.updatedAt.toISOString(),
    };
  },

  async getPosts({ page = 1 }, req) {
    checkAuth(req);

    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('creator')
      .skip((page - 1) * perPage)
      .limit(perPage);

    return {
      posts: posts.map((p) => ({
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      totalPosts,
    };
  },

  async getPost({ id }, req) {
    checkAuth(req);
    const post = await findPost(id);
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  async updatePost({ id, postData }, req) {
    checkAuth(req);
    const post = await findPost(id);

    if (post.creator._id.toString() !== req.userId.toString()) {
      throw ErrorService(403, "Not authorized. You didn't create this Post");
    }

    const { title, content, imageUrl } = postData;
    validatePost(title, content);

    post.title = title;
    post.content = content;

    if (imageUrl !== 'undefined') {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  async deletePost({ id }, req) {
    checkAuth(req);
    const post = await findPost(id);

    if (post.creator._id.toString() !== req.userId.toString()) {
      throw ErrorService(403, "Not authorized. You didn't create this Post");
    }
    deleteFile(post.imageUrl);
    await Post.deleteOne({ _id: id });

    const user = await User.findById(req.userId);
    user.posts.pull(id); // Вытягиваем (удаляeм) эл-т по id
    await user.save();
    return true;
  },

  async getUserStatus(args, req) {
    checkAuth(req);
    const user = await findUser(req.userId);
    return { ...user._doc, _id: user._id.toString() };
  },

  async updateUserStatus({ status }, req) {
    checkAuth(req);
    const user = await findUser(req.userId);
    user.status = status;
    await user.save();
    return { ...user._doc, _id: user._id.toString() };
  },
};
