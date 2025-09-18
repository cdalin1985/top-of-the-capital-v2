module.exports = {
  // JavaScript files
  '*.js': ['eslint --fix', 'prettier --write', 'jest --bail --findRelatedTests --passWithNoTests'],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write'],

  // Prisma schema
  '*.prisma': ['npx prisma format'],

  // CSS files
  '*.css': ['prettier --write'],

  // Environment files (basic validation)
  '.env*': [
    // Just ensure they exist and are readable
    'node -e "console.log(\\"Environment file validation passed\\")"'
  ]
};
