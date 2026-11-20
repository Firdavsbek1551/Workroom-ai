import react from "eslint-plugin-react";
import globals from "globals";
export default [
  {
    files: ["src/**/*.{js,jsx}", "functions/**/*.js", "server.mjs"],
    plugins: { react },
    languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } },
    rules: { "no-undef": "error", "react/jsx-uses-vars": "error", "react/jsx-uses-react": "error", "react/jsx-no-undef": "error", "no-unused-vars": ["warn", { varsIgnorePattern: "^React$", args: "none" }], "no-dupe-keys": "error", "no-unreachable": "error" },
  },
];
