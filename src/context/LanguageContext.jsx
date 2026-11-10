import { createContext, useContext, useEffect, useState } from 'react';
import { sellingCopy } from '../data/sellingCopy';

// Keep copy together so switching language never changes navigation or form state.
const copy = {
  announcement: ['Good clothes. A new chapter. Welcome to Sifit.', 'Đồ đẹp. Một hành trình mới. Chào mừng bạn đến Sifit.'],
  shop: ['SHOP', 'MUA SẮM'], sell: ['SELL', 'BÁN ĐỒ'], search: ['Search pieces, brands & more', 'Tìm sản phẩm, thương hiệu…'],
  searchLabel: ['Search', 'Tìm kiếm'], ai: ['AI Stylist', 'AI phối đồ'], login: ['Log in', 'Đăng nhập'], signup: ['Sign up', 'Đăng ký'],
  logout: ['Log out', 'Đăng xuất'], cart: ['Shopping bag', 'Giỏ hàng'], account: ['My account', 'Tài khoản'],
  newArrivals: ['New arrivals', 'Hàng mới về'], women: ['Women', 'Thời trang nữ'], designer: ['Designer', 'Nhà thiết kế'],
  premium: ['Premium', 'Cao cấp'], accessories: ['Accessories', 'Phụ kiện'], brands: ['Brands', 'Thương hiệu'],
  dresses: ['Dresses', 'Đầm'], tops: ['Tops', 'Áo'], pants: ['Pants', 'Quần'], jeans: ['Jeans', 'Quần jeans'],
  skirts: ['Skirts', 'Chân váy'], jackets: ['Jackets', 'Áo khoác'], knitwear: ['Knitwear', 'Đồ len'], shoes: ['Shoes', 'Giày'],
  bags: ['Bags', 'Túi'], allClothing: ['All clothing', 'Tất cả quần áo'], clothing: ['Clothing', 'Quần áo'],
  heroEyebrow: ['SIFIT RESALE MARKETPLACE', 'SIFIT · THỜI TRANG SECOND-HAND'],
  heroTitle: ['give good clothes\nanother life.', 'cho đồ đẹp\nmột cuộc đời mới.'],
  heroDescription: ['Curated second-hand fashion — made easier to shop, easier to resell.', 'Thời trang second-hand chọn lọc — dễ mua hơn, dễ bán lại hơn.'],
  discover: ['DISCOVER THE SHOP', 'KHÁM PHÁ CỬA HÀNG'],
  explore: ['EXPLORE CATEGORIES', 'KHÁM PHÁ DANH MỤC'], categoryTitle: ['shop by category.', 'mua sắm theo danh mục.'],
  categoryDescription: ['Find your next favourite in Sifit’s curated wardrobe.', 'Tìm món đồ yêu thích tiếp theo trong tủ đồ chọn lọc của Sifit.'],
  viewAll: ['VIEW ALL', 'XEM TẤT CẢ'], shopClothing: ['SHOP CLOTHING', 'MUA QUẦN ÁO'], shopBags: ['SHOP BAGS', 'MUA TÚI'],
  shopShoes: ['SHOP SHOES', 'MUA GIÀY'], newIn: ['NEW IN', 'KHÁM PHÁ ĐỒ MỚI'],
  mostSearched: ['MOST SEARCHED', 'TÌM KIẾM PHỔ BIẾN'], searchTitle: ['not sure where to start?', 'chưa biết bắt đầu từ đâu?'],
  searchDescription: ['Jump into the items, materials, and brands people often search for on Sifit’s e-shop.', 'Khám phá những món đồ, chất liệu và thương hiệu được tìm kiếm nhiều trên Sifit.'],
  items: ['Items', 'Món đồ'], materials: ['Materials', 'Chất liệu'], blazer: ['blazer', 'áo blazer'], midiDresses: ['midi dresses', 'đầm midi'],
  leatherBags: ['leather bags 👜', 'túi da 👜'], wideJeans: ['wide-leg jeans', 'jeans ống rộng'], midiSkirts: ['midi skirts', 'chân váy midi'],
  sandals: ['sandals', 'giày sandal'], denim: ['denim', 'denim'], silk: ['silk', 'lụa'], linen: ['linen', 'vải lanh'], leather: ['leather', 'da'], tweed: ['tweed', 'vải tweed'], wool: ['wool', 'len'],
  lastChance: ['LAST CHANCE', 'CƠ HỘI CUỐI'], lastTitle: ['good pieces before they leave the e-shop.', 'đồ đẹp, trước khi tìm được chủ mới.'],
  lastDescription: ['A small edit of marked-down pieces, usually one of a kind.', 'Một tuyển chọn nhỏ những món đồ giá tốt, thường chỉ có một.'],
  shopLastChance: ['SHOP LAST CHANCE', 'SĂN ĐỒ GIÁ TỐT'], browseShop: ['BROWSE SHOP', 'DẠO CỬA HÀNG'],
  usefulLinks: ['Useful Links', 'Liên kết hữu ích'], home: ['Home', 'Trang chủ'], about: ['About us', 'Về chúng tôi'], products: ['Products', 'Sản phẩm'],
  services: ['Services', 'Dịch vụ'], legal: ['Legal', 'Điều khoản'], contact: ['Contact us', 'Liên hệ'], aboutSifit: ['About Sifit', 'Về Sifit'], connect: ['Connect with us', 'Kết nối với chúng tôi'],
  aboutText: ['Sifit is an online consignment and resale marketplace for women’s clothing. We make buying and reselling pre-loved fashion fresh, trustworthy, and convenient — giving well-loved garments a longer life.', 'Sifit là nền tảng ký gửi và mua bán lại thời trang nữ trực tuyến. Chúng tôi mang đến trải nghiệm mua và bán đồ đã qua sử dụng mới mẻ, đáng tin cậy và tiện lợi — để mỗi món đồ được yêu thích lâu hơn.'],
  mission: ['Our mission is to help women dress better by owning just enough, so they can live more.', 'Sứ mệnh của Sifit là giúp phụ nữ mặc đẹp hơn với một tủ đồ vừa đủ, để tận hưởng cuộc sống nhiều hơn.'],
  copyright: ['Wear your style. Leave a lighter footprint.', 'Mặc theo cách của bạn. Sống xanh hơn mỗi ngày.'],
  authTitle: ['Good style starts\nwith a second chance.', 'Phong cách đẹp,\nbắt đầu từ cơ hội mới.'],
  authDescription: ['Join a community giving good clothes another life.', 'Gia nhập cộng đồng trao cho đồ đẹp một cuộc đời mới.'],
  welcomeBack: ['Welcome back.', 'Chào mừng trở lại.'], loginDescription: ['Your next favourite piece is waiting for you.', 'Món đồ yêu thích tiếp theo đang chờ bạn.'],
  name: ['Full name', 'Họ và tên'], email: ['Email', 'Email'], password: ['Password', 'Mật khẩu'], role: ['I’d like to', 'Tôi muốn'],
  buyer: ['Shop pre-loved pieces', 'Mua đồ second-hand'], seller: ['Sell my wardrobe', 'Bán đồ trong tủ'],
  emailSignup: ['Sign up with email', 'Đăng ký bằng email'], continueEmail: ['Continue with email', 'Tiếp tục bằng email'],
  google: ['Continue with Google', 'Tiếp tục với Google'], facebook: ['Continue with Facebook', 'Tiếp tục với Facebook'], apple: ['Continue with Apple', 'Tiếp tục với Apple'],
  socialUnavailable: ['Social login isn’t connected yet. Please use email to continue.', 'Đăng nhập mạng xã hội chưa được kết nối. Vui lòng tiếp tục bằng email.'],
  or: ['OR', 'HOẶC'], termsIntro: ['By signing up, you agree to our', 'Khi đăng ký, bạn đồng ý với'], terms: ['Terms of Service', 'Điều khoản dịch vụ'], privacy: ['Privacy Policy', 'Chính sách bảo mật'], and: ['and', 'và'],
  moreOptions: ['More options to log in', 'Thêm lựa chọn đăng nhập'], demo: ['Demo shortcuts are unavailable once backend auth is connected.', 'Tài khoản demo không khả dụng khi đã kết nối đăng nhập backend.'],
  demoBuyer: ['🛍️ Log in as Buyer', '🛍️ Đăng nhập Buyer'], demoSeller: ['🏪 Log in as Seller', '🏪 Đăng nhập Seller'], demoAdmin: ['⚙️ Log in as Admin', '⚙️ Đăng nhập Admin'],
  noAccount: ['New to Sifit?', 'Bạn mới đến Sifit?'], hasAccount: ['Already a member?', 'Đã có tài khoản?'], backHome: ['Back to home', 'Về trang chủ'],
  showPassword: ['Show password', 'Hiện mật khẩu'], hidePassword: ['Hide password', 'Ẩn mật khẩu'], passwordHint: ['At least 6 characters', 'Ít nhất 6 ký tự'],
  authError: ['Email or password is incorrect, or the account is unavailable.', 'Email hoặc mật khẩu không đúng, hoặc tài khoản không khả dụng.'],
  registerError: ['This email is already registered.', 'Email này đã được đăng ký.'],
  demoUnavailable: ['Demo credentials are not connected to this backend. Please use email login.', 'Tài khoản demo chưa được kết nối với backend này. Vui lòng đăng nhập bằng email.'],
  loading: ['Please wait...', 'Vui lòng chờ...'],
  catalogTitle: ['a wardrobe worth rediscovering.', 'tủ đồ đáng để khám phá lại.'], results: ['pieces found', 'sản phẩm phù hợp'],
  categories: ['Categories', 'Danh mục'], sizes: ['Sizes', 'Kích thước'], condition: ['Condition', 'Độ mới'], price: ['Maximum price', 'Giá tối đa'],
  clear: ['Clear filters', 'Xóa bộ lọc'], newest: ['Newest first', 'Mới nhất'], priceLow: ['Price: low to high', 'Giá: thấp đến cao'], priceHigh: ['Price: high to low', 'Giá: cao đến thấp'],
  noResults: ['No pieces found. Try a different search or clear your filters.', 'Chưa có sản phẩm phù hợp. Thử từ khóa khác hoặc xóa bộ lọc.'],
  addToCart: ['Add to bag', 'Thêm vào giỏ'], details: ['View piece', 'Xem sản phẩm'],
  serviceText: ['Discover pre-loved fashion, list your wardrobe, and connect directly with sellers.', 'Khám phá đồ second-hand, đăng bán tủ đồ và trò chuyện trực tiếp với người bán.'],
  strongPasswordHint: ['8+ characters, uppercase, lowercase, number and symbol', '8+ ký tự, chữ hoa/thường, số và ký tự đặc biệt'],
  legalText: ['Sifit is currently an academic demonstration. Use test information and do not upload identity documents or sensitive personal data. Accounts, listings, messages and orders are stored on the server; images use Cloudinary. The demonstration is not an invitation to transfer money. Contact the project team about stored test data.', 'Sifit hiện là bản giới thiệu phục vụ học tập. Vui lòng dùng thông tin thử nghiệm, không tải giấy tờ tùy thân hoặc dữ liệu cá nhân nhạy cảm. Tài khoản, sản phẩm, tin nhắn và đơn hàng được lưu trên máy chủ; ảnh sử dụng Cloudinary. Bản giới thiệu không yêu cầu chuyển tiền. Liên hệ nhóm dự án khi cần xử lý dữ liệu thử nghiệm đã lưu.'],
  demoReturnPolicy: ['Orders in this academic demonstration are for testing. Do not ship goods or transfer money. The dispute and return screens demonstrate a workflow; contact the project team if a real transaction was made by mistake.', 'Đơn hàng trong bản giới thiệu học tập dùng để thử nghiệm. Không gửi hàng hoặc chuyển tiền. Các màn hình khiếu nại và trả hàng minh họa quy trình; hãy liên hệ nhóm dự án nếu có giao dịch thật phát sinh ngoài ý muốn.'],
};

const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    try { return localStorage.getItem('sifit-language') === 'en' ? 'en' : 'vi'; } catch { return 'vi'; }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'en' ? 'Sifit — Give good clothes another life' : 'Sifit — Trao đồ đẹp một cuộc đời mới';
    try { localStorage.setItem('sifit-language', locale); } catch { /* Storage can be disabled. */ }
  }, [locale]);
  const t = key => (sellingCopy[key] || copy[key])?.[locale === 'en' ? 0 : 1] ?? key;
  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
