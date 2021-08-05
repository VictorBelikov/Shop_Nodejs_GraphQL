module.exports = (status, message, details) => {
  const error = new Error(message || 'Internal server error');
  error.statusCode = status || 500;
  error.details = details || 'No additional info about the error';
  return error;
};
