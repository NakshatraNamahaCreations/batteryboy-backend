// Wraps an async route handler so a rejected promise reaches Express's error
// middleware instead of crashing the process with an unhandled rejection.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
