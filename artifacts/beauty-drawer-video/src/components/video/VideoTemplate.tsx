import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { Box } from 'lucide-react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS: Record<string, number> = {
  opening: 4700,
  recognition: 6700,
  inventory: 6200,
  quantity: 5600,
  editing: 6100,
  expiry: 5800,
};

const scenes = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const Scene = scenes[currentScene] ?? Scene1;
  const progress = useMemo(
    () => ((currentScene + 0.6) / scenes.length) * 100,
    [currentScene],
  );

  return (
    <main className="video-root">
      <motion.div className="persistent-orb orb-a" animate={{ x: [0, 20, -10, 0], y: [0, -16, 10, 0], scale: [1, 1.05, .97, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="persistent-orb orb-b" animate={{ x: [0, -28, 8, 0], y: [0, 18, -6, 0], scale: [1, .94, 1.05, 1] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="persistent-orb orb-c" animate={{ rotate: [0, 90, 180], scale: [1, 1.18, 1] }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }} />

      <div className="top-lockup">
        <span className="lockup-mark"><Box size="1em" strokeWidth={2.6} /></span>
        <span>Beauty Drawer</span>
      </div>
      <div className="top-count">PRODUCT INTRODUCTION / 16:9</div>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={currentScene}
          className="scene-wrap"
          initial={{ clipPath: 'circle(0% at 78% 50%)', opacity: .2, scale: 1.04 }}
          animate={{ clipPath: 'circle(145% at 78% 50%)', opacity: 1, scale: 1 }}
          exit={{ clipPath: 'circle(0% at 18% 50%)', opacity: .4, scale: .98 }}
          transition={{ duration: .85, ease: [0.16, 1, 0.3, 1] }}
        >
          <Scene />
        </motion.div>
      </AnimatePresence>

      <div className="progress-rail">
        <motion.div className="progress-dot" animate={{ left: `${progress}%` }} transition={{ duration: .8, ease: [0.16, 1, .3, 1] }} />
      </div>
    </main>
  );
}