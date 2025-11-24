import crypto, { type BinaryLike } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/react-vite'

const dirname = fileURLToPath(new URL('.', import.meta.url))

const ensureCryptoHash = () => {
  const namespace = crypto as typeof crypto & {
    hash?: (algorithm: string, data: BinaryLike | ArrayBuffer, encoding?: crypto.BinaryToTextEncoding) => string | Buffer
  }
  if (typeof namespace.hash === 'function') {
    return
  }

  const updateWithBinary = (data: BinaryLike | ArrayBuffer) => {
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data)
    }
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    }
    return data
  }

  namespace.hash = (algorithm, data, encoding) => {
    const hasher = crypto.createHash(algorithm)
    hasher.update(updateWithBinary(data))
    if (encoding) {
      return hasher.digest(encoding)
    }
    return hasher.digest()
  }
}

ensureCryptoHash()

const config: StorybookConfig = {
  stories: [
    '../src/features/session-detail/**/*.mdx',
    '../src/features/session-detail/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: (config) => {
    config.resolve = {
      ...(config.resolve ?? {}),
      alias: {
        ...(config.resolve?.alias ?? {}),
        '@': path.resolve(dirname, '../src'),
      },
    }

    return config
  },
}

export default config
