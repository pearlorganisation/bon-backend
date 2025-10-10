class CustomError extends Error {
  constructor(message = "Something went wrong", statusCode = 500) {
    super(message); // call parent Error constructor
    this.statusCode = statusCode;
    this.name = this.constructor.name; // sets name to "CustomError"
    Error.captureStackTrace(this, this.constructor); // cleaner stack trace
  }
}

export default CustomError;
