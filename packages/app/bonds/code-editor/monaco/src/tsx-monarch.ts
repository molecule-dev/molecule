/**
 * JSX-aware Monarch tokenizer for TypeScript/JavaScript and a custom
 * theme matching VS Code's Dark+ color scheme.
 *
 * Token types mapped to Dark+ colors:
 *   tag             → #569CD6 (blue)   — JSX tag names (entity.name.tag)
 *   attribute.name  → #9CDCFE (lt blue) — JSX attributes (entity.other.attribute-name)
 *   keyword         → #569CD6 (blue)   — declarations: const, let, var, function, class
 *   keyword.flow    → #C586C0 (purple) — control flow: return, if, for, while
 *   type.identifier → #4EC9B0 (teal)   — type names, PascalCase identifiers
 *   identifier      → #9CDCFE (lt blue) — variables (variable)
 *   string          → #CE9178 (orange) — string literals
 *   number          → #B5CEA8 (green)  — numeric literals
 *   comment         → #6A9955 (green)  — comments
 *   delimiter       → #D4D4D4 (gray)   — operators, punctuation
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-escape */

const tsxLanguageDef: Record<string, any> = {
  defaultToken: '',
  tokenPostfix: '.ts',

  // Control-flow keywords — purple #C586C0 in Dark+
  flowKeywords: [
    'await',
    'break',
    'case',
    'catch',
    'continue',
    'delete',
    'do',
    'else',
    'export',
    'finally',
    'for',
    'from',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'of',
    'return',
    'switch',
    'throw',
    'try',
    'typeof',
    'while',
    'with',
    'yield',
  ],

  // Declaration/type keywords — blue #569CD6 in Dark+
  keywords: [
    'abstract',
    'any',
    'as',
    'asserts',
    'async',
    'bigint',
    'boolean',
    'class',
    'const',
    'constructor',
    'debugger',
    'declare',
    'default',
    'enum',
    'extends',
    'false',
    'function',
    'get',
    'global',
    'implements',
    'infer',
    'interface',
    'is',
    'keyof',
    'let',
    'module',
    'namespace',
    'never',
    'null',
    'number',
    'object',
    'out',
    'override',
    'package',
    'private',
    'protected',
    'public',
    'readonly',
    'require',
    'satisfies',
    'set',
    'static',
    'string',
    'super',
    'symbol',
    'this',
    'true',
    'type',
    'undefined',
    'unique',
    'unknown',
    'var',
    'void',
  ],

  operators: [
    '<=',
    '>=',
    '==',
    '!=',
    '===',
    '!==',
    '=>',
    '+',
    '-',
    '**',
    '*',
    '/',
    '%',
    '++',
    '--',
    '<<',
    '</',
    '>>',
    '>>>',
    '&',
    '|',
    '^',
    '!',
    '~',
    '&&',
    '||',
    '??',
    '?',
    ':',
    '=',
    '+=',
    '-=',
    '*=',
    '**=',
    '/=',
    '%=',
    '<<=',
    '>>=',
    '>>>=',
    '&=',
    '|=',
    '^=',
    '@',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
  regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,

  tokenizer: {
    root: [[/[{}]/, 'delimiter.bracket'], { include: 'common' }],

    common: [
      // --- JSX (before generic < handling) ---

      // Opening tag — lowercase = HTML element (teal), uppercase = component (blue)
      [/(<)([a-z][\w-]*)/, ['delimiter.tag', { token: 'metatag.html', next: '@jsxTagAttrs' }]],
      [/(<)([A-Z][\w.]*)/, ['delimiter.tag', { token: 'type.identifier', next: '@jsxTagAttrs' }]],
      // Closing tags
      [/(<\/)([a-z][\w-]*)(>)/, ['delimiter.tag', 'metatag.html', 'delimiter.tag']],
      [/(<\/)([A-Z][\w.]*)(>)/, ['delimiter.tag', 'type.identifier', 'delimiter.tag']],
      // Fragments
      [/<>/, 'delimiter.tag'],
      [/<\/>/, 'delimiter.tag'],

      // --- TypeScript ---
      [
        /#?[a-z_$][\w$]*/,
        {
          cases: {
            '@flowKeywords': 'keyword.flow',
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        },
      ],
      [/[A-Z][\w\$]*/, 'type.identifier'],
      { include: '@whitespace' },
      [
        /\/(?=([^\\\/]|\\.)+\/([dgimsuy]*)(\s*)(\.|;|,|\)|\]|\}|$))/,
        { token: 'regexp', bracket: '@open', next: '@regexp' },
      ],
      [/[()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/!(?=([^=]|$))/, 'delimiter'],
      [/@symbols/, { cases: { '@operators': 'delimiter', '@default': '' } }],
      [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
      [/0[xX](@hexdigits)n?/, 'number.hex'],
      [/0[oO]?(@octaldigits)n?/, 'number.octal'],
      [/0[bB](@binarydigits)n?/, 'number.binary'],
      [/(@digits)n?/, 'number'],
      [/[;,.]/, 'delimiter'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
      [/`/, 'string', '@string_backtick'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*\*(?!\/)/, 'comment.doc', '@jsdoc'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],

    jsdoc: [
      [/[^\/*]+/, 'comment.doc'],
      [/\*\//, 'comment.doc', '@pop'],
      [/[\/*]/, 'comment.doc'],
    ],

    regexp: [
      [
        /(\{)(\d+(?:,\d*)?)(\})/,
        ['regexp.escape.control', 'regexp.escape.control', 'regexp.escape.control'],
      ],
      [
        /(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
        ['regexp.escape.control', { token: 'regexp.escape.control', next: '@regexrange' }],
      ],
      [/(\()(\?:|\?=|\?!)/, ['regexp.escape.control', 'regexp.escape.control']],
      [/[()]/, 'regexp.escape.control'],
      [/@regexpctl/, 'regexp.escape.control'],
      [/[^\\\/]/, 'regexp'],
      [/@regexpesc/, 'regexp.escape'],
      [/\\\./, 'regexp.invalid'],
      [/(\/)([dgimsuy]*)/, [{ token: 'regexp', bracket: '@close', next: '@pop' }, 'keyword.other']],
    ],

    regexrange: [
      [/-/, 'regexp.escape.control'],
      [/\^/, 'regexp.invalid'],
      [/@regexpesc/, 'regexp.escape'],
      [/[^\]]/, 'regexp'],
      [/\]/, { token: 'regexp.escape.control', next: '@pop', bracket: '@close' }],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],

    string_backtick: [
      [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
      [/[^\\`$]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/`/, 'string', '@pop'],
    ],

    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'common' },
    ],

    // --- JSX states ---

    /** After <tagName — attributes only, no tag name matching. */
    jsxTagAttrs: [
      [/\s+/, ''],
      [/\/>/, 'delimiter.tag', '@pop'],
      [/>/, 'delimiter.tag', '@pop'],
      [/[a-zA-Z_][\w-]*(?=\s*=)/, 'attribute.name'],
      [/[a-zA-Z_][\w-]*/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"[^"]*"/, 'string'],
      [/'[^']*'/, 'string'],
      [/\{/, 'delimiter.bracket', '@jsxExpression'],
    ],

    /** Expression inside JSX: { typescript code }. */
    jsxExpression: [
      [/\{/, 'delimiter.bracket', '@jsxExpression'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'common' },
    ],
  },
}

/**
 * Registers the JSX-aware tokenizer and defines the molecule-dark theme.
 *
 * @param monaco - The Monaco module instance with languages and editor APIs.
 */
export function registerTsxHighlighting(monaco: {
  languages: {
    setMonarchTokensProvider(
      languageId: string,
      languageDef: Record<string, any>,
    ): { dispose(): void }
  }
  editor: {
    defineTheme(themeName: string, themeData: Record<string, any>): void
  }
}): void {
  monaco.languages.setMonarchTokensProvider('typescript', {
    ...tsxLanguageDef,
    tokenPostfix: '.ts',
  })
  monaco.languages.setMonarchTokensProvider('javascript', {
    ...tsxLanguageDef,
    tokenPostfix: '.js',
  })

  // Theme matching VS Code's Dark+ (dark_vs.json + dark_plus.json)
  monaco.editor.defineTheme('molecule-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // JSX
      { token: 'metatag', foreground: '569CD6' }, // override vs-dark orange → blue
      { token: 'metatag.html', foreground: '569CD6' }, // HTML elements (div, span) — blue
      { token: 'type.identifier', foreground: '4EC9B0' }, // React components (Flex) — teal
      { token: 'attribute.name', foreground: '9CDCFE' }, // attributes — light blue
      { token: 'delimiter.tag', foreground: '808080' }, // < > /> </ — gray

      // Keywords
      { token: 'keyword', foreground: '569CD6' }, // declarations — blue
      { token: 'keyword.flow', foreground: 'C586C0' }, // control flow — purple

      // Types and identifiers
      { token: 'type.identifier', foreground: '4EC9B0' }, // PascalCase types — teal
      { token: 'identifier', foreground: '9CDCFE' }, // variables — light blue

      // Literals
      { token: 'string', foreground: 'CE9178' }, // strings — orange
      { token: 'number', foreground: 'B5CEA8' }, // numbers — light green
      { token: 'regexp', foreground: 'D16969' }, // regex — red

      // Comments
      { token: 'comment', foreground: '6A9955' }, // comments — green
      { token: 'comment.doc', foreground: '6A9955' }, // doc comments — green
    ],
    colors: {},
  })
}
