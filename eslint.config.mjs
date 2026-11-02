import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import unusedImports from "eslint-plugin-unused-imports";

// Flat config (ESLint 9). Same rules as the old .eslintrc.json.
const eslintConfig = defineConfig([
  ...nextVitals,
  {
    plugins: { "unused-imports": unusedImports },
    rules: {
      // Handled by unused-imports below, which can also auto-fix unused imports.
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // New in the Next 16 preset. The existing pages load data in useEffect and then set
      // state, which works but re-renders once more. Kept visible as a warning to fix gradually.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
