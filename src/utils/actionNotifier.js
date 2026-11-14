// Central categorized action notification & activity log system for SiFit.

export const ACTION_CATEGORIES = {
  cart: {
    key: 'cart',
    labelVi: 'Giỏ hàng',
    labelEn: 'Shopping Bag',
    icon: 'shopping_bag',
    tone: 'emerald',
  },
  wishlist: {
    key: 'wishlist',
    labelVi: 'Yêu thích',
    labelEn: 'Wishlist',
    icon: 'favorite',
    tone: 'rose',
  },
  order: {
    key: 'order',
    labelVi: 'Đơn hàng',
    labelEn: 'Orders',
    icon: 'receipt_long',
    tone: 'emerald',
  },
  offer: {
    key: 'offer',
    labelVi: 'Đề nghị giá',
    labelEn: 'Price Offer',
    icon: 'payments',
    tone: 'amber',
  },
  shop: {
    key: 'shop',
    labelVi: 'Gian hàng',
    labelEn: 'Shop',
    icon: 'storefront',
    tone: 'indigo',
  },
  chat: {
    key: 'chat',
    labelVi: 'Tin nhắn',
    labelEn: 'Messages',
    icon: 'forum',
    tone: 'sky',
  },
  profile: {
    key: 'profile',
    labelVi: 'Hồ sơ & Địa chỉ',
    labelEn: 'Profile & Address',
    icon: 'person',
    tone: 'teal',
  },
  review: {
    key: 'review',
    labelVi: 'Đánh giá & Báo cáo',
    labelEn: 'Reviews & Reports',
    icon: 'star',
    tone: 'amber',
  },
  auth: {
    key: 'auth',
    labelVi: 'Tài khoản',
    labelEn: 'Account',
    icon: 'verified_user',
    tone: 'emerald',
  },
  error: {
    key: 'error',
    labelVi: 'Cảnh báo thao tác',
    labelEn: 'Action Alert',
    icon: 'error',
    tone: 'red',
  },
};

const STORAGE_KEY = 'sifit-action-notifications';
const MAX_HISTORY = 40;
let lastSignature = '';
let lastTimestamp = 0;

export function getActionHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearActionHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sifit:action-history-updated'));
  }
}

export function notifyAction({
  category = 'cart',
  title = '',
  message = '',
  icon,
  tone,
  duration = 3800,
}) {
  if (typeof window === 'undefined') return;

  const meta = ACTION_CATEGORIES[category] || ACTION_CATEGORIES.cart;
  const now = Date.now();
  const signature = `${category}:${title}:${message}`;

  // Prevent duplicate toasts within 600ms when both apiClient and context fire
  if (signature === lastSignature && now - lastTimestamp < 600) {
    return;
  }
  lastSignature = signature;
  lastTimestamp = now;

  const entry = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    category: meta.key,
    categoryLabelVi: meta.labelVi,
    categoryLabelEn: meta.labelEn,
    icon: icon || meta.icon,
    tone: tone || (category === 'error' ? 'red' : meta.tone),
    title: title || meta.labelVi,
    message,
    createdAt: new Date(now).toISOString(),
    duration,
  };

  try {
    const nextHistory = [entry, ...getActionHistory()].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  } catch {
    /* ignore quota errors */
  }

  window.dispatchEvent(new CustomEvent('sifit:action-toast', { detail: entry }));
  window.dispatchEvent(new CustomEvent('sifit:action-history-updated', { detail: entry }));
}

