const { web3, account, account_pass } = require('./services/web3js');

web3.eth.personal.unlockAccount(account, account_pass, 300).then(() => {
  const code = web3.eth;
  code.sendTransaction({
    from: account,
    gas: 7000000,
    data: code,
  })
    .then((status) => {
      console.log(`Contract Address : ${status.contractAddress}`);
    });
});
