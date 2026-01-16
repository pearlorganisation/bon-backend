// Wraps any async route and forwards errors automatically
const asyncHandler = (fn) => {
  return (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};}

export default asyncHandler;

