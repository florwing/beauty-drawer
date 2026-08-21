import { motion } from 'framer-motion';
import { ArrowDownUp } from 'lucide-react';

export function Scene1() {
  return (
    <section className="scene-pad">
      <motion.div className="eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .2 }}>Personal beauty inventory</motion.div>
      <motion.h1 className="headline" initial={{ opacity: 0, y: 28, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: .8, delay: .42, ease: [0.16, 1, .3, 1] }}>一眼找到，<br /><em>剛剛好。</em></motion.h1>
      <motion.p className="subline" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .95 }}>把散落在浴室、梳妝台與記憶裡的美妝品，整理成一個會呼吸的抽屜。</motion.p>
      <motion.div className="stamp" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .5, delay: 1.45 }}><i /> mobile-first / local inventory</motion.div>
      <motion.div className="phone" style={{ right: '12vw', top: '16vh' }} initial={{ opacity: 0, y: 70, rotate: 8 }} animate={{ opacity: 1, y: 0, rotate: 5 }} transition={{ duration: 1.15, delay: .3, ease: [0.16, 1, .3, 1] }}>
        <div className="phone-screen">
          <div className="phone-head"><span className="phone-logo">我的美妝抽屜</span><span className="phone-icon" /></div>
          <div className="phone-hero"><small>今日抽屜狀態</small><strong>一眼找到，<br /><span style={{ color: 'var(--lime)' }}>剛剛好。</span></strong><div className="phone-stats"><div className="stat"><b>12</b><span>件商品</span></div><div className="stat"><b>3</b><span>快用完</span></div><div className="stat"><b>1</b><span>提醒</span></div></div></div>
          <div className="phone-search">搜尋商品或品牌</div>
          <div className="phone-cats"><span className="cat">全部</span><span className="cat">保養</span><span className="cat">彩妝</span></div>
          <div className="product-row"><div className="product-thumb coral" /><div className="product-copy"><b>玻尿酸保濕精華</b><span>CeraVe · 保養</span></div><div className="product-qty">2</div></div>
          <div className="product-row"><div className="product-thumb" /><div className="product-copy"><b>溫和潔面乳</b><span>清潔</span></div><div className="product-qty">1</div></div>
          <div className="phone-footer" />
        </div>
      </motion.div>
      <motion.div className="scene-kicker" animate={{ x: [0, 6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>01 / 開始於看見</motion.div>
      <motion.div style={{ position: 'absolute', right: '42vw', top: '72vh', color: 'var(--coral)' }} animate={{ rotate: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity }}><ArrowDownUp size="2.2vw" /></motion.div>
    </section>
  );
}