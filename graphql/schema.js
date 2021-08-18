const { buildSchema } = require('graphql');

module.exports = buildSchema(`
  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }
  
  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    status: String
    posts: [Post!]!
  }
  
  type AuthData {
    token: String!
    userId: String!
  }
  
  type Posts {
    posts: [Post!]!
    totalPosts: Int!
  }
  
  input UserData {
    email: String!
    name: String!
    password: String!
  }
  
  input PostData {
    title: String!
    content: String!
    imageUrl: String!
  }
  
  type RootQuery {
    login(email: String!, password: String!): AuthData!
    getPosts(page: Int): Posts!
    getPost(id: ID!): Post!
  }
  
  type RootMutation {
    createUser(userData: UserData): User!
    createPost(postData: PostData): Post!
    updatePost(id: ID!, postData: PostData): Post! 
    deletePost(id: ID!): Boolean
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);
