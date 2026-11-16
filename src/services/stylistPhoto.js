// Portrait processing stays in the browser. Only the prepared image goes to the existing try-on API.
const cutouts = new WeakMap();
let modelPromise;
async function segmenter() {
  if (!modelPromise) modelPromise = (async () => {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const runtime = await FilesetResolver.forVisionTasks(import.meta.env.DEV ? '/node_modules/@mediapipe/tasks-vision/wasm' : '/vision/wasm');
    return ImageSegmenter.createFromOptions(runtime, {
      baseOptions: { modelAssetPath: new URL('../assets/stylist/selfie_segmenter.tflite', import.meta.url).href },
      runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true,
    });
  })().catch(error => { modelPromise = null; throw error; });
  return modelPromise;
}
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
async function cutout(file) {
  if (cutouts.has(file)) return cutouts.get(file);
  const pending = (async () => {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1080 / bitmap.width, 1620 / bitmap.height);
    const input = canvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    const context = input.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, input.width, input.height); bitmap.close();
    const model = await segmenter();
    await new Promise(requestAnimationFrame);
    const result = model.segment(input);
    try {
      // The binary SelfieSegmenter exports a single foreground confidence mask;
      // runtimes exposing both classes use channel 1 for the person instead.
      const mask = result.confidenceMasks[1] || result.confidenceMasks[0];
      const probabilities = mask.getAsFloat32Array();
      const pixels = new Uint8ClampedArray(mask.width * mask.height * 4);
      for (let i = 0; i < probabilities.length; i++) {
        pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
        pixels[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (probabilities[i] - 0.1) / 0.8)) * 255);
      }
      const alpha = canvas(mask.width, mask.height);
      alpha.getContext('2d').putImageData(new ImageData(pixels, mask.width, mask.height), 0, 0);
      context.globalCompositeOperation = 'destination-in';
      context.drawImage(alpha, 0, 0, input.width, input.height);
      return input;
    } finally { result.close(); }
  })();
  cutouts.set(file, pending);
  try { return await pending; } catch (error) { cutouts.delete(file); throw error; }
}
export async function prepareStylistPhoto(file, mode, background) {
  if (mode === 'original') return file;
  const person = await cutout(file);
  const output = canvas(864, 1296), ctx = output.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 864, 1296);
  let image;
  if (background.image) image = await createImageBitmap(await (await fetch(background.image)).blob());
  const scene = background.id.startsWith('scene-');
  if (scene) ctx.drawImage(image, 0, 0, 864, 1296);
  const scale = Math.min(820 / person.width, (scene ? 810 : 1230) / person.height);
  const width = person.width * scale, height = person.height * scale;
  ctx.drawImage(person, (864 - width) / 2, (scene ? 1296 * background.footRatio : 1270) - height, width, height);
  if (image && !scene) ctx.drawImage(image, 0, 0, 864, 1296);
  image?.close();
  return new Promise((resolve, reject) => output.toBlob(blob => blob ? resolve(new File([blob], 'sifit-portrait.jpg', { type: 'image/jpeg' })) : reject(new Error('Không tạo được ảnh xem trước.')), 'image/jpeg', 0.94));
}

async function profileStore(action) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('sifit-fitting-room', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('portraits');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('portraits', 'readwrite');
      const request = action(transaction.objectStore('portraits'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
export const savePortrait = (id, value) => profileStore(store => store.put({ ...value, savedAt: Date.now() }, id));
export const deletePortrait = id => profileStore(store => store.delete(id));
export async function readPortrait(id) {
  const value = await profileStore(store => store.get(id));
  if (value && Date.now() - value.savedAt > 7 * 86400000) { await deletePortrait(id); return null; }
  return value;
}
