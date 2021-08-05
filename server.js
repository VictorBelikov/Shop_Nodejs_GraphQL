const http = require('http');
const mongoose = require('mongoose');

const app = require('./app');

const port = process.env.PORT || 8080;

const server = http.createServer(app);

(async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://V1ctoR:WwMEMQ54Y7T1K1Xk@online-shop.5yjc5.mongodb.net/shop_mongoose_graphql?retryWrites=true&w=majority',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      },
    );

    server.listen(port, () => console.log(`Server is listening on port ${port} ...`));
  } catch (e) {
    console.error('Error while connecting to DB: ', e);
  }
})();

// ========================= Create server more simple way ==============================
// app.listen(8080, () => console.log('Server is running on port 8080...'));

// Express source code:
// app.listen = function() {
//   var server = http.createServer(this);
//   return server.listen.apply(server, arguments);
// };
