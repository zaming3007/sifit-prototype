const checkoutKey = userId => `sifit:checkout-payment:${userId}`;
const confirmationKey = paymentId => `sifit:payment-confirmed:${paymentId}`;

export function hasAcknowledgedPayment(paymentId) {
  try {
    return sessionStorage.getItem(confirmationKey(paymentId)) === '1';
  } catch {
    return false;
  }
}

export function acknowledgePayment(paymentId) {
  try {
    sessionStorage.setItem(confirmationKey(paymentId), '1');
  } catch {
    // The browser may block session storage.
  }
}

export function readCheckoutPayment(userId) {
  if (!userId) return null;
  try {
    const id = sessionStorage.getItem(checkoutKey(userId));
    return /^[a-f\d]{24}$/i.test(id || '') && !hasAcknowledgedPayment(id) ? id : null;
  } catch {
    return null;
  }
}

export function rememberCheckoutPayment(userId, paymentId) {
  try {
    sessionStorage.setItem(checkoutKey(userId), paymentId);
  } catch {
    // The browser may block session storage.
  }
}

export function forgetCheckoutPayment(userId, paymentId) {
  try {
    const key = checkoutKey(userId);
    if (sessionStorage.getItem(key) === paymentId) sessionStorage.removeItem(key);
  } catch {
    // The browser may block session storage.
  }
}
