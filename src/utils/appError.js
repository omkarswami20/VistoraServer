class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function createAppError(message, statusCode) {
  return new AppError(message, statusCode);
}

module.exports = AppError;
module.exports.AppError = AppError;
module.exports.createAppError = createAppError;
