const COLOR_REGEX = /#(?:[0-9a-f]{3,8})\b|rgba?\(|hsla?\(/i
const COLOR_KEY_PATTERN = /(color|background|border|shadow|fill|stroke)/i

const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'テーマトークンを使わずに CSS カラーを直書きすることを禁止する',
      recommended: false,
    },
    schema: [],
    messages: {
      noLiteral:
        'カラー指定は CSS 変数 (var(--theme-*))) やトークンを利用してください。直接 {{value}} を書くことはできません。',
    },
  },
  create(context) {
    const inspectObject = (node) => {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue
        const keyName = getPropertyName(prop)
        if (!keyName || !COLOR_KEY_PATTERN.test(keyName)) continue
        const literalValue = getLiteralValue(prop.value)
        if (!literalValue) continue
        if (literalValue.trim().startsWith('var(')) continue
        if (COLOR_REGEX.test(literalValue)) {
          context.report({ node: prop.value, messageId: 'noLiteral', data: { value: literalValue } })
        }
      }
    }

    const getPropertyName = (node) => {
      if (node.key.type === 'Identifier') {
        return node.key.name
      }
      if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
        return node.key.value
      }
      return null
    }

    const getLiteralValue = (node) => {
      if (!node) return null
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value
      }
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return node.quasis.map((q) => q.value.cooked ?? '').join('')
      }
      if (
        node.type === 'JSXExpressionContainer' &&
        node.expression &&
        node.expression.type === 'Literal' &&
        typeof node.expression.value === 'string'
      ) {
        return node.expression.value
      }
      return null
    }

    return {
      ObjectExpression(node) {
        inspectObject(node)
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') {
          return
        }
        if (!node.value || node.value.type !== 'JSXExpressionContainer') {
          return
        }
        const expr = node.value.expression
        if (expr && expr.type === 'ObjectExpression') {
          inspectObject(expr)
        }
      },
    }
  },
}

const plugin = {
  rules: {
    'no-literal-colors': rule,
  },
}

export default plugin
