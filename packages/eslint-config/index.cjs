module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  env: {
    es2022: true,
    browser: true,
    node: true
  },
  ignorePatterns: ["dist/**", "node_modules/**"]
};
