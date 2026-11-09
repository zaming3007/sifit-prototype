import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';
import ReportModal from '../components/ReportModal';
import OfferDialog from '../components/OfferDialog';

export default function ProductDetail() {
  const { selectedProduct, selectedProductId, productLoading, productError, retryProduct, setCurrentView, addToCart, handleInstantBuy, startChat, user, viewShopProfile, getProductReviews, openAuth } = useApp();
  const [offerOpen, setOfferOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => { setActiveImg(0); setOfferOpen(false); setReportOpen(false); }, [selectedProductId]);

  if (productLoading) return <div className="sf-container py-16" role="status">Đang tải sản phẩm…</div>;
  if (productError || !selectedProduct) return <section className="sf-container py-16" aria-label="Không tải được sản phẩm">
    <h1 className="text-2xl font-bold mb-4">Không thể hiển thị sản phẩm</h1>
    <p role="alert" className="mb-6">{productError || 'Sản phẩm không còn khả dụng.'}</p>
    <div className="flex gap-4"><button className="btn-outline" onClick={retryProduct}>Thử lại</button>
      <button className="btn-primary" onClick={() => setCurrentView('catalog')}>Tiếp tục mua sắm</button></div>
  </section>;

  const reviews = getProductReviews(selectedProduct._id);
  const isSold = selectedProduct.status !== 'active';
  const isSeller = user?._id === selectedProduct.seller?._id;

  return (
    <LocalizedContent>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex text-gray-400 text-xs font-bold uppercase mb-8 items-center tracking-widest gap-2">
        <button onClick={() => setCurrentView('catalog')} className="hover:text-primary bg-transparent border-none cursor-pointer transition-colors">Shop</button>
        <span className="material-symbols-outlined text-[11px]">arrow_forward_ios</span>
        <span className="text-gray-500">{selectedProduct.category}</span>
        <span className="material-symbols-outlined text-[11px]">arrow_forward_ios</span>
        <span className="text-gray-800 line-clamp-1">{selectedProduct.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
        {/* ── LEFT: Gallery ── */}
        <div className="w-full lg:w-[55%] space-y-4">
          <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-3xl overflow-hidden shadow-sm border border-gray-100 group">
            <img
              src={selectedProduct.images?.[activeImg] || 'https://via.placeholder.com/600x800'}
              alt={selectedProduct.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            {isSold && (
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-10 py-4 rounded-2xl shadow-2xl">
                  <span className="text-red-400 font-heading font-black text-3xl uppercase tracking-[0.2em]">{selectedProduct.status === 'sold' ? 'ĐÃ BÁN' : 'KHÔNG KHẢ DỤNG'}</span>
                </div>
              </div>
            )}
          </div>
          {selectedProduct.images?.length > 1 && (
            <div className="flex gap-3">
              {selectedProduct.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-[3/4] w-16 overflow-hidden rounded-xl border-2 cursor-pointer transition-all ${activeImg === i ? 'border-primary shadow-emerald-sm' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="w-full lg:w-[45%] lg:sticky lg:top-[130px] flex flex-col">
          {/* Brand & Title */}
          <div className="border-b border-gray-100 pb-7 mb-7">
            <p className="text-[11px] uppercase text-gray-400 tracking-[0.25em] font-bold mb-3">{selectedProduct.brand}</p>
            <h1 className="text-3xl font-heading font-black text-gray-900 mb-5 leading-tight">{selectedProduct.title}</h1>

            {/* Stars */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`material-symbols-outlined text-base ${s <= Math.round(selectedProduct.averageRating || 0) ? 'text-amber-400 fill' : 'text-gray-300'}`}>star</span>
                ))}
              </div>
              <span className="text-sm font-bold text-amber-500">{selectedProduct.averageRating || 0}/5</span>
              <span className="text-sm text-gray-400 border-l border-gray-200 pl-3">{selectedProduct.reviewCount || 0} đánh giá</span>
            </div>

            <p className="text-3xl font-heading font-black text-primary">{selectedProduct.price.toLocaleString('vi-VN')} ₫</p>
          </div>

          {/* Attributes grid */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-[10px] uppercase text-gray-400 tracking-widest font-bold block mb-1.5">Kích cỡ</span>
              <span className="text-xl font-black text-gray-900">{selectedProduct.size}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-[10px] uppercase text-gray-400 tracking-widest font-bold block mb-1.5">Màu sắc</span>
              <span className="text-base font-bold text-gray-900">{selectedProduct.color}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 col-span-2">
              <span className="text-[10px] uppercase text-gray-400 tracking-widest font-bold block mb-1.5">Chất liệu</span>
              <span className="text-base font-bold text-gray-900">{selectedProduct.material}</span>
            </div>
          </div>

          {/* Condition box */}
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl mb-8 flex gap-4">
            <span className="material-symbols-outlined text-amber-500 mt-0.5 fill text-xl">info</span>
            <div>
              <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-2">Tình Trạng & Lỗi</h4>
              <p className="text-sm font-bold text-gray-900 mb-1.5">Độ mới thực tế: <span className="text-primary">{selectedProduct.condition}%</span></p>
              <p className="text-sm text-gray-600"><span className="font-bold">Vết lỗi:</span> {selectedProduct.defects}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mb-7">
            {isSold ? (
              <div className="bg-gray-100 border border-gray-200 p-5 rounded-2xl text-center">
                <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Sản phẩm hiện không khả dụng</p>
                <p className="text-xs text-gray-500 mt-2">Hàng 2hand — chỉ có 1 chiếc duy nhất. Tiếc quá!</p>
              </div>
            ) : isSeller || (user && user.role !== 'buyer') ? (
              <div className="bg-gray-100 p-5 rounded-2xl text-center border border-gray-200">
                <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Không thể mua hàng</p>
                <p className="text-xs text-gray-500 mt-2">{isSeller ? 'Bạn không thể mua sản phẩm do chính mình đăng bán.' : 'Mua sắm dành cho tài khoản người mua.'}</p>
              </div>
            ) : (
              <>
                <button onClick={() => handleInstantBuy(selectedProduct)} className="btn-primary w-full text-center">
                  Mua Ngay
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => addToCart(selectedProduct)} className="btn-outline text-center py-3.5 text-xs">
                    Thêm Giỏ Hàng
                  </button>
                  <button disabled={selectedProduct.price <= 1} onClick={() => user ? setOfferOpen(true) : openAuth()} className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs uppercase tracking-widest py-3.5 rounded-full transition-colors cursor-pointer border-none">
                    <span className="material-symbols-outlined text-base">chat</span>
                    Mặc Cả
                  </button>
                </div>
                <button onClick={() => startChat(selectedProduct)} className="text-sm text-primary py-2 w-full">Nhắn tin cho shop</button>
              </>
            )}
            <div className="text-center pt-4 border-t border-gray-100">
              <button onClick={() => setReportOpen(true)} className="text-[11px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest hover:underline bg-transparent border-none cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[13px] align-middle mr-1">flag</span>
                Báo cáo sản phẩm
              </button>
            </div>
          </div>

          {/* Seller card */}
          <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-heading font-black text-xl overflow-hidden">
                {selectedProduct.seller?.avatar
                  ? <img src={selectedProduct.seller.avatar} alt="" className="w-full h-full object-cover" />
                  : (selectedProduct.seller?.name || 'S').charAt(0).toUpperCase()
                }
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedProduct.seller?.name || 'Seller'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-amber-400 text-xs fill">star</span>
                  <span className="text-xs font-bold text-gray-600">{selectedProduct.seller?.averageRating || 0} ({selectedProduct.seller?.reviewCount || 0} đánh giá)</span>
                </div>
              </div>
            </div>
            <button onClick={() => viewShopProfile(selectedProduct.seller?._id)} className="text-xs font-bold bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-full hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
              Xem Shop
            </button>
          </div>

          {/* Reviews */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-6">Đánh Giá ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 text-sm">Chưa có đánh giá nào.</div>
            ) : (
              <div className="space-y-5">
                {reviews.map(review => (
                  <div key={review._id} className="flex gap-4 border-b border-gray-100 pb-5 last:border-0">
                    <img src={review.reviewer?.avatar || 'https://i.pravatar.cc/150'} alt="" className="w-10 h-10 rounded-full border object-cover flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-gray-900">{review.reviewer?.name}</p>
                      <div className="flex text-amber-400 my-1.5">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={`material-symbols-outlined text-xs ${s <= review.rating ? 'fill' : 'text-gray-200'}`}>star</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</p>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                      {review.images?.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{review.images.map(asset => <a key={asset.publicId} href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt="Ảnh đánh giá" className="w-20 h-20 object-cover rounded-xl" /></a>)}</div>}
                      {review.sellerReply?.text && <p className="text-sm mt-3">Phản hồi của người bán: {review.sellerReply.text}</p>}
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
