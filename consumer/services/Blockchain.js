const api = require("./../libs/Axios");
const base_url = "https://token.chats.cash/api/v1/web3";

async function createAccountWallet() {
  return new Promise(async (resolve, reject) => {
    await api
      .post(base_url + "/user/register")
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

async function mintToken(walletAddress, amount) {
  return new Promise((resolve, reject) => {
    api .post(base_url + "/txn/mint/" + amount + "/" + walletAddress)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

async function approveToSpend(ngoAddress, ngoPassword, benWallet, amount) {
  return new Promise((resolve, reject) => {
    api.post( base_url + "/txn/approve/" + ngoAddress + "/" + ngoPassword + "/" + benWallet + "/" + amount )
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

async function transferFrom(
  ngoAdress,
  beneficiaryAddress,
  beneficiaryPassword,
  reciepientAdress,
  amount
) {
  return new Promise(async (resolve, reject) => {
    api .post( base_url + "/txn/transferfrom/" + ngoAdress + "/" + reciepientAdress + "/" + beneficiaryAddress + "/" + beneficiaryPassword + "/" + amount )
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

async function transferTo(
  senderAddress,
  senderPass,
  reciepientAddress,
  amount
) {
  return new Promise(async (resolve, reject) => {
    await api
      .post(
        base_url +
          "/txn/transfer/" +
          senderAddress +
          "/" +
          senderPass +
          "/" +
          reciepientAddress +
          "/" +
          amount
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = {
  createAccountWallet,
  mintToken,
  approveToSpend,
  transferFrom,
  transferTo,
};
