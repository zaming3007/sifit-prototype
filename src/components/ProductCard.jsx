import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import Icon from './Icon';
import { useState } from 'react';

export default function ProductCard({ product }) {
  const { openProduct, addToCart, user, openAuth, wishlist, toggleWishlist } = useApp();
  const { t, locale } = useLanguage();
  const canBuy = !user || user.role === 'buyer';
  const [failedImage, setFailedImage] = useState(null);
  const image = product.images?.[0];
  const open = () => openProduct(product);
  return <article className="product-card">
    <div className="product-image-wrap"><button className="product-image-button" onClick={open} aria-label={`${t('details')}: ${product.title}`}>{image && failedImage !== image ? <img src={image} alt={product.title} loading="lazy" onError={() => setFailedImage(image)} /> : <span className="product-image-placeholder"><Icon name="image" /><span>{locale === 'vi' ? 'Ảnh chưa khả dụng' : 'Image unavailable'}</span></span>}</button>
      <span className="product-condition">{t('condition')} {product.condition}%</span>
      {canBuy && user?._id !== product.seller?._id && product.status === 'active' && <button className="product-quick-add" aria-label={`${t('addToCart')}: ${product.title}`} onClick={() => user ? addToCart(product) : openAuth()}><Icon name="add_shopping_cart" /></button>}
    </div>
    {canBuy && user?._id !== product.seller?._id && <button className="product-wishlist-button text-sm mt-2" onClick={() => toggleWishlist(product)}>{wishlist.some(item => item.productId === product._id) ? '♥ Đã yêu thích' : '♡ Yêu thích'}</button>}
    <div className="product-meta"><span>{product.brand}</span><span>{t('sizes')} {product.size}</span></div>
    <button className="product-title" onClick={open}>{product.title}</button><p className="product-price">{new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(product.price)}</p>
  </article>;
}
