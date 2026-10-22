import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from 'module';
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: dirname(createRequire(import.meta.url).resolve('eslint-config-next')),
});

const eslintConfig = [
  { ignores: ['starter-reference/**', '.next/**', 'test-results/**', 'playwright-report/**'] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
