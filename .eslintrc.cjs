/* eslint-env node */
module.exports = {
    root: true,
    ignorePatterns: [
      "node_modules",
      "dist",
      "coverage",
      "logs",
      "cache",
      "**/*.d.ts"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: false, // 필요 시 tsconfig 지정 가능
      sourceType: "module",
      ecmaVersion: "latest"
    },
    env: {
      es2022: true,
      node: true
    },
    plugins: [
      "@typescript-eslint",
      "import",
      "unused-imports",
      "jsonc"
    ],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "plugin:jsonc/recommended-with-jsonc",
      "plugin:jsonc/prettier",
      "eslint-config-prettier"
    ],
    settings: {
      "import/resolver": {
        typescript: true,
        node: true
      }
    },
    rules: {
      // 사용하지 않는 것 정리
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],
  
      // 임포트 정렬/그룹
      "import/order": ["error", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
        "alphabetize": { "order": "asc", "caseInsensitive": true },
        "newlines-between": "always"
      }],
  
      // 실서비스에선 logger 권장
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    },
    overrides: [
      // JSON / JSONC
      {
        files: ["**/*.json", "**/*.jsonc"],
        parser: "jsonc-eslint-parser",
        rules: {
          "jsonc/indent": ["error", 2],
          "jsonc/quote-props": ["error", "always"],
          "jsonc/key-name-casing": "off" // 외부 스키마 호환성 위해 끔
        }
      },
      // YAML
      {
        files: ["**/*.yaml", "**/*.yml"],
        parser: "yaml-eslint-parser"
      },
      // 테스트(선택): vitest나 jest 쓰면 여기서 env/글로벌 세팅
      {
        files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.ts"],
        rules: {
          "no-console": "off"
        }
      }
    ]
  };
  