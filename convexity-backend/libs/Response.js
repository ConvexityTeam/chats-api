class Response {
  constructor() {
    this.type = null;
    this.data = null;
    this.message = null;
    this.statusCode = null;
  }

  setSuccess(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.type = "success";
  }

  setError(statusCode, message) {
    this.statusCode = statusCode;
    this.message = message;
    this.type = "error";
  }

  send(res) {
    let result;
    if (this.type === "success") {
      result = {
        code: this.statusCode,
        status: this.type,
        message: this.message,
        data: this.data,
      };
    } else {
      result = {
        code: this.statusCode,
        status: this.type,
        message: this.message,
      };
    }

    return res.status(result.code).json(result);
  }
}

module.exports = new Response();