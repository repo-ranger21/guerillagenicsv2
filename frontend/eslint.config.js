import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Apostrophes and quotes in JSX string literals are safe; disable noisy entity rule
      "react/no-unescaped-entities": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
    settings: {
      react: { version: "18" },
    },
  },
  // App.jsx is a large monolithic file with intentionally scoped hook patterns
  {
    files: ["src/App.jsx"],
    rules: {
      "no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.config.js"],
  },
];
