import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;

export function Scene3() {
  return (
    <section className="scene-pad">
      <motion.div className="eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .15 }}>02 / See what you own</motion.div>
      <motion.h2 className="headline" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, delay: .32 }}>每一件，<br /><em>都有數。</em></motion.h2>
      <motion.p className="subline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .7, delay: .7 }}>分類、搜尋、商品照片與品牌，讓「我是不是已經有了？」有一個明確答案。</motion.p>
      <motion.div className="phone" style={{ right: '16vw', top: '18vh' }} initial={{ opacity: 0, y: 60, rotate: -7 }} animate={{ opacity: 1, y: 0, rotate: -4 }} transition={{ duration: 1, delay: .2, ease: [0.16, 1, .3, 1] }}>
        <div className="phone-screen">
          <div className="phone-head"><span className="phone-logo">我的美妝抽屜</span><span className="phone-icon" /></div>
          <div className="phone-search">搜尋商品或品牌</div>
          <div className="phone-cats"><span className="cat" style={{ background: 'var(--aqua)' }}>全部</span><span className="cat" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>保養</span><span className="cat" style={{ background: 'var(--butter)', color: 'var(--ink)' }}>彩妝</span></div>
          <motion.div className="product-row" animate={{ x: [0, 4, 0] }} transition={{ duration: 3, repeat: Infinity }}><div className="product-thumb coral"><img src={`${base}assets/serum-cutout.png`} alt="" /></div><div className="product-copy"><b>玻尿酸保濕精華</b><span>CeraVe · 保養</span></div><div className="product-qty">2</div></motion.div>
          <motion.div className="product-row" animate={{ x: [0, -3, 0] }} transition={{ duration: 3.4, repeat: Infinity, delay: .35 }}><div className="product-thumb"><img src={`${base}assets/cleanser-cutout.png`} alt="" /></div><div className="product-copy"><b>溫和潔面乳</b><span>清潔</span></div><div className="product-qty">1</div></motion.div>
          <div className="product-row"><div className="product-thumb" style={{ background: 'var(--lime)' }}><img src={`${base}assets/palette-cutout.png`} alt="" /></div><div className="product-copy"><b>柔霧腮紅盤</b><span>彩妝</span></div><div className="product-qty">3</div></div>
          <div className="phone-footer" />
        </div>
      </motion.div>
      <motion.div style={{ position: 'absolute', right: '7vw', top: '30vh', width: '11vw', height: '11vw', border: '1px solid rgba(239,119,93,.4)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="scene-kicker" animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity }}>03 / 你的美妝清單，終於有秩序</motion.div>
    </section>
  );
}