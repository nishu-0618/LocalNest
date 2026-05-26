// middleware/errorHandler.js
// This runs whenever next(error) is called in any controller

const errorHandler = (err, req, res, next) => {
  // Log the error stack trace in terminal (helpful for debugging)
  console.error(err.stack);

  // Send a clean JSON error response to the client
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;