import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    env: {
      browser: true,
      es2021: true,
      node: true,
    },
    rules: {
      // Add custom rules here
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];
