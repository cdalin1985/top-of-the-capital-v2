module.exports = {
  // Print width
  printWidth: 100,

  // Tab configuration
  tabWidth: 2,
  useTabs: false,

  // Semicolons and quotes
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',

  // JSX configuration
  jsxSingleQuote: true,
  jsxBracketSameLine: false,

  // Trailing commas
  trailingComma: 'none',

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow function parentheses
  arrowParens: 'avoid',

  // Range formatting
  rangeStart: 0,
  rangeEnd: Infinity,

  // Parser
  requirePragma: false,
  insertPragma: false,

  // Prose wrapping
  proseWrap: 'preserve',

  // HTML whitespace
  htmlWhitespaceSensitivity: 'css',

  // Vue files
  vueIndentScriptAndStyle: false,

  // Line endings
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Override for specific files
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: 'package.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    }
  ]
};
