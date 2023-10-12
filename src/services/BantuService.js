const fetch = require('node-fetch');
const StellarSdk = require('stellar-sdk');
const {
  baseURL,
  adminAddress,
  networkPassphrase,
} = require('../config').bantuConfig;

const server = new StellarSdk.Server(baseURL, {
  allowHttp: true,
});

class BantuService {
  static createPair() {
    const pair = StellarSdk.Keypair.random();
    const bantuPrivateKey = pair.secret();
    const bantuAddress = pair.publicKey();
    this.creditWallet(bantuAddress);
    return {
      bantuPrivateKey,
      bantuAddress,
    };
  }

  static async creditWallet(publicKey) {
    try {
      await fetch(
        `https://friendbot.dev.bantu.network?addr=${encodeURIComponent(
          publicKey,
        )}`,
      );
    } catch (e) {
      console.error('ERROR!', e);
    }
  }

  static getXbnBalance(publicKey) {
    return new Promise((resolve, reject) => {
      let xbnBalance = 0;
      server
        .loadAccount(publicKey)
        .then((account) => {
          account.balances.forEach((balance) => {
            if (balance.asset_type === 'native') {
              xbnBalance = balance.balance; // Use = for assignment
            }
          });
          resolve(xbnBalance);
        })
        .catch((error) => {
          reject(error.message);
        });
    });
  }

  static async transferToken(senderSecret, amount) {
    return new Promise((resolve, reject) => {
      const sourceKeys = StellarSdk.Keypair.fromSecret(senderSecret);
      const destinationId = adminAddress;
      let transaction;
      server
        .loadAccount(destinationId)
        .then(async () => server.loadAccount(sourceKeys.publicKey()))
        .then((sourceAccount) => {
          transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase,
          })
            .addOperation(
              StellarSdk.Operation.payment({
                destination: destinationId,
                asset: StellarSdk.Asset.native(),
                amount: String(amount),
              }),
            )
            .addMemo(StellarSdk.Memo.text('Test Transaction'))
            .setTimeout(180)
            .build();
          transaction.sign(sourceKeys);
          return server.submitTransaction(transaction);
        })
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          if (error instanceof StellarSdk.NotFoundError) {
            throw new Error('The destination account does not exist!');
          }
          return reject(error);
        });
    });
  }
}

module.exports = BantuService;
