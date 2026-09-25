import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();

/** Generates (and caches) a canvas texture with a die-face number on it. */
export function getNumberTexture(value: number, textColor = '#1b1b1f'): THREE.Texture {
  const key = `${value}_${textColor}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = 'bold 64px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), size / 2, size / 2 + 4);

    // A bare "6" and "9" are indistinguishable once rotated 180°, since a die
    // can land with a face twisted to any angle. Underline the digit "6"
    // (matching the common physical-dice convention) so the underline —
    // fixed relative to the glyph — always reveals which one it actually is,
    // no matter how the face is oriented when it settles.
    if (value === 6) {
      const underlineY = size / 2 + 30;
      const underlineHalfWidth = 16;
      ctx.lineWidth = 5;
      ctx.strokeStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(size / 2 - underlineHalfWidth, underlineY);
      ctx.lineTo(size / 2 + underlineHalfWidth, underlineY);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
