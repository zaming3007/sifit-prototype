import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
export default function InfoPage() {
  const { infoPage, browse, setCurrentView, openSellGuide } = useApp();
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState('');
  const privacyPage = ['privacyChoices', 'doNotSell'].includes(infoPage);
  const known = ['about', 'services', 'resaleService', 'legal', 'termsUse', 'privacy', 'contact', 'ourImpact', 'accessibility', 'privacyChoices', 'doNotSell', 'sizeGuide', 'sitemap'];
  const removeEmail = () => {
    try { localStorage.removeItem('sifit-newsletter-email'); setFeedback('emailRemoved'); }
    catch { setFeedback('newsletterStorageError'); }
  };
  return <section className="info-page wide-container"><p className="eyebrow green">SIFIT / WEAR YOUR STYLE</p><h1>{t(infoPage)}</h1>
    {infoPage === 'about' && <><p>{t('aboutText')}</p><p>{t('mission')}</p></>}
    {['services', 'resaleService'].includes(infoPage) && <><p>{t('serviceText')}</p><button className="editorial-button" onClick={() => setCurrentView('sell')}>{t('waysToSell')}</button></>}
    {['legal', 'termsUse', 'privacy'].includes(infoPage) && <p>{t('legalText')}</p>}
    {infoPage === 'contact' && <><p>{t('connect')}</p><a href="mailto:cdr.jsc@gmail.com">cdr.jsc@gmail.com</a><a href="tel:+84364478680">(+84)36-4478-680</a></>}
    {infoPage === 'ourImpact' && <><p>{t('impactText')}</p><p>{t('mission')}</p></>}
    {infoPage === 'accessibility' && <><p>{t('screenReaderHelp')}</p><a href="tel:+84364478680">(+84)36-4478-680</a><a href="mailto:cdr.jsc@gmail.com">cdr.jsc@gmail.com</a></>}
    {infoPage === 'sizeGuide' && <p>{t('sizeGuideText')}</p>}
    {privacyPage && <div className="privacy-preferences"><h2>{t('preferencesTitle')}</h2><p>{t('preferencesText')}</p><button className="editorial-button" onClick={removeEmail}>{t('removeEmail')}</button>{feedback && <p role="status">{t(feedback)}</p>}</div>}
    {infoPage === 'sitemap' && <div className="site-map-links"><button onClick={() => setCurrentView('homepage')}>{t('home')}</button><button onClick={() => browse()}>{t('shop')}</button><button onClick={() => setCurrentView('sell')}>{t('waysToSell')}</button><button onClick={() => openSellGuide()}>{t('sellingGuide')}</button><button onClick={() => setCurrentView('ai-stylist')}>{t('ai')}</button></div>}
    {!known.includes(infoPage) && <><p>{t('infoSoon')}</p><a href="mailto:cdr.jsc@gmail.com">cdr.jsc@gmail.com</a><button className="editorial-button" onClick={() => browse()}>{t('browseShop')}</button></>}
  </section>;
}
