const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

const app = express();

//#region: Parse form-data files(images and so on)
const fileStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'images');
  },
  filename(req, file, cb) {
    cb(null, `${new Date().toISOString().replace(/:/g, '-')}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
//#endregion: Parse form-data files(images and so on)

app.use(morgan('dev'));

// Parse form data (x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));
// Parse JSON data (application/json)
app.use(express.json());
// Parse file data. 'image' - form field name
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));

// Public available for 'images' directories
app.use('/images', express.static('images'));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const { message } = err;
      const { details, statusCode } = err.originalError;
      return { message, statusCode, details };
    },
  }),
);

app.use((err, req, res, _next) => {
  console.error(err);
  const { statusCode, message, details } = err;
  res.status(statusCode || 500).json({ message, details: details || 'No additional info about the error' });
});

module.exports = app;
