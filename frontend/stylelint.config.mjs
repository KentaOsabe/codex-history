/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-order'],
  ignoreFiles: ['dist/**/*', 'node_modules/**/*'],
  rules: {
    'color-hex-length': 'short',
    'color-no-hex': true,
    'declaration-property-value-disallowed-list': {
      '/^(color|background|border|fill|stroke)/': [
        '/#/',
        '/\\brgb(a)?\\(/i',
        '/\\bhsl(a)?\\(/i',
      ],
      'box-shadow': ['/\\brgb(a)?\\(/i', '/#/', '/\\bhsl(a)?\\(/i'],
    },
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
