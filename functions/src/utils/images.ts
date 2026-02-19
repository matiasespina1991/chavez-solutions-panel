// utils/images.ts
import sharp from 'sharp';
import { encode } from 'blurhash';

export async function createWebpVariants(
  localPath: string
): Promise<{ [k: string]: { path: string; width: number; height: number } }> {
  const tmpBase = '/tmp';
  const sizes = {
    webp_thumb: 320,
    webp_small: 640,
    webp_medium: 1280,
    webp_large: 1920,
  };

  const results: {
    [k: string]: { path: string; width: number; height: number };
  } = {};

  const image = sharp(localPath);
  const metadata = await image.metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  for (const [key, width] of Object.entries(sizes)) {
    const out = `${tmpBase}/${Date.now()}-${key}.webp`;
    await image.resize({ width, withoutEnlargement: true }).webp().toFile(out);
    const meta = await sharp(out).metadata();
    results[key] = {
      path: out,
      width: meta.width ?? originalWidth,
      height: meta.height ?? originalHeight,
    };
  }

  return results;
}

export async function generateBlurHash(localPath: string): Promise<string> {
  // Leemos la imagen, forzamos alpha y la redimensionamos a 32x32
  const img = sharp(localPath)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: 'inside' });

  const { data, info } = await img.toBuffer({ resolveWithObject: true });

  // blurhash necesita RGB, descartamos alpha
  const pixels = new Uint8ClampedArray(info.width * info.height * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    pixels[j] = data[i]; // R
    pixels[j + 1] = data[i + 1]; // G
    pixels[j + 2] = data[i + 2]; // B
  }

  const blur = encode(pixels, info.width, info.height, 4, 3);
  return blur;
}
