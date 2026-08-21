import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;

export function Scene2() {
  return (
    <section className="scene-pad">
      <motion.div className="eyebrow" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .15 }}>01 / Add with a photo</motion.div>
      <motion.h2 className="headline" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, delay: .35 }}>拍一下，<br /><em>認得更快。</em></motion.h2>
      <motion.p className="subline" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .75 }}>上傳包裝照片，DeepSeek 會先填好商品名稱與品牌；想改，隨時可以。</motion.p>
      <motion.div className="capture-card" initial={{ opacity: 0, scale: .88, rotate: 3 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} transition={{ duration: 1, delay: .2, ease: [0.16, 1, .3, 1] }}>
        <div className="capture-photo">
          <img src={`${base}assets/serum-cutout.png`} alt="" />
          <span className="photo-corner tl" /><span className="photo-corner tr" /><span className="photo-corner bl" /><span className="photo-corner br" />
          <motion.div style={{ position: 'absolute', left: '12%', right: '12%', height: 2, background: 'rgba(255,255,255,.86)' }} animate={{ top: ['18%', '80%', '18%'] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="recognition-panel">
          <motion.div className="deepseek-badge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}><span className="deepseek-dot" /> DeepSeek recognition</motion.div>
          <div className="recognition-row"><span>商品名稱</span><motion.b initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }}>玻尿酸保濕精華</motion.b></div>
          <div className="recognition-row"><span>品牌</span><motion.b initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.55 }}>CeraVe</motion.b></div>
        </div>
      </motion.div>
      <motion.div className="scene-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>02 / 從照片開始整理</motion.div>
    </section>
  );
}