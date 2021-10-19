require("dotenv").config();
const StellarSdk = require("stellar-sdk");
const fetch = require("node-fetch");

const config = {
  BASE_URL: process.env.BANTU_BASE_URL,
  ADMIN_ADDRESS: process.env.BANTU_ADMIN_ADDRESS,
  NETWORK_PASSPHRASE: process.env.BANTU_NETWORK_PASSPHRASE,
};

const server = new StellarSdk.Server(config.BASE_URL);


function createPair() {
  const pair = StellarSdk.Keypair.random();

  const secret = pair.secret();
  const publicKey = pair.publicKey();
  activateAccount(publicKey);
  return {
    secret,
    publicKey,
  };
}

async function activateAccount(publicKey) {
  try {
    const response = await fetch(
      `https://friendbot.dev.bantu.network?addr=${encodeURIComponent(
        publicKey
      )}`
    );
    const responseJSON = await response.json();
    console.log("SUCCESS! You have a new BANTU account :)\n" + responseJSON);
  } catch (e) {
    console.error("ERROR!", e);
  }
}

async function getXbnBalance(publicKey) {
  return new Promise(async (resolve, reject) => {
    server
      .loadAccount(publicKey)
      .then((account) => {
        const balance = account.balances.filter(asset => asset.asset_type == "native").map(asset => asset.balance).reduce((a, b) => a + b, 0)
        resolve(balance);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

async function transferToken(senderSecret, amount) {
  return new Promise((resolve, reject) => {
    const sourceKeys = StellarSdk.Keypair.fromSecret(senderSecret);
    const destinationId = config.ADMIN_ADDRESS;
    server
      .loadAccount(destinationId)
      .then(function () {
        return server.loadAccount(sourceKeys.publicKey());
      })
      .then(function (sourceAccount) {
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: config.NETWORK_PASSPHRASE,
          })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: destinationId,
              asset: StellarSdk.Asset.native(),
              amount: String(amount),
            })
          )
          .addMemo(StellarSdk.Memo.text("CHATS Transaction"))
          .setTimeout(180)
          .build();
        transaction.sign(sourceKeys);
        return server.submitTransaction(transaction);
      })
      .then(function (result) {
        resolve(result);
      })
      .catch(function (error) {
        if (error instanceof StellarSdk.NotFoundError) {
          reject("The destination account does not exist!");
        } 
        else {
          reject(error);
        }
      });
  });
}

module.exports = {
  createPair,
  getXbnBalance,
  creditWallet: activateAccount,
  transferToken,
};