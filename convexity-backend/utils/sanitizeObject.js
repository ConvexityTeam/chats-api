/**
 * Sanitizes an input object and returns a new object with
 * only the keys with truthy positive values
 * @param {Object} obj
 * @return {Object}
 */
 module.exports = (obj) => {
  const result = Object.create(null);

  Object.keys(obj).forEach((key) => {
    if (obj[key]) {
      result[key] = obj[key];
    }
  });

  return result;
};
