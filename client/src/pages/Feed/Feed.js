import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false,
  };

  componentDidMount() {
    const graphqlQuery = {
      query: `{
        getUserStatus {
          status
        }
      }`,
    };

    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error('Failed fetching User');
        }
        this.setState({ status: resData.data.getUserStatus.status });
      })
      .catch(this.catchError);

    this.loadPosts();
  }

  loadPosts = (direction) => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }

    const graphqlQuery = {
      query: `
        query FetchPosts($pageNumber: Int) {
          getPosts(page: $pageNumber) {
            posts { _id title content imageUrl creator { name } createdAt }
            totalPosts
          }
        }`,
      variables: { pageNumber: page },
    };

    fetch(`http://localhost:8080/graphql`, {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error('Failed to fetch Posts');
        }
        this.setState({
          posts: resData.data.getPosts.posts.map((p) => ({ ...p, imagePath: p.imageUrl })),
          totalPosts: resData.data.getPosts.totalPosts,
          postsLoading: false,
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = (event) => {
    event.preventDefault();

    const graphqlQuery = {
      query: `
        mutation UpdateUserStatus($userStatus: String!) {
          updateUserStatus(status: $userStatus) {
            status
          }
        }`,
      variables: { userStatus: this.state.status },
    };

    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = (postId) => {
    this.setState((prevState) => {
      const loadedPost = { ...prevState.posts.find((p) => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost,
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = async (postData) => {
    this.setState({
      editLoading: true,
    });

    const formData = new FormData();
    formData.append('image', postData.image);
    if (this.state.editPost) {
      formData.append('oldPath', this.state.editPost.imagePath);
    }

    // Send image file first
    const data = await fetch('http://localhost:8080/post-image', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.props.token}`,
      },
      body: formData,
    });
    const jsonData = await data.json();
    const { title, content } = postData;

    let graphqlQuery = {
      query: `
        mutation CreatePost($title: String!, $content: String!, $imageUrl: String!) {
          createPost(postData: { title: $title, content: $content, imageUrl: $imageUrl }) {
            _id title content imageUrl creator { name } createdAt
          }
        }`,
      variables: {
        title,
        content,
        imageUrl: jsonData.filePath,
      },
    };

    if (this.state.editPost) {
      graphqlQuery = {
        query: `
          mutation UpdatePost($postId: ID!, $title: String!, $content: String!, $imageUrl: String!) {
            updatePost(id: $postId, postData: { title: $title, content: $content, imageUrl: $imageUrl }) {
              _id title content imageUrl creator { name } createdAt
            }
          }`,
        variables: {
          postId: this.state.editPost._id,
          title,
          content,
          imageUrl: jsonData.filePath || 'undefined',
        },
      };
    }

    // Then create a new post
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors && resData.errors[0].statusCode === 422) {
          throw new Error('Validation failed!');
        }
        if (resData.errors && resData.errors[0].statusCode === 401) {
          throw new Error('Not authenticated!');
        }
        if (resData.errors) {
          throw new Error('User not found.');
        }
        console.log(resData);

        let data = 'createPost';
        if (this.state.editPost) {
          data = 'updatePost';
        }

        const { _id, title, content, creator, createdAt, imageUrl } = resData.data[data];
        const post = { _id, title, content, creator, createdAt, imagePath: imageUrl };

        this.setState((prevState) => {
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex((p) => p._id === prevState.editPost._id);
            updatedPosts[postIndex] = post;
          } else {
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
          };
        });
      })
      .catch((err) => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err,
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = (postId) => {
    this.setState({ postsLoading: true });

    const graphqlQuery = {
      query: `
        mutation {
          deletePost(id: "${postId}")
        }`,
    };

    fetch(`http://localhost:8080/graphql`, {
      method: 'POST',
      body: JSON.stringify(graphqlQuery),
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error('Deleting the Post failed');
        }
        this.loadPosts();
      })
      .catch((err) => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = (error) => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}>
              {this.state.posts.map((post) => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
