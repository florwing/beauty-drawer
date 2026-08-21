import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;

export function Scene5() {
  return (
    <section className="scene-pad">
      <motion.div className="eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .12 }}>04 / Make it yours</motion.div>
      <motion.h2 className="headline" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, delay: .32 }}>資料可以<br /><em>自己調整。</em></motion.h2>
      <motion.p className="subline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6, delay: .72 }}>照片、名稱、分類、價格、購買地點，都留給你決定。</motion.p>
      <motion.div className="edit-card" initial={{ opacity: 0, y: 48, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 1 }} transition={{ duration: 1, delay: .22, ease: [0.16, 1, .3, 1] }}>
        <div className="edit-head"><b>編輯商品資料</b><span>整理資訊</span></div>
        <div style={{ display: 'flex', gap: '1vw', alignItems: 'center', marginTop: '1.1vw' }}><div className="edit-photo"><img src={`${base}assets/serum-cutout.png`} alt="" /></div><div><div className="tiny-label">product photo</div><div style={{ marginTop: '.35vw', fontSize: '.64vw', color: 'var(--coral-deep)', fontWeight: 800 }}>更換照片</div></div></div>
        <div className="edit-fields">
          <div className="field"><span>商品名稱</span><b>玻尿酸保濕精華</b></div><div className="field"><span>品牌</span><b>CeraVe</b></div>
          <div className="field"><span>目前數量</span><b>2</b></div><div className="field"><span>分類</span><b>保養</b></div>
          <div className="field"><span>價格</span><b>$680</b></div><div className="field"><span>購買地點</span><b>品牌官網</b></div>
        </div>
      </motion.div>
      <motion.div className="scene-kicker" animate={{ x: [0, 5, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>05 / 你的抽屜，你的規則</motion.div>
    </section>
  );
}