import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Same as the built-in `minimal-2023` preset, except maskable/apple icons are
// padded onto the app's own background colour instead of the generator's
// default white, so they read as one flat icon instead of a dark square on a
// white card.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { fit: 'contain', background: '#111827' },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { fit: 'contain', background: '#111827' },
    },
  },
  images: ['public/icon.svg'],
})
