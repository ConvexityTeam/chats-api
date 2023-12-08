require('dotenv').config();
module.exports = {
  secret_id: process.env.HASHICORP_SECRET_ID,
  role_id: process.env.HASHICORP_ROLE_ID,
  namespace: process.env.HASHICORP_NAMESPACE,
  address: process.env.HASHICORP_ADDRESS,
  secretengine: process.env.HASHICORP_SECRET_ENGINE
};
