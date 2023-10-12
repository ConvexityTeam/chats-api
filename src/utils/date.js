const moment = require('moment');

exports.formInputToDate = (value) => moment(`${value.split('-').reverse().join('-')}`).toDate();
