import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      "android/**",
      "node_modules/**",
      "tmp_*.js",
      "www/public/**/*.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["www/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        $: "readonly",
        jQuery: "readonly",
        google: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "no-empty": ["warn", { "allowEmptyCatch": true }],
    },
  },
];
