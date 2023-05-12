module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		'plugin:react/recommended',
		'next/core-web-vitals',
		'xo',
	],
	overrides: [
		{
			extends: [
				'xo-typescript',
			],
			files: [
				'*.ts',
				'*.tsx',
			],
			rules: {
				'@typescript-eslint/comma-dangle': ['warn', {
					arrays: 'never',
					objects: 'always',
					imports: 'never',
					exports: 'never',
					functions: 'never',
					generics: 'always',
					enums: 'always',
					tuples: 'always',
				}],
				'@typescript-eslint/object-curly-spacing': ['error', 'always', {arraysInObjects: true, objectsInObjects: true}],
				'no-unused-vars': 'off',
				'unused-imports/no-unused-imports': 'error',
				'import/order': ['error', {
					'newlines-between': 'always',
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
				}],
				'import/newline-after-import': ['error', {count: 1}],
				'@typescript-eslint/naming-convention': 'off',
				'capitalized-comments': 'off',
				'@typescript-eslint/indent': ['error', 2],
				// 'arrow-parens': ['always', 'always'],
				// '@typescript-eslint/arrow-parens': ['always', 'always'],
				// '@typescript-eslint/arrow-parens': ['always', 2],
				// indent: ['error', 2],
			},
		},
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: [
		'react',
		'unused-imports',
		'import',
	],
	rules: {
		// Indent: ['error', 2],
	},
};
