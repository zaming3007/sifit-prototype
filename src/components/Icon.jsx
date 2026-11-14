// Core navigation and e-commerce icons render locally as crisp SVGs,
// ensuring clean, modern visuals even without external font CDNs.
const paths = {
  add: 'M12 4v16M4 12h16',
  remove: 'M5 12h14',
  check: 'M20 6 9 17l-5-5',
  check_circle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  task_alt: 'M21 11v1a9 9 0 1 1-5-8M8 11l4 4L22 5',
  dashboard: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  inventory_2: 'M3 3h18v5H3V3Zm2 5v13h14V8M9 12h6',
  add_box: 'M3 3h18v18H3V3Zm9 4v10M7 12h10',
  storefront: 'M3 3h18l1 6a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2l1-6ZM4 12v9h16v-9M9 21v-7h6v7',
  location_on: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  settings: 'm9 3 1-2h4l1 2 2 1 2-1 2 4-1 2v3l1 2-2 4-2-1-2 1-1 3h-4l-1-3-2-1-2 1-2-4 1-2V9L2 7l2-4 2 1 3-1Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  history: 'M3 3v5h5M3 8a9 9 0 1 1 0 8M12 7v5l4 2',
  panel_collapse: 'M3 3h18v18H3V3Zm5 0v18m8-13-4 4 4 4',
  panel_expand: 'M3 3h18v18H3V3Zm5 0v18m4-13 4 4-4 4',
  logout: 'M9 3H3v18h6m5-15 6 6-6 6M8 12h12',
  login: 'M15 3h6v18h-6m-5-15-6 6 6 6m-6-6h12',
  expand_more: 'm6 9 6 6 6-6',
  expand_less: 'm18 15-6-6-6 6',
  chevron_down: 'm6 9 6 6 6-6',
  chevron_up: 'm18 15-6-6-6 6',
  chevron_right: 'm9 6 6 6-6 6',
  chevron_left: 'm15 18-6-6 6-6',
  arrow_forward_ios: 'm9 6 6 6-6 6',
  arrow_back_ios: 'm15 18-6-6 6-6',
  refresh: 'M20 3v6h-6M20 9a8 8 0 1 0 0 7',
  payments: 'M2 5h20v14H2V5Zm14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 9h.01M19 15h.01',
  credit_card: 'M1 4h22v16H1V4zm0 6h22M5 15h2',
  account_balance_wallet: 'M20 8V4H4a2 2 0 0 0-2 2v14h20V8H4a2 2 0 0 1 0-4m18 8h-7v5h7m-4-2.5h.01',
  schedule: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  arrow_forward: 'M4 12h16m-6-6 6 6-6 6',
  arrow_back: 'M20 12H4m6-6-6 6 6 6',
  visibility: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  visibility_off: 'M3 3l18 18M10 5h2c6 0 10 7 10 7l-3 4M6 6a24 24 0 0 0-4 6s4 7 10 7c2 0 4-1 5-2M10 10a3 3 0 0 0 4 4',
  north_east: 'M6 18 18 6M6 6h12v12',
  south: 'M12 4v16m-6-6 6 6 6-6',
  north: 'M12 20V4m-6 6 6-6 6 6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  shopping_bag: 'M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2',
  shopping_cart: 'M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6',
  add_shopping_cart: 'M3 3h2l3 12h10l3-8H7M10 19h.01M18 19h.01M15 2v8m-4-4h8',
  person: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  account_circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm-7 9.5a8 8 0 0 1 14 0',
  eco: 'M20 3C7 1 2 7 5 15c3 8 17 6 15-12ZM5 20 16 9',
  favorite: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  forum: 'M21 11V3H3v13l4-4h14ZM9 16h8l4 4v-4h1V9',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  chat_bubble_outline: 'M21 3H3v15l4-4h14V3Z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7ZM5.45 5.11L2 12v0h20v0l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  checkroom: 'M10 5a2 2 0 1 1 4 0c0 2-2 2-2 4v2L2 17v3h20v-3L12 11',
  verified_user: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4ZM8 12l3 3 5-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  verified: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-3-10 2 2 4-4',
  receipt_long: 'M4 3l2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2-2-2-2 2V3ZM8 9h8M8 13h8M8 17h5',
  receipt: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zm4 6h8m-8 4h8m-8 4h5',
  notifications_none: 'M5 17h14l-2-3V9A5 5 0 0 0 7 9v5l-2 3Zm5 3h4M12 2v2',
  notifications: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9zm-4.27 13a2 2 0 0 1-3.46 0',
  auto_awesome: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM21 2v4m-2-2h4',
  sparkles: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM21 2v4m-2-2h4',
  language: 'M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0ZM3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z',
  image: 'M3 3h18v18H3V3ZM3 17l6-6 4 4 3-3 5 5M16 7h.01',
  close: 'M6 6l12 12M6 18 18 6',
  flag: 'M5 21V3m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0',
  menu: 'M3 6h18M3 12h18M3 18h18',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  local_shipping: 'M2 5h12v12H2V5Zm12 5h4l4 5v2h-8V10ZM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14h.01M12 11v6',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-5h.01M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
  delete: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98',
  filter_list: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  tune: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  sort: 'M3 6h18M6 12h12M9 18h6',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-12 0V7a5 5 0 0 1 10 0v4',
  lock_open: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2ZM7 11V7a5 5 0 0 1 9.9-1',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  warning: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
  error: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v6m0 4h.01',
  qr_code: 'M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-8-4h2v2h-2v-2zm0-4h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z',
  sell: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  discount: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  thumb_up: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
  content_copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  // Fashion & Product Category Icons
  tops: 'M8.5 3.5 4 6.5l2 4 2.5-1.5V20a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V9l2.5 1.5 2-4-4.5-3a3.5 3.5 0 0 1-7 0Z',
  dresses: 'M9 3.5h6l1 4.5-2 3 4 9.5H6L10 11 8 8l1-4.5ZM10 11h4M9 3.5c1 1.5 5 1.5 6 0',
  pants: 'M7 3.5h10l1.5 17h-4.5L12 10.5 10 20.5H5.5L7 3.5ZM7 7h10M12 3.5V7',
  jeans: 'M7 3.5h10l1.5 17h-4.5L12 10.5 10 20.5H5.5L7 3.5ZM7 7h10M12 3.5V8M7 9.5c1.5 0 2.5-.8 2.5-2.5M17 9.5c-1.5 0-2.5-.8-2.5-2.5',
  skirts: 'M8 4.5h8l3.5 15H4.5L8 4.5ZM7.5 8h9M10 8l-1 11.5M14 8l1 11.5',
  jackets: 'M8.5 3.5 3.5 7l2 4.5 2.5-1.5V20h8V10l2.5 1.5 2-4.5-5-3.5a3.5 3.5 0 0 1-7 0ZM12 6.5V20M8.5 3.5 12 9l3.5-5.5',
  knitwear: 'M8.5 4 4 7v11h3v-7l1.5 1V20h7v-8l1.5-1v7h3V7L15.5 4a3.5 3.5 0 0 1-7 0ZM8.5 14h7M8.5 17h7',
  shoes: 'M3 16.5V14c0-1.1.9-2 2-2h2.5l3-4.5 2.5 2c1.8 1.4 4 2.2 6.3 2.5 1 .1 1.7 1 1.7 2v2.5H3Zm0 2.5h18M9 12l1.8 1.5M11.5 10l1.8 1.5',
  bags: 'M6 8.5h12l1.5 11.5h-15L6 8.5Zm3 0V6.5a3 3 0 0 1 6 0v2M9.5 12.5a2.5 2.5 0 0 0 5 0',
  accessories: 'M2.5 13a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0Zm12 0a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0ZM9.5 12.5h5M2.5 12l2-5.5h3M21.5 12l-2-5.5h-3',
  sportswear: 'M8 3.5h2l2 3 2-3h2l2 6-2 2v8.5H8V11.5l-2-2 2-6ZM8 14h8',
  allClothing: 'M8.5 3.5 4 6.5l2 4 2.5-1.5V20a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V9l2.5 1.5 2-4-4.5-3a3.5 3.5 0 0 1-7 0Z',
  drag_indicator: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
};
paths.favorite_border = paths.favorite;
paths.star_border = paths.star;
paths.shirt = paths.tops;
paths.dress = paths.dresses;
paths.trousers = paths.pants;
paths.skirt = paths.skirts;
paths.jacket = paths.jackets;
paths.footwear = paths.shoes;
paths.handbag = paths.bags;

export default function Icon({ name, className = '', filled = false }) {
  const isFilled = filled || className.includes('fill');
  const d = paths[name] || paths[name?.replace(/_outlined$/, '')];

  if (!d) {
    return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
  }

  return (
    <span aria-hidden="true" className={`sifit-icon inline-flex items-center justify-center ${className}`}>
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill={isFilled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={isFilled ? '0.5' : '1.75'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    </span>
  );
}
