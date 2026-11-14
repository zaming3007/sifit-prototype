import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import CategoryIcon, { resolveCategoryKey } from './CategoryIcon';
import Icon from './Icon';

const conditionLabel = (percent, locale) => {
  const num = Number(percent) || 0;
  if (num >= 98) return locale === 'vi' ? 'Mới 100%' : 'New 100%';
  return locale === 'vi' ? `Độ mới ${num}%` : `${num}% condition`;
};

export default function ProductCard({ product }) {
  const { openProduct, addToCart, user, openAuth, wishlist, toggleWishlist } = useApp();
  const { t, locale } = useLanguage();
  const canBuy = !user || user.role === 'buyer';
  const [failedImage, setFailedImage] = useState(null);
  const image = product.images?.[0];
  const isWishlisted = wishlist.some(item => item.productId === product._id);
  const open = () => openProduct(product);
  const categoryKey = resolveCategoryKey(product.category || product.title);
  const formattedPrice = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(product.price || 0);

  return (
    <article className="product-card group relative flex flex-col">
      {/* Rounded Image Frame */}
      <div className="product-image-wrap relative overflow-hidden">
        <button
          type="button"
          className="product-image-button w-full h-full block cursor-pointer"
          onClick={open}
          aria-label={`${t('details')}: ${product.title}`}
        >
          {image && failedImage !== image ? (
            <img
              src={image}
              alt={product.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              onError={() => setFailedImage(image)}
            />
          ) : (
            <span className="product-image-placeholder w-full h-full flex flex-col items-center justify-center p-6 gap-2.5">
              <span className="product-placeholder-icon w-14 h-14 flex items-center justify-center">
                <CategoryIcon category={categoryKey} />
              </span>
              <span className="text-[11px] font-semibold opacity-75">
                {product.category || (locale === 'vi' ? 'Sản phẩm Sifit' : 'Sifit Piece')}
              </span>
            </span>
          )}
        </button>

        {/* Top-Left Condition Pill */}
        <span className="product-condition absolute top-3 left-3 inline-flex items-center gap-1">
          <Icon name="sparkles" className="text-amber-600 text-[11px]" />
          <span>{conditionLabel(product.condition, locale)}</span>
        </span>

        {/* Top-Right Wishlist Button */}
        {canBuy && user?._id !== product.seller?._id && (
          <button
            type="button"
            className={`product-wishlist-float absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isWishlisted ? 'is-wishlisted' : ''
            }`}
            aria-label={isWishlisted ? '♥ Đã yêu thích' : '♡ Yêu thích'}
            title={isWishlisted ? 'Đã yêu thích' : 'Yêu thích'}
            onClick={e => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
          >
            <Icon
              name="favorite"
              className={`text-sm transition-transform ${isWishlisted ? 'fill text-rose-500 scale-110' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Structured Card Content */}
      <div className="product-card-body flex-1 flex flex-col justify-between pt-3 px-1 pb-0.5">
        <div>
          {/* Row 1: Category / Brand + Size Pill */}
          <div className="product-meta flex items-center justify-between gap-2">
            <span className="product-brand-tag inline-flex items-center gap-1 truncate">
              <Icon name={categoryKey} className="text-[11px] shrink-0" />
              <span className="truncate">{product.brand || product.category || 'Sifit Select'}</span>
            </span>
            {product.size && (
              <span className="product-size-pill shrink-0">
                {product.size}
              </span>
            )}
          </div>

          {/* Row 2: Product Title (Consistent 2-line height) */}
          <button
            type="button"
            className="product-title mt-1.5 text-left w-full line-clamp-2 cursor-pointer"
            onClick={open}
          >
            {product.title}
          </button>
        </div>

        {/* Row 3: Price & Quick Action Footer */}
        <div className="product-price-row mt-3 pt-2.5 flex items-center justify-between gap-2">
          <div>
            <p className="product-price font-heading">{formattedPrice}</p>
            {product.seller?.name && (
              <p className="product-seller-caption truncate">
                {product.seller.name}
              </p>
            )}
          </div>

          {canBuy && user?._id !== product.seller?._id && product.status === 'active' ? (
            <button
              type="button"
              className="product-quick-add shrink-0 inline-flex items-center justify-center cursor-pointer"
              aria-label={`${t('addToCart')}: ${product.title}`}
              title={t('addToCart')}
              onClick={e => {
                e.stopPropagation();
                if (user) {
                  addToCart(product);
                } else {
                  openAuth();
                }
              }}
            >
              <Icon name="add_shopping_cart" className="text-base" />
            </button>
          ) : (
            <button
              type="button"
              onClick={open}
              className="product-view-pill shrink-0 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{locale === 'vi' ? 'Chi tiết' : 'Details'}</span>
              <Icon name="arrow_forward" className="text-[11px]" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
