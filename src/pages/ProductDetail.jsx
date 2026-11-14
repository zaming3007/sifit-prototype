import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';
import ReportModal from '../components/ReportModal';
import OfferDialog from '../components/OfferDialog';
import { resolveCategoryKey } from '../components/CategoryIcon';
import Icon from '../components/Icon';

export default function ProductDetail() {
  const {
    selectedProduct,
    selectedProductId,
    productLoading,
    productError,
    retryProduct,
    setCurrentView,
    addToCart,
    handleInstantBuy,
    startChat,
    user,
    viewShopProfile,
    getProductReviews,
    openAuth,
    wishlist,
    toggleWishlist,
  } = useApp();

  const [offerOpen, setOfferOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setActiveImg(0);
    setOfferOpen(false);
    setReportOpen(false);
  }, [selectedProductId]);

  if (productLoading) {
    return (
      <div className="sf-container py-20 flex flex-col items-center justify-center gap-3 text-gray-500" role="status">
        <Icon name="refresh" className="animate-spin text-3xl text-primary" />
        <p className="text-sm font-medium">Đang tải chi tiết món đồ…</p>
      </div>
    );
  }

  if (productError || !selectedProduct) {
    return (
      <section className="sf-container py-20 max-w-xl mx-auto text-center" aria-label="Không tải được sản phẩm">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <Icon name="error" className="text-3xl" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">Không thể hiển thị sản phẩm</h1>
        <p role="alert" className="text-gray-500 text-sm mb-6 leading-relaxed">
          {productError || 'Sản phẩm không còn khả dụng hoặc đã có chủ mới.'}
        </p>
        <div className="flex justify-center gap-3">
          <button className="btn-outline inline-flex items-center gap-2" onClick={retryProduct}>
            <Icon name="refresh" className="text-base" />
            Thử lại
          </button>
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setCurrentView('catalog')}>
            <Icon name="shopping_bag" className="text-base" />
            Tiếp tục mua sắm
          </button>
        </div>
      </section>
    );
  }

  const reviews = getProductReviews(selectedProduct._id);
  const isSold = selectedProduct.status !== 'active';
  const isSeller = user?._id === selectedProduct.seller?._id;
  const isWishlisted = wishlist?.some(item => item.productId === selectedProduct._id);

  return (
    <LocalizedContent>
      <div className="heritage-detail max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 animate-fade-in">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap text-gray-400 text-xs font-semibold uppercase tracking-wider mb-8 items-center gap-2">
          <button
            onClick={() => setCurrentView('homepage')}
            className="hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Icon name="storefront" className="text-xs" />
            Trang chủ
          </button>
          <Icon name="chevron_right" className="text-[11px] text-gray-300" />
          <button
            onClick={() => setCurrentView('catalog')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Shop
          </button>
          <Icon name="chevron_right" className="text-[11px] text-gray-300" />
          <span className="text-gray-500">{selectedProduct.category}</span>
          <Icon name="chevron_right" className="text-[11px] text-gray-300" />
          <span className="text-gray-800 font-bold line-clamp-1">{selectedProduct.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          {/* ── LEFT: Gallery ── */}
          <div className="w-full lg:w-[52%] space-y-4">
            <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-3xl overflow-hidden shadow-sm border border-gray-100 group">
              <img
                src={selectedProduct.images?.[activeImg] || 'https://via.placeholder.com/600x800'}
                alt={selectedProduct.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Wishlist floating button */}
              {user?.role !== 'seller' && (
                <button
                  type="button"
                  className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border ${
                    isWishlisted
                      ? 'bg-rose-50 text-rose-500 border-rose-200'
                      : 'bg-white/90 backdrop-blur-md text-gray-600 hover:text-rose-500 border-white/60 hover:scale-110'
                  }`}
                  onClick={() => toggleWishlist(selectedProduct)}
                  title={isWishlisted ? 'Đã yêu thích' : 'Lưu vào yêu thích'}
                  aria-label="Yêu thích sản phẩm"
                >
                  <Icon name="favorite" className={`text-xl ${isWishlisted ? 'fill text-rose-500 scale-110' : ''}`} />
                </button>
              )}

              {/* Condition tag */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur-md text-gray-900 shadow-sm border border-white/60">
                <Icon name="sparkles" className="text-amber-500 text-sm" />
                <span>Độ mới {selectedProduct.condition}%</span>
              </div>

              {isSold && (
                <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3.5 rounded-2xl shadow-2xl text-center">
                    <span className="text-white font-heading font-black text-2xl uppercase tracking-[0.2em] block">
                      {selectedProduct.status === 'sold' ? 'ĐÃ CÓ CHỦ' : 'KHÔNG KHẢ DỤNG'}
                    </span>
                    <span className="text-xs text-gray-300 mt-1 block">Món đồ 2hand duy nhất này đã được bán</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail carousel */}
            {selectedProduct.images?.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {selectedProduct.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-[3/4] w-20 overflow-hidden rounded-2xl border-2 cursor-pointer transition-all flex-shrink-0 ${
                      activeImg === i ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Info & Actions ── */}
          <div className="w-full lg:w-[48%] lg:sticky lg:top-[120px] flex flex-col">
            {/* Brand & Title */}
            <div className="border-b border-gray-100 pb-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase text-gray-500 tracking-[0.2em] font-bold bg-gray-100 px-2.5 py-1 rounded-md">
                  <Icon name="sell" className="text-[10px]" />
                  {selectedProduct.brand || 'Vintage Brand'}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500 font-medium">Hàng 2hand chính hãng</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-3 leading-snug">
                {selectedProduct.title}
              </h1>

              {/* Rating stars & reviews */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Icon
                      key={s}
                      name="star"
                      className={`text-sm ${s <= Math.round(selectedProduct.averageRating || 0) ? 'fill text-amber-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-700">{selectedProduct.averageRating || 0}/5</span>
                <span className="text-xs text-gray-400 border-l border-gray-200 pl-2.5 inline-flex items-center gap-1">
                  <Icon name="forum" className="text-[11px]" />
                  {selectedProduct.reviewCount || 0} đánh giá
                </span>
              </div>

              {/* Price display */}
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-heading font-black text-primary tracking-tight">
                  {selectedProduct.price?.toLocaleString('vi-VN')} ₫
                </p>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Giá đã bao gồm bảo vệ người mua
                </span>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-xs">
                  <Icon name={resolveCategoryKey(selectedProduct.category || selectedProduct.title)} className="text-xl" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider font-bold block">Kích cỡ</span>
                  <span className="text-base font-extrabold text-gray-900">{selectedProduct.size || 'Freesize'}</span>
                </div>
              </div>

              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-xs">
                  <Icon name="sparkles" className="text-xl text-indigo-500" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider font-bold block">Màu sắc</span>
                  <span className="text-base font-bold text-gray-900">{selectedProduct.color || 'Đa sắc'}</span>
                </div>
              </div>

              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 col-span-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-xs">
                  <Icon name="eco" className="text-xl" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider font-bold block">Chất liệu</span>
                  <span className="text-sm font-semibold text-gray-900">{selectedProduct.material || 'Cotton / Blend'}</span>
                </div>
              </div>
            </div>

            {/* Condition & Flaws Box */}
            <div className="bg-amber-50/80 border border-amber-200/60 p-4 rounded-2xl mb-6 flex gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <Icon name="info" className="text-lg" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Icon name="verified" className="text-xs" />
                  Tình Trạng & Chi Tiết Lỗi
                </h4>
                <p className="text-gray-800 font-semibold mb-1">
                  Độ mới thực tế: <span className="text-primary font-bold">{selectedProduct.condition}%</span>
                </p>
                <p className="text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-700">Mô tả vết lỗi:</span> {selectedProduct.defects || 'Không có lỗi đáng kể, đã được giặt là sạch sẽ.'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 mb-6">
              {isSold ? (
                <div className="bg-gray-100 border border-gray-200 p-5 rounded-2xl text-center">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-wider">Sản phẩm hiện không khả dụng</p>
                  <p className="text-xs text-gray-500 mt-1.5">Hàng 2hand — chỉ có 1 chiếc duy nhất. Hãy dạo shop để tìm món đồ tương tự nhé!</p>
                </div>
              ) : isSeller || (user && user.role !== 'buyer') ? (
                <div className="bg-gray-100 p-4 rounded-2xl text-center border border-gray-200">
                  <p className="text-sm font-bold text-gray-900">Không thể thực hiện mua hàng</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isSeller ? 'Bạn không thể mua sản phẩm do chính shop mình đăng bán.' : 'Mua sắm dành riêng cho tài khoản người mua.'}
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleInstantBuy(selectedProduct)}
                    className="btn-primary w-full py-4 text-center font-bold text-sm tracking-wider uppercase rounded-full flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  >
                    <Icon name="shopping_bag" className="text-lg" />
                    Mua Ngay Với Giá {selectedProduct.price?.toLocaleString('vi-VN')} ₫
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => addToCart(selectedProduct)}
                      className="btn-outline text-center py-3.5 text-xs font-bold rounded-full flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Icon name="add_shopping_cart" className="text-base" />
                      Thêm Giỏ Hàng
                    </button>
                    <button
                      disabled={selectedProduct.price <= 1}
                      onClick={() => (user ? setOfferOpen(true) : openAuth())}
                      className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs uppercase tracking-wider py-3.5 rounded-full transition-colors cursor-pointer border border-gray-200"
                    >
                      <Icon name="payments" className="text-base text-gray-600" />
                      Mặc Cả / Đề Nghị Giá
                    </button>
                  </div>

                  <button
                    onClick={() => startChat(selectedProduct)}
                    className="w-full py-3 text-xs font-bold text-primary bg-white hover:bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Icon name="forum" className="text-sm" />
                    Nhắn tin cho shop
                  </button>
                </>
              )}

              <div className="text-center pt-3 border-t border-gray-100">
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-[11px] text-gray-400 hover:text-red-500 font-semibold uppercase tracking-wider hover:underline bg-transparent border-none cursor-pointer transition-colors inline-flex items-center gap-1"
                >
                  <Icon name="flag" className="text-xs" />
                  Báo cáo sản phẩm vi phạm
                </button>
              </div>
            </div>

            {/* Seller Card */}
            <div className="flex items-center justify-between p-4 bg-gray-50/90 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-heading font-black text-xl overflow-hidden shadow-xs">
                  {selectedProduct.seller?.avatar ? (
                    <img src={selectedProduct.seller.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (selectedProduct.seller?.name || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    {selectedProduct.seller?.name || 'Seller'}
                    <Icon name="verified_user" className="text-primary text-xs" />
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon name="star" className="text-amber-400 text-xs fill" />
                    <span className="text-xs font-semibold text-gray-600">
                      {selectedProduct.seller?.averageRating || 0} ({selectedProduct.seller?.reviewCount || 0} đánh giá)
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => viewShopProfile(selectedProduct.seller?._id)}
                className="text-xs font-semibold bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Icon name="storefront" className="text-xs" />
                Xem Shop
              </button>
            </div>

            {/* Customer Reviews */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="font-heading font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
                <Icon name="star" className="text-amber-400 fill text-lg" />
                Đánh Giá Của Khách Hàng ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 text-xs">
                  Chưa có đánh giá nào cho sản phẩm này.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review._id} className="flex gap-3 border-b border-gray-100 pb-4 last:border-0">
                      <img
                        src={review.reviewer?.avatar || 'https://i.pravatar.cc/150'}
                        alt=""
                        className="w-9 h-9 rounded-full border border-gray-100 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-gray-900">{review.reviewer?.name}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Icon name="schedule" className="text-[10px]" />
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="flex text-amber-400 my-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Icon
                              key={s}
                              name="star"
                              className={`text-xs ${s <= review.rating ? 'fill text-amber-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{review.comment}</p>
                        {review.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {review.images.map(asset => (
                              <a key={asset.publicId} href={asset.url} target="_blank" rel="noreferrer">
                                <img src={asset.url} alt="Ảnh đánh giá" className="w-16 h-16 object-cover rounded-xl border border-gray-100 shadow-xs" />
                              </a>
                            ))}
                          </div>
                        )}
                        {review.sellerReply?.text && (
                          <div className="mt-2.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-600">
                            <strong className="text-gray-800 block text-[11px] mb-0.5">Phản hồi của người bán:</strong>
                            {review.sellerReply.text}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ReportModal isOpen={reportOpen} product={selectedProduct} onClose={() => setReportOpen(false)} />
        {offerOpen && <OfferDialog product={selectedProduct} onClose={() => setOfferOpen(false)} />}
      </div>
    </LocalizedContent>
  );
}
