import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;

export function Scene4() {
  return (
    <section className="scene-pad">
      <motion.div className="eyebrow" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .15 }}>03 / Keep the count honest</motion.div>
      <motion.h2 className="headline" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .35 }}>用掉一件，<br /><em>補回一件。</em></motion.h2>
      <motion.p className="subline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6, delay: .78 }}>快速扣減，或直接補貨。數量跟著日常走，不需要另外記在腦裡。</motion.p>
      <motion.div className="quantity-card" initial={{ opacity: 0, scale: .78, rotate: 5 }} animate={{ opacity: 1, scale: 1, rotate: 2 }} transition={{ duration: 1, delay: .2, ease: [0.16, 1, .3, 1] }}>
        <div className="qty-trail" />
        <div className="phone-product"><img src={`${base}assets/serum-cutout.png`} alt="" /><div><b>玻尿酸保濕精華</b><span>CeraVe · 保養</span></div></div>
        <motion.div className="qty-number" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .8 }}><motion.strong animate={{ color: ['var(--lime)', '#f2d58a', 'var(--lime)'] }} transition={{ duration: 2.3, repeat: Infinity }}>2</motion.strong><span>件</span></motion.div>
        <div className="qty-controls"><div className="qty-control">−1</div><div className="qty-control">−2</div><div className="qty-control">−3</div><div className="qty-control">+1</div></div>
        <motion.div style={{ marginTop: '1.1vw', color: 'rgba(248,246,239,.5)', fontSize: '.55vw' }} animate={{ opacity: [.45, 1, .45] }} transition={{ duration: 2, repeat: Infinity }}>數量已更新 · local storage</motion.div>
      </motion.div>
      <motion.div className="scene-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>04 / 小動作，讓清單保持準確</motion.div>
    </section>
  );
}