const connect = require('./web3js');

/**
 * @name getOwner
 * @description This function gets the SuperUser Blockchain account of the contract
 * @param {string} _From - Requester Blockchain account
 * @returns {Promise<string>} - Address of the SuperUser
 */
exports.getOwner = async (_From) => {
  try {
    const result = await connect.contract.methods.isOwner().call({ from: _From });
    return result;
  } catch (error) {
    throw new Error('Web3-isOwner', error); // Throw an error object
  }
};
