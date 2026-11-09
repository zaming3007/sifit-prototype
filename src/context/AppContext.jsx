import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import * as authService from '../services/authService';
import * as productService from '../services/productService';
import * as categoryService from '../services/categoryService';
import * as cartService from '../services/cartService';
import * as orderService from '../services/orderService';
import * as chatService from '../services/chatService';
import * as reviewService from '../services/reviewService';
import * as wishlistService from '../services/wishlistService';
import { collectPages } from '../services/pagination';
import { getApiErrorMessage } from '../utils/errorHandler';
import { normalizeMessage } from '../utils/normalizers';
import { connectRealtime } from '../services/realtimeService';

const AppContext = createContext();
export const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const currentUserId = user?._id;
  const currentUserRole = user?.role;
  const syncUserProfile = useCallback(profile => {
    setUser(previous => previous && previous._id === profile._id ? { ...previous, ...profile } : previous);
  }, []);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const initialView = useRef(new URLSearchParams(window.location.search).get('view') || 'homepage').current;
  const [currentView, setCurrentViewRaw] = useState(initialView);
  const readResource = () => { const query = new URLSearchParams(window.location.search); return { type: query.get('type') || '', id: query.get('id') || '' }; };
  const [resourceTarget, setResourceTarget] = useState(readResource);
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('buyer');
  const [infoPage, setInfoPage] = useState('about');
  const [guideSection, setGuideSection] = useState(window.location.hash.slice(1));
  const [products, setProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const readProductId = () => {
    const query = new URLSearchParams(window.location.search);
    return query.get('view') === 'detail' ? query.get('id') || '' : '';
  };
  const [selectedProductId, setSelectedProductId] = useState(readProductId);
  const [productLoad, setProductLoad] = useState({ id: '', busy: true, error: '' });
  const [productRevision, setProductRevision] = useState(0);
  const [activeChatId, setActiveChatId] = useState(null);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [currentSellerId, setCurrentSellerId] = useState(() => new URLSearchParams(window.location.search).get('sellerId'));
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ categories: [], brands: [], sizes: [], condition: 0, priceMax: 10000000 });
  const [sortOption, setSortOption] = useState('Hàng Mới Về');
  const [chatCursors, setChatCursors] = useState({});
  const [chatRefresh, setChatRefresh] = useState(0);
  const sessionRef = useRef(0);

  const setCurrentView = view => {
    if (view === currentView) return;
    setCurrentViewRaw(view);
    window.history.pushState({ view }, '', `?view=${view}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openAuth = (mode = 'login', role = 'buyer') => {
    setAuthMode(mode); setAuthRole(role); setCurrentView('auth');
  };
  const openResource = (type, id) => {
    setResourceTarget({ type, id }); setCurrentViewRaw('resource');
    window.history.pushState({ view: 'resource' }, '', `?view=resource&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openProduct = product => {
    const id = product?._id;
    if (!id) return;
    setSelectedProductId(id);
    setCurrentViewRaw('detail');
    window.history.pushState({ view: 'detail' }, '', `?view=detail&id=${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openSellGuide = (section = '') => { setGuideSection(section); setCurrentView('sell-guide'); };
  const browse = (options = {}) => {
    setSearchQuery(options.query || '');
    setFilters({ categories: options.category ? [options.category] : [], brands: options.brand ? [options.brand] : [], sizes: [],
      condition: options.premium ? 90 : 0, priceMax: options.lastChance ? 500000 : 10000000,
      material: options.material || '' });
    setSortOption(options.lastChance ? 'Giá: Thấp → Cao' : 'Hàng Mới Về'); setCurrentView('catalog');
  };
  const goBack = () => window.history.length > 1 ? window.history.back() : setCurrentView('homepage');
  useEffect(() => {
    const pop = event => { setResourceTarget(readResource()); setSelectedProductId(readProductId()); setCurrentSellerId(new URLSearchParams(window.location.search).get('sellerId')); setCurrentViewRaw(event.state?.view || new URLSearchParams(window.location.search).get('view') || 'homepage'); };
    window.history.replaceState({ view: initialView }, '', window.location.href);
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [initialView]);

  const fetchListings = useCallback(async (params = {}) => {
    const result = await productService.listProducts({ sort: 'newest', page: 1, limit: 20, ...params });
    setProducts(result.items); return result;
  }, []);
  const reloadPublicData = useCallback(async () => {
    setPublicLoading(true); setDataError('');
    try {
      const [categories] = await Promise.all([categoryService.listCategories(), fetchListings()]);
      setApiCategories(categories);
    } catch (error) { setDataError(getApiErrorMessage(error)); }
    finally { setPublicLoading(false); }
  }, [fetchListings]);
  useEffect(() => { reloadPublicData(); }, [reloadPublicData]);
  useEffect(() => {
    let cancelled = false;
    authService.refreshSession().then(result => { if (!cancelled) setUser(result.user); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const expired = () => { sessionRef.current += 1; setUser(null); };
    window.addEventListener('sifit:session-expired', expired);
    return () => window.removeEventListener('sifit:session-expired', expired);
  }, []);
  const loginUser = async (email, password) => {
    setAuthLoading(true); setAuthError('');
    try {
      const result = await authService.login({ email, password });
      sessionRef.current += 1; setUser(result.user);
      setCurrentView(result.user.role === 'admin' ? 'admin' : result.user.role === 'seller' ? 'seller' : 'homepage');
      return { success: true, data: result.user };
    } catch (error) {
      const message = error.response?.status === 401 ? 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.' : getApiErrorMessage(error);
      setAuthError(message); return { success: false, message };
    } finally { setAuthLoading(false); }
  };
  const loginGoogleUser = async options => {
    setAuthLoading(true); setAuthError('');
    try {
      const result = await authService.googleLogin(options);
      sessionRef.current += 1; setUser(result.user);
      setCurrentView(result.user.role === 'admin' ? 'admin' : result.user.role === 'seller' ? 'seller' : 'homepage');
      return { success: true, data: result.user };
    } catch (error) {
      const linkRequired = error.response?.data?.errors?.some(item => item.code === 'GOOGLE_LINK_REQUIRED');
      return { success: false, message: getApiErrorMessage(error), linkRequired, status: error.response?.status };
    } finally { setAuthLoading(false); }
  };
  const registerUser = async (name, email, password, role) => {
    try {
      await authService.register({ name, email, password, role });
      const result = await loginUser(email, password);
      return result;
    } catch (error) { return { success: false, message: getApiErrorMessage(error) }; }
  };
  const logoutUser = async () => {
    try { await authService.logout(); } catch (error) { setDataError(getApiErrorMessage(error)); }
    finally { sessionRef.current += 1; setUser(null); setActiveChatId(null); setCheckoutProduct(null); setCurrentView('homepage'); }
  };
  const syncCart = data => {
    const items = (data?.items || []).filter(item => item.product).map(item => ({ ...item.product, available: item.available }));
    setCart(items); return items;
  };
  const fetchOrders = useCallback(async () => {
    const generation = sessionRef.current;
    const result = await collectPages(orderService.listMyOrders);
    if (generation === sessionRef.current) setOrders(result.items);
    return result;
  }, []);
  const fetchChats = useCallback(async () => {
    const generation = sessionRef.current;
    const result = await collectPages(chatService.listConversations);
    if (generation === sessionRef.current) setChats(result.items);
    return result;
  }, []);
  useEffect(() => {
    setCart([]); setOrders([]); setChats([]); setMessages({}); setWishlist([]); setChatCursors({});
    if (!currentUserId) return;
    let cancelled = false;
    const jobs = currentUserRole === 'buyer' ? [
      cartService.getCart().then(data => { if (!cancelled) syncCart(data); }),
      collectPages(orderService.listMyOrders).then(data => { if (!cancelled) setOrders(data.items); }),
      collectPages(chatService.listConversations).then(data => { if (!cancelled) setChats(data.items); }),
      wishlistService.getWishlist().then(data => { if (!cancelled) setWishlist(data.items); }),
    ] : [
      collectPages(chatService.listConversations).then(data => { if (!cancelled) setChats(data.items); }),
      collectPages(orderService.listMyOrders).then(data => { if (!cancelled) setOrders(data.items); }),
    ];
    Promise.allSettled(jobs).then(results => {
      const failed = results.find(result => result.status === 'rejected');
      if (failed && !cancelled) setDataError(getApiErrorMessage(failed.reason));
    });
    return () => { cancelled = true; };
  }, [currentUserId, currentUserRole]);

  const mergeMessage = useCallback(raw => {
    const message = normalizeMessage(raw);
    setMessages(prev => {
      const existing = prev[message.conversation] || [];
      return { ...prev, [message.conversation]: [...existing.filter(item => item._id !== message._id), message]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) };
    });
    setChats(prev => prev.map(chat => chat._id === message.conversation ? { ...chat, lastMessage: message } : chat));
  }, []);
  useEffect(() => {
    if (!currentUserId) return;
    return connectRealtime({ onMessage: mergeMessage, onReconnect: () => {
      fetchChats().catch(error => setDataError(getApiErrorMessage(error)));
      setChatRefresh(value => value + 1);
    } });
  }, [currentUserId, mergeMessage, fetchChats]);
  useEffect(() => {
    if (!currentUserId || !activeChatId) return;
    let cancelled = false;
    chatService.listMessages(activeChatId, { limit: 50 }).then(async result => {
      if (cancelled) return;
      // Preserve realtime messages received while history was loading.
      setMessages(prev => ({ ...prev, [activeChatId]: [...new Map([...result.items, ...(prev[activeChatId] || [])].map(item => [item._id, item])).values()]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }));
      setChatCursors(prev => ({ ...prev, [activeChatId]: result.hasMore ? result.nextCursor : null }));
      if (result.items.length) await chatService.markRead(activeChatId, result.items.at(-1)._id);
    }).catch(error => { if (!cancelled) setDataError(getApiErrorMessage(error)); });
    return () => { cancelled = true; };
  }, [currentUserId, activeChatId, chatRefresh]);
  const loadOlderMessages = async () => {
    const cursor = chatCursors[activeChatId];
    if (!cursor) return;
    try {
      const result = await chatService.listMessages(activeChatId, { limit: 50, before: cursor });
      setMessages(prev => ({ ...prev, [activeChatId]: [...new Map([...result.items, ...(prev[activeChatId] || [])].map(item => [item._id, item])).values()] }));
      setChatCursors(prev => ({ ...prev, [activeChatId]: result.hasMore ? result.nextCursor : null }));
    } catch (error) { setDataError(getApiErrorMessage(error)); }
  };
  const addToCart = async product => {
    if (!user) { openAuth(); return; }
    if (user.role !== 'buyer') return { success: false };
    try { syncCart(await cartService.addItem(product._id)); return { success: true }; }
    catch (error) { alert(getApiErrorMessage(error)); return { success: false }; }
  };
  const removeFromCart = async id => {
    try { syncCart(await cartService.removeItem(id)); return { success: true }; }
    catch (error) { alert(getApiErrorMessage(error)); return { success: false }; }
  };
  const handleInstantBuy = async product => {
    if (!user) { openAuth(); return; }
    if (user.role !== 'buyer') return;
    if (!cart.some(item => item._id === product._id) && !(await addToCart(product))?.success) return;
    setCheckoutProduct(product); setCurrentView('checkout');
  };
  const createOrder = async data => {
    try {
      const checkout = await orderService.createOrder(data);
      // A successful checkout must remain successful even if a subsequent read fails.
      const results = await Promise.allSettled([fetchOrders(), cartService.getCart().then(syncCart), fetchListings()]);
      const failed = results.find(result => result.status === 'rejected');
      if (failed) setDataError(getApiErrorMessage(failed.reason));
      return { success: true, data: checkout };
    } catch (error) { return { success: false, message: getApiErrorMessage(error) }; }
  };
  const startChat = async product => {
    if (!user) { openAuth(); return; }
    if (user.role !== 'buyer') return;
    try {
      const chat = await chatService.createConversation(product._id);
      setChats(prev => [chat, ...prev.filter(item => item._id !== chat._id)]);
      window.dispatchEvent(new Event('sifit:conversations'));
      setActiveChatId(chat._id); setCurrentView('chat');
    } catch (error) { alert(getApiErrorMessage(error)); }
  };
  const sendMessage = async (id, content, clientMessageId) => {
    try {
      mergeMessage(await chatService.sendMessage(id, content, clientMessageId));
      return { success: true };
    } catch (error) { alert(getApiErrorMessage(error)); return { success: false }; }
  };
  const toggleWishlist = async product => {
    if (!user) { openAuth(); return; }
    if (user.role !== 'buyer') return;
    try {
      const exists = wishlist.some(item => item.productId === product._id);
      const result = await (exists ? wishlistService.removeItem(product._id) : wishlistService.addItem(product._id));
      setWishlist(result.items);
    } catch (error) { alert(getApiErrorMessage(error)); }
  };
  const viewShopProfile = sellerId => { setCurrentSellerId(sellerId); setCurrentViewRaw('shop'); window.history.pushState({ view: 'shop' }, '', '?view=shop&sellerId=' + encodeURIComponent(sellerId)); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const [productReviews, setProductReviews] = useState({});
  useEffect(() => {
    if (currentView !== 'detail') return;
    let cancelled = false;
    const id = selectedProductId;
    setSelectedProduct(null);
    if (!/^[a-f\d]{24}$/i.test(id)) {
      setProductLoad({ id, busy: false, error: 'Liên kết sản phẩm không hợp lệ hoặc thiếu mã sản phẩm.' });
      return;
    }
    setProductLoad({ id, busy: true, error: '' });
    productService.getProduct(id).then(product => {
      if (cancelled) return;
      setSelectedProduct(product);
      setProductLoad({ id, busy: false, error: '' });
      // Reviews can fail independently without hiding a valid product.
      Promise.allSettled([collectPages(params => reviewService.listProductReviews(id, params)), reviewService.productSummary(id)])
        .then(([reviews, summary]) => {
          if (cancelled) return;
          if (reviews.status === 'fulfilled') setProductReviews(prev => ({ ...prev, [id]: reviews.value.items }));
          if (summary.status === 'fulfilled') setSelectedProduct(previous => previous?._id === id ? { ...previous,
            averageRating: summary.value.summary?.averageRating ?? 0, reviewCount: summary.value.summary?.totalReviews ?? 0 } : previous);
        });
    }).catch(error => { if (!cancelled) setProductLoad({ id, busy: false, error: error.response?.status === 404
      ? 'Sản phẩm không còn khả dụng hoặc đã được ẩn.' : 'Không tải được sản phẩm. Vui lòng thử lại.' }); });
    return () => { cancelled = true; };
  }, [selectedProductId, currentView, productRevision]);
  const selectedCategory = apiCategories.find(item => (item._id || item.id) === selectedProduct?.categoryId);
  const productWithCategory = selectedProduct && { ...selectedProduct,
    category: selectedCategory?.name || selectedProduct.category,
    categorySlug: selectedCategory?.slug || selectedProduct.categorySlug };
  return <AppContext.Provider value={{
    user, syncUserProfile, authLoading, authError, loginUser, loginGoogleUser, registerUser, logoutUser,
    currentView, setCurrentView, resourceTarget, openResource, goBack, authMode, authRole, openAuth, browse, infoPage, setInfoPage,
    guideSection, setGuideSection, openSellGuide, products, setProducts, apiCategories, fetchListings,
    publicLoading, dataError, setDataError, reloadPublicData, selectedProduct: productWithCategory, openProduct, selectedProductId,
    productLoading: productLoad.id !== selectedProductId || productLoad.busy, productError: productLoad.error,
    retryProduct: () => setProductRevision(value => value + 1),
    cart, addToCart, removeFromCart, handleInstantBuy, checkoutProduct, setCheckoutProduct,
    orders, fetchOrders, createOrder, chats, activeChatId, setActiveChatId, messages, sendMessage,
    fetchChats, startChat, loadOlderMessages, hasOlderMessages: !!chatCursors[activeChatId],
    wishlist, toggleWishlist, searchQuery, setSearchQuery, filters, setFilters, sortOption, setSortOption,
    currentSellerId, viewShopProfile, getProductReviews: id => productReviews[id] || [],
  }}>{children}</AppContext.Provider>;
};
export const useApp = () => useContext(AppContext);
