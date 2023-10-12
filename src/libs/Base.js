const request = require('request');

class Base {
  constructor(url = 'http://127.0.0.1/m-pay') {
    this.url = url;
    this.body = null;
  }

  /**
   * @param {string} url The called url
   * @param   {object} payload the delivery payload
   */

  async gett(header, payload = {}) {
    try {
      // Reference to 'this' within the get method
      const response = await request.get(this.url, payload, header);
      return response;
    } catch (error) {
      return error;
    }
  }

  /**
   *
   * @param {string} url the endpoint to call via axios
   * @param {object} payload The payload to send along
   */
  post(url, payload, headers) {
    return new Promise((resolve, reject) => {
      request
        .post(this.url, payload, headers)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

module.exports = Base;
