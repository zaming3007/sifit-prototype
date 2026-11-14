// Crisp, modern vector fashion illustrations for every product category (viewBox 0 0 24 24)
const paths = {
  // Áo thun / Áo sơ mi (Tops & T-shirts)
  tops: 'M8.5 3.5 4 6.5l2 4 2.5-1.5V20a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V9l2.5 1.5 2-4-4.5-3a3.5 3.5 0 0 1-7 0Z',
  // Đầm / Váy liền (Dresses)
  dresses: 'M9 3.5h6l1 4.5-2 3 4 9.5H6L10 11 8 8l1-4.5ZM10 11h4M9 3.5c1 1.5 5 1.5 6 0',
  // Quần dài / Quần âu (Pants & Trousers)
  pants: 'M7 3.5h10l1.5 17h-4.5L12 10.5 10 20.5H5.5L7 3.5ZM7 7h10M12 3.5V7',
  // Quần Jeans / Denim
  jeans: 'M7 3.5h10l1.5 17h-4.5L12 10.5 10 20.5H5.5L7 3.5ZM7 7h10M12 3.5V8M7 9.5c1.5 0 2.5-.8 2.5-2.5M17 9.5c-1.5 0-2.5-.8-2.5-2.5',
  // Chân váy (Skirts)
  skirts: 'M8 4.5h8l3.5 15H4.5L8 4.5ZM7.5 8h9M10 8l-1 11.5M14 8l1 11.5',
  // Áo khoác / Blazer / Coat (Jackets & Outerwear)
  jackets: 'M8.5 3.5 3.5 7l2 4.5 2.5-1.5V20h8V10l2.5 1.5 2-4.5-5-3.5a3.5 3.5 0 0 1-7 0ZM12 6.5V20M8.5 3.5 12 9l3.5-5.5',
  // Đồ len / Sweater (Knitwear)
  knitwear: 'M8.5 4 4 7v11h3v-7l1.5 1V20h7v-8l1.5-1v7h3V7L15.5 4a3.5 3.5 0 0 1-7 0ZM8.5 14h7M8.5 17h7',
  // Giày dép / Sneaker (Shoes & Footwear)
  shoes: 'M3 16.5V14c0-1.1.9-2 2-2h2.5l3-4.5 2.5 2c1.8 1.4 4 2.2 6.3 2.5 1 .1 1.7 1 1.7 2v2.5H3Zm0 2.5h18M9 12l1.8 1.5M11.5 10l1.8 1.5',
  // Túi xách / Ví (Bags & Purses)
  bags: 'M6 8.5h12l1.5 11.5h-15L6 8.5Zm3 0V6.5a3 3 0 0 1 6 0v2M9.5 12.5a2.5 2.5 0 0 0 5 0',
  // Phụ kiện / Kính / Trang sức / Mũ (Accessories)
  accessories: 'M2.5 13a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0Zm12 0a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0ZM9.5 12.5h5M2.5 12l2-5.5h3M21.5 12l-2-5.5h-3',
  // Đồ thể thao (Sportswear)
  sportswear: 'M8 3.5h2l2 3 2-3h2l2 6-2 2v8.5H8V11.5l-2-2 2-6ZM8 14h8',
  // Tất cả trang phục (All Clothing)
  allClothing: 'M8.5 3.5 4 6.5l2 4 2.5-1.5V20a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V9l2.5 1.5 2-4-4.5-3a3.5 3.5 0 0 1-7 0Z',
};

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();

export function resolveCategoryKey(category) {
  if (!category) return 'allClothing';
  const raw = typeof category === 'string' ? category : `${category.slug || ''} ${category.name || ''}`;
  const key = normalizeText(raw);

  if (paths[raw]) return raw;
  if (key.includes('ao khoac') || key.includes('ao-khoac') || key.includes('blazer') || key.includes('jacket') || key.includes('coat') || key.includes('hoodie') || key.includes('cardigan')) return 'jackets';
  if (key.includes('len') || key.includes('knit') || key.includes('sweater')) return 'knitwear';
  if (key.includes('chan vay') || key.includes('chan-vay') || key.includes('skirt')) return 'skirts';
  if (key.includes('dam') || key.includes('vay') || key.includes('dress')) return 'dresses';
  if (key.includes('jean') || key.includes('denim')) return 'jeans';
  if (key.includes('quan') || key.includes('pant') || key.includes('trouser') || key.includes('short')) return 'pants';
  if (key.includes('giay') || key.includes('dep') || key.includes('shoe') || key.includes('sneaker') || key.includes('boot') || key.includes('sandal')) return 'shoes';
  if (key.includes('tui') || key.includes('balo') || key.includes('vi') || key.includes('bag') || key.includes('purse')) return 'bags';
  if (key.includes('phu kien') || key.includes('phu-kien') || key.includes('kinh') || key.includes('mu') || key.includes('non') || key.includes('trang suc') || key.includes('access')) return 'accessories';
  if (key.includes('the thao') || key.includes('sport') || key.includes('gym')) return 'sportswear';
  if (key.includes('ao') || key.includes('top') || key.includes('shirt') || key.includes('blouse') || key.includes('polo')) return 'tops';
  return 'allClothing';
}

export default function CategoryIcon({ category, className = '' }) {
  const resolved = resolveCategoryKey(category);
  return (
    <svg
      viewBox="0 0 24 24"
      width="36"
      height="36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[resolved] || paths.allClothing} />
    </svg>
  );
}
