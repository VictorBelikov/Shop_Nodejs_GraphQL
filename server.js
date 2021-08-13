const http = require('http');
const mongoose = require('mongoose');

const app = require('./app');

const port = process.env.PORT || 8080;

const server = http.createServer(app);

(async () => {
  try {
    await mongoose.connect(
      'mongodb://V1ctoR:WwMEMQ54Y7T1K1Xk@online-shop-shard-00-00.5yjc5.mongodb.net:27017,online-shop-shard-00-01.5yjc5.mongodb.net:27017,online-shop-shard-00-02.5yjc5.mongodb.net:27017/shop_mongoose_graphql?ssl=true&replicaSet=atlas-uxfy7r-shard-0&authSource=admin&retryWrites=true&w=majority',
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
