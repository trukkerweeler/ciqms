// Environment-based configuration
const config = {
  development: {
    port: 3003,
    apiUrl: "http://localhost:3003",
  },
  production: {
    port: 3004,
    apiUrl: "http://192.168.1.10:3004",
  },
};

const nodeEnv = process.env.NODE_ENV || "development";
const env =
  nodeEnv === "production" || nodeEnv === "prod" ? "production" : "development";

module.exports = {
  ...config[env],
  env,
};
