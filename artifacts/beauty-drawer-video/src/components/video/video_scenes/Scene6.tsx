import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';

const base = import.meta.env.BASE_URL;

export function Scene6() {
  return (
    <section className="scene-pad">
      <motion.div className="eyebrow" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .15 }}>05 / Remember before it is too late</motion.div>
      <motion.h2 className="headline" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .35 }}>有效期限，<br /><em>不靠記憶。</em></motion.h2>
      <motion.p className="subline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .65, delay: .8 }}>未開封到期日、PAO 與開封日期，整理好，也提醒你。</motion.p>
      <motion.div className="phone" style={{ right: '14vw', top: '17vh' }} initial={{ opacity: 0, y: 56, rotate: 5 }} animate={{ opacity: 1, y: 0, rotate: 3 }} transition={{ duration: 1, delay: .2, ease: [0.16, 1, .3, 1] }}>
        <div className="phone-screen">
          <div className="phone-head"><span className="phone-logo">編輯商品資料</span><span className="phone-icon" /></div>
          <div style={{ display: 'flex', gap: '.6vw', alignItems: 'center', padding: '.7vw', borderRadius: '.8vw', background: 'rgba(239,119,93,.1)' }}><div className="product-thumb coral"><img src={`${base}assets/serum-cutout.png`} alt="" /></div><div><b style={{ display: 'block', fontSize: '.7vw' }}>玻尿酸保濕精華</b><span style={{ color: 'var(--muted)', fontSize: '.5vw' }}>CeraVe</span></div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4vw', margin: '1.2vw 0 .7vw' }}><CalendarClock size="1.1vw" color="var(--coral)" /><b style={{ fontSize: '.68vw' }}>有效期限追蹤</b></div>
          <div className="field" style={{ marginBottom: '.55vw' }}><span>未開封到期日</span><b>2025年7月18日</b></div>
          <div className="field" style={{ marginBottom: '.55vw' }}><span>PAO（開封後）</span><b>12 M</b></div>
          <div className="field"><span>開封日期</span><b>2024年7月18日</b></div>
          <div className="phone-footer" />
        </div>
      </motion.div>
      <motion.div className="expiry-box" initial={{ opacity: 0, x: -25, scale: .9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: .75, delay: 1.05, ease: [0.16, 1, .3, 1] }}>
        <div className="expiry-top"><span className="expiry-icon"><CalendarClock size="1.1em" /></span><b>即將過期</b></div>
        <p>有效至 2025年7月18日<br />在剛好需要的時候，收到剛好的提醒。</p>
      </motion.div>
      <motion.div className="scene-kicker" initial={{ opacity: 0 }} animate={{ opacity: [0,1,1,0] }} transition={{ duration: 5.2, times: [0, .15, .85, 1], repeat: Infinity }}>06 / Beauty Drawer — 把日常，放回抽屜</motion.div>
    </section>
  );
}