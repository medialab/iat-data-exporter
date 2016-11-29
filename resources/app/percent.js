let percent = 0;

/**
 * Singleton storage of a value used to indicate progress.
 *
 * @param  {number}  p     Value in.
 * @param  {boolean} reset resets value if set true.
 * @return {number}        Value out.
 */
module.exports = function (p, reset) {
  percent = p ? p : percent;
  if (reset) percent = 0;
  return +percent
}
