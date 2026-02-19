import createCache from '@emotion/cache';

// Crea un cache de Emotion con key fija para que las clases sean iguales en server y client.
export default function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}