// Automatically classify API mutations that don't have explicit context calls
export function notifyFromApiMutation(config, response) {
  if (!config) return;
  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return;

  const url = String(config.url || '');

  // Skip silent background endpoints (refresh-token, mark-read, etc.)
  if (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/google') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout') ||
    url.includes('/cart') ||
    url.includes('/wishlist') ||
    url.includes('/read') ||
    url.includes('/messages')
  ) {
    return;
  }

  // Price Offers (/offers)
  if (url.includes('/offers')) {
    if (url.includes('/accept')) {
      notifyAction({
        category: 'offer',
        title: 'Đã chấp nhận đề nghị giá',
        message: 'Mức giá mới đã được áp dụng cho người mua.',
        icon: 'task_alt',
      });
    } else if (url.includes('/reject')) {
      notifyAction({
        category: 'offer',
        title: 'Đã từ chối đề nghị giá',
        message: 'Bạn đã từ chối mức giá đề nghị này.',
        icon: 'close',
      });
    } else if (url.includes('/counter')) {
      notifyAction({
        category: 'offer',
        title: 'Đã gửi giá đề nghị lại',
        message: 'Phản hồi thương lượng giá đã được gửi đi.',
        icon: 'payments',
      });
    } else if (url.includes('/cancel') || method === 'delete') {
      notifyAction({
        category: 'offer',
        title: 'Đã hủy đề nghị giá',
        message: 'Đề nghị thương lượng giá đã được thu hồi.',
        icon: 'delete',
      });
    } else if (method === 'post') {
      notifyAction({
        category: 'offer',
        title: 'Đã gửi đề nghị trả giá',
        message: 'Người bán sẽ sớm nhận được mức giá bạn đề xuất.',
        icon: 'payments',
      });
    }
    return;
  }

  // Following Shops (/follows or /follow)
  if (url.includes('/follow')) {
    if (method === 'delete' || url.includes('/unfollow')) {
      notifyAction({
        category: 'shop',
        title: 'Đã bỏ theo dõi Shop',
        message: 'Bạn sẽ không còn nhận thông báo đồ mới từ shop này.',
        icon: 'storefront',
      });
    } else {
      notifyAction({
        category: 'shop',
        title: 'Đã theo dõi Shop',
        message: 'Bạn sẽ nhận được cập nhật khi shop đăng món đồ mới.',
        icon: 'storefront',
      });
    }
    return;
  }

  // Delivery Addresses (/addresses)
  if (url.includes('/address')) {
    if (method === 'delete') {
      notifyAction({
        category: 'profile',
        title: 'Đã xóa địa chỉ nhận hàng',
        message: 'Địa chỉ đã được gỡ khỏi sổ địa chỉ của bạn.',
        icon: 'delete',
      });
    } else if (url.includes('/default')) {
      notifyAction({
        category: 'profile',
        title: 'Đã đặt địa chỉ mặc định',
        message: 'Địa chỉ này sẽ được ưu tiên khi bạn thanh toán.',
        icon: 'location_on',
      });
    } else if (method === 'post') {
      notifyAction({
        category: 'profile',
        title: 'Đã thêm địa chỉ mới',
        message: 'Địa chỉ nhận hàng mới đã được lưu vào hồ sơ.',
        icon: 'location_on',
      });
    } else {
      notifyAction({
        category: 'profile',
        title: 'Đã cập nhật địa chỉ',
        message: 'Thông tin địa chỉ nhận hàng đã được lưu lại.',
        icon: 'location_on',
      });
    }
    return;
  }

  // Reviews (/reviews)
  if (url.includes('/review')) {
    notifyAction({
      category: 'review',
      title: 'Đã gửi đánh giá sản phẩm',
      message: 'Cảm ơn bạn đã chia sẻ trải nghiệm mua sắm cùng cộng đồng SiFit.',
      icon: 'star',
    });
    return;
  }

  // Product / Message Reports (/reports)
  if (url.includes('/report')) {
    notifyAction({
      category: 'review',
      title: 'Đã gửi báo cáo vi phạm',
      message: 'Đội ngũ kiểm duyệt SiFit đã ghi nhận và sẽ xử lý sớm nhất.',
      icon: 'flag',
    });
    return;
  }

  // Disputes & Refunds (/disputes, /refunds)
  if (url.includes('/dispute') || url.includes('/refund')) {
    notifyAction({
      category: 'order',
      title: 'Đã cập nhật khiếu nại / hoàn tiền',
      message: 'Yêu cầu bảo vệ đơn hàng của bạn đã được ghi nhận.',
      icon: 'shield',
    });
    return;
  }

  // Shipments & Order Status (/shipments, /orders)
  if (url.includes('/shipment') || (url.includes('/orders') && method !== 'post')) {
    if (url.includes('/cancel')) {
      notifyAction({
        category: 'order',
        title: 'Đã hủy đơn hàng',
        message: 'Trạng thái đơn hàng đã được chuyển sang đã hủy.',
        icon: 'close',
      });
    } else if (url.includes('/confirm') || url.includes('/complete') || url.includes('/receive')) {
      notifyAction({
        category: 'order',
        title: 'Đã xác nhận nhận hàng',
        message: 'Đơn hàng hoàn tất! Bạn có thể để lại đánh giá cho shop.',
        icon: 'task_alt',
      });
    } else {
      notifyAction({
        category: 'order',
        title: 'Đã cập nhật vận đơn & đơn hàng',
        message: 'Trạng thái giao nhận của đơn hàng vừa được cập nhật.',
        icon: 'local_shipping',
      });
    }
    return;
  }

  // Seller Product Management (/products)
  if (url.includes('/products')) {
    if (method === 'delete') {
      notifyAction({
        category: 'shop',
        title: 'Đã xóa sản phẩm khỏi kệ',
        message: 'Món đồ đã được gỡ khỏi gian hàng của bạn.',
        icon: 'delete',
      });
    } else if (method === 'post') {
      notifyAction({
        category: 'shop',
        title: 'Đã đăng bán sản phẩm mới',
        message: 'Món đồ của bạn đã được đưa lên kệ hàng SiFit.',
        icon: 'add_box',
      });
    } else {
      notifyAction({
        category: 'shop',
        title: 'Đã cập nhật thông tin sản phẩm',
        message: 'Thay đổi của món đồ đã được lưu thành công.',
        icon: 'inventory_2',
      });
    }
    return;
  }

  // Notification Preferences (/notifications)
  if (url.includes('/notifications/preferences')) {
    notifyAction({
      category: 'profile',
      title: 'Đã lưu tùy chọn thông báo',
      message: 'Cài đặt nhận thông báo của bạn đã được cập nhật.',
      icon: 'notifications',
    });
    return;
  }

  // Fallback for other Seller / Admin operations
  if (url.includes('/seller') || url.includes('/admin') || url.includes('/payout')) {
    const serverMessage = response?.data?.message;
    notifyAction({
      category: 'shop',
      title: 'Thao tác thành công',
      message: serverMessage || 'Hệ thống đã ghi nhận cập nhật của bạn.',
      icon: 'task_alt',
    });
  }
}
