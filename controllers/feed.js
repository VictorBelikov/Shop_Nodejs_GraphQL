const Post = require('../models/post');
const User = require('../models/user');
const ErrorService = require('../utils/error-service');
const deleteFile = require('../utils/delete-file');
const validateInputErrors = require('../utils/validate-input-errors');

const findPost = async (req) => {
  const { postId } = req.params;
  const post = await Post.findById(postId).populate('creator');
  if (!post) {
    throw ErrorService(404, `Could not find a post with ID ${postId}`);
  }
  return post;
};

exports.getPosts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;
    const perPage = 2;

    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.status(200).json({ message: 'Fetched posts successfully', posts, totalItems });
  } catch (e) {
    next(e);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    validateInputErrors(req);

    if (!req.file) {
      throw ErrorService(422, 'No image provided');
    }
    const { title, content } = req.body;
    const post = await new Post({ title, content, imageUrl: req.file.path, creator: req.userId }).save();
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();
    res.status(201).json({ message: 'Post created successfully!', post, creator: user.email });
  } catch (e) {
    next(e);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await findPost(req);
    res.status(200).json({ message: 'Post fetched', post });
  } catch (e) {
    next(e);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    validateInputErrors(req);
    const post = await findPost(req);
    if (post.creator._id.toString() !== req.userId) {
      throw ErrorService(403, 'Not Authorized!', 'Another user created this post, not you');
    }

    const { title, content } = req.body;
    let imageUrl = req.body.image;

    if (req.file) {
      deleteFile(post.imageUrl);
      imageUrl = req.file.path;
    }
    if (!imageUrl) {
      throw ErrorService(422, 'No file picked');
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;
    const updatedPost = await post.save();
    res.status(200).json({ message: 'Post updated', post: updatedPost });
  } catch (e) {
    next(e);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await findPost(req);
    if (post.creator._id.toString() !== req.userId) {
      throw ErrorService(403, 'Not Authorized!', 'Another user created this post, not you');
    }
    deleteFile(post.imageUrl);
    await Post.deleteOne({ _id: post._id });

    const user = await User.findById(req.userId);
    user.posts.pull(req.params.postId);
    await user.save();
    res.status(200).json({ message: 'Post deleted', deletedPost: post });
  } catch (e) {
    next(e);
  }
};
