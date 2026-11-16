let pending = 0;
const listeners = new Set();
export const subscribeActivity = listener => { listeners.add(listener); listener(pending); return () => listeners.delete(listener); };
export const startActivity = config => {
  if (/\/stylist\/jobs\//.test(config.url || '') || config.background) return;
  config.sifitActivity = true;
  pending++;
  listeners.forEach(listener => listener(pending));
};
export const finishActivity = config => {
  if (!config?.sifitActivity) return;
  config.sifitActivity = false;
  pending = Math.max(0, pending - 1);
  listeners.forEach(listener => listener(pending));
};
