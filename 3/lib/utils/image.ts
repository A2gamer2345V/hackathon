/**
 * Turning a chosen picture into something we can actually keep.
 *
 * Photos live in the same local store as everything else, as data URLs — no
 * upload, no remote URL, nothing leaves the device. That store is small, and
 * `writeValue` swallows a quota failure rather than crashing the screen, so an
 * oversized photo would look saved and then quietly vanish on reload. Every
 * picture is therefore re-drawn small before it is stored: a caregiver's 4 MB
 * camera photo becomes roughly 20 KB, which is plenty at the sizes we show it.
 */

/** Long edge of the stored image, in pixels. Portraits render at 184px. */
const MAX_EDGE = 384;

/** JPEG quality. 0.82 keeps faces clean without doubling the size. */
const QUALITY = 0.82;

/**
 * Refuse absurd input before decoding it. A 60 MB file would be resized fine
 * but would freeze a modest phone for seconds first.
 */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export class ImageError extends Error {
  constructor(readonly code: 'type' | 'size' | 'decode') {
    super(code);
    this.name = 'ImageError';
  }
}

/**
 * Reads a picked file and returns a small JPEG data URL.
 *
 * Throws `ImageError` with a code the caller can turn into a translated
 * message — never an English string, and never a raw browser error.
 */
export async function fileToPortraitDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ImageError('type');
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('size');

  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageError('decode');

  // A white ground, so a transparent PNG does not become a black square once
  // it is flattened into JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  if (!dataUrl.startsWith('data:image/')) throw new ImageError('decode');
  return dataUrl;
}

/**
 * `createImageBitmap` where it exists — it decodes off the main thread and
 * honours EXIF orientation, so a photo taken sideways is stored upright. The
 * `<img>` path is the fallback for older Safari.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to the <img> path rather than giving up.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new ImageError('decode'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
