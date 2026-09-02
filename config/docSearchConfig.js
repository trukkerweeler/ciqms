// Environment-aware config for the Tika + Meilisearch document indexing pipeline.
// DEV and PROD point at separate Tika/Meilisearch instances and separate indexes so
// running both environments at once never cross-indexes or port-conflicts.
const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production" || nodeEnv === "prod";
const envLabel = isProd ? "production" : "development";

const TIKA_SERVER_URL =
  (isProd
    ? process.env.TIKA_SERVER_URL_PROD
    : process.env.TIKA_SERVER_URL_DEV) ||
  process.env.TIKA_SERVER_URL ||
  "http://localhost:9998";

const MEILI_HOST =
  (isProd ? process.env.MEILI_HOST_PROD : process.env.MEILI_HOST_DEV) ||
  process.env.MEILI_HOST ||
  "http://localhost:7700";

// Suffix the index name per environment so dev indexing can never land in the prod index.
const MEILI_INDEX = `${process.env.MEILI_INDEX || "qms_documents"}_${isProd ? "prod" : "dev"}`;

module.exports = {
  env: envLabel,
  isProd,
  TIKA_SERVER_URL,
  MEILI_HOST,
  MEILI_API_KEY: process.env.MEILI_API_KEY || "",
  MEILI_INDEX,
};
