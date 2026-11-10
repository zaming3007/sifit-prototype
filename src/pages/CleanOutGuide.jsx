import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import CategoryIcon from '../components/CategoryIcon';
import Icon from '../components/Icon';
import bannerOne from '../image/banner/banner (1).webp';
import bannerTwo from '../image/banner/banner (2).webp';

const sections = [['what-to-send', 'whatToSend'], ['earnings', 'earnings'], ['what-to-expect', 'whatToExpect'], ['faqs', 'faqs']];
const steps = [['stepPrepare', 'stepPrepareText', 'checkroom'], ['stepChoose', 'stepChooseText', 'edit_square'], ['stepMatch', 'stepMatchText', 'local_shipping'], ['stepEarn', 'stepEarnText', 'payments']];
const questions = [['faqSendQuestion', 'faqSendAnswer'], ['faqAccountQuestion', 'faqAccountAnswer'], ['faqEarningsQuestion', 'faqEarningsAnswer'], ['faqTimingQuestion', 'faqTimingAnswer'], ['faqUnsoldQuestion', 'faqUnsoldAnswer']];

export default function CleanOutGuide() {
  const { guideSection, setGuideSection, setCurrentView } = useApp();
  const { t } = useLanguage();
  const [active, setActive] = useState('what-to-send');
  const [openQuestion, setOpenQuestion] = useState(0);
  const guideRef = useRef(null);
  const jumpTo = useCallback(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    setActive(id);
    window.history.replaceState(window.history.state, '', `?view=sell-guide#${id}`);
  }, []);
  useEffect(() => {
    if (!guideSection) return;
    const frame = requestAnimationFrame(() => { jumpTo(guideSection); setGuideSection(''); });
    return () => cancelAnimationFrame(frame);
  }, [guideSection, jumpTo, setGuideSection]);
  useEffect(() => {
    let frame;
    const update = () => {
      const headerHeight = document.querySelector('.store-header')?.getBoundingClientRect().height || 198;
      let current = sections[0][0];
      for (const [id] of sections) if (document.getElementById(id)?.getBoundingClientRect().top <= headerHeight + 110) current = id;
      setActive(current);
    };
    const onScroll = () => { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  const heading = (id, key, number, image) => <header className="guide-section-banner"><img src={image} alt="" loading="lazy" /><div /><span className="guide-number">{number}</span><h2 id={`${id}-title`}>{t(key)}</h2></header>;
  return <div className="cleanout-guide-page">
    <section className="guide-hero"><img src={bannerOne} alt="Sifit pre-loved wardrobe" fetchPriority="high" /><div className="guide-hero-shade" /><div className="guide-hero-copy"><h1>{t('cleanOutGuide')}</h1><p>{t('guideIntro')}</p><div><button className="selling-button transparent-button" onClick={() => jumpTo('earnings')}>{t('estimateEarnings')}</button><button className="selling-button" onClick={() => setCurrentView('sell')}>{t('sellWithUs')}</button></div></div></section>
    <div className="guide-layout wide-container" ref={guideRef}><aside className="guide-sidebar"><p className="eyebrow">{t('inThisGuide')}</p><nav aria-label={t('inThisGuide')}>{sections.map(([id, key]) => <a key={id} href={`?view=sell-guide#${id}`} className={active === id ? 'active' : ''} aria-current={active === id ? 'location' : undefined} onClick={event => { event.preventDefault(); jumpTo(id); }}>{t(key)}</a>)}</nav></aside>
      <div className="guide-content">
        <section id="what-to-send" className="guide-section" aria-labelledby="what-to-send-title">{heading('what-to-send', 'whatToSend', 1, bannerOne)}<div className="guide-section-body"><p className="guide-lead">{t('sendIntro')}</p><ul className="send-checklist">{['sendClean', 'sendCondition', 'sendLabels', 'sendHonest'].map(key => <li key={key}><Icon name="check_circle" />{t(key)}</li>)}</ul><h3>{t('sendCategories')}</h3><div className="guide-category-list">{['dresses', 'tops', 'jackets', 'shoes', 'bags'].map(key => <div key={key}><CategoryIcon category={key} /><span>{t(key)}</span></div>)}</div><div className="guide-note"><Icon name="eco" /><div><h3>{t('sendNotTitle')}</h3><p>{t('sendNotText')}</p></div></div></div></section>
        <section id="earnings" className="guide-section" aria-labelledby="earnings-title">{heading('earnings', 'earnings', 2, bannerTwo)}<div className="guide-section-body"><p className="guide-lead">{t('earningsIntro')}</p><div className="earnings-calculator"><p>{t('feeNote')}</p></div><h3>{t('earningsTipTitle')}</h3><p>{t('earningsTipText')}</p></div></section>
        <section id="what-to-expect" className="guide-section" aria-labelledby="what-to-expect-title">{heading('what-to-expect', 'whatToExpect', 3, bannerOne)}<div className="guide-section-body"><p className="guide-lead">{t('expectIntro')}</p><ol className="selling-timeline">{steps.map(([title, text, icon], index) => <li key={title}><span className="timeline-number">{index + 1}</span><div><Icon name={icon} /><h3>{t(title)}</h3><p>{t(text)}</p></div></li>)}</ol><div className="bag-contact"><h3>{t('bagIntro')}</h3><p>{t('bagText')}</p><a className="selling-button green-button" href="mailto:cdr.jsc@gmail.com?subject=Sifit%20Clean%20Out">{t('contactTeam')}<Icon name="arrow_forward" /></a></div></div></section>
        <section id="faqs" className="guide-section" aria-labelledby="faqs-title"><header className="guide-faq-heading"><span className="guide-number">4</span><h2 id="faqs-title">{t('faqs')}</h2></header><div className="faq-list">{questions.map(([question, answer], index) => <div className="faq-item" key={question}><h3><button aria-expanded={openQuestion === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenQuestion(openQuestion === index ? null : index)}>{t(question)}<Icon name={openQuestion === index ? 'remove' : 'add'} /></button></h3><div id={`faq-answer-${index}`} hidden={openQuestion !== index}><p>{t(answer)}</p></div></div>)}</div></section>
      </div>
    </div>
    <section className="guide-final-cta"><h2>{t('readyCleanOut')}</h2><button className="selling-button green-button" onClick={() => setCurrentView('sell')}>{t('sellWithUs')}<Icon name="arrow_forward" /></button></section>
  </div>;
}
