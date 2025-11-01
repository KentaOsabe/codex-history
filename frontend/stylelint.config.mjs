/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-order'],
  ignoreFiles: ['dist/**/*', 'node_modules/**/*'],
  rules: {
    'color-hex-length': 'short',
    'selector-class-pattern': null,
    'order/order': [
      'custom-properties',
      'declarations',
      {
        type: 'at-rule',
        name: 'supports',
      },
      {
        type: 'at-rule',
        name: 'media',
      },
      'rules',
    ],
    'order/properties-order': null,
  },
}

export default config
