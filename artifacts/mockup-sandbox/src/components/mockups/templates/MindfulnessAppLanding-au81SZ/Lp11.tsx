import './fonts.css';
import asset0 from "./assets/lp-11-feature1.png";
import asset1 from "./assets/lp-11-feature2.png";
import asset2 from "./assets/lp-11-hero.png";

import React from 'react';
import { Play, Wind, Moon, Sun, ArrowRight, Activity, Cloud } from 'lucide-react';

export function Lp11() {
  return (
    <div 
      className="relative bg-[#f8faf9] text-[#2d3a35] overflow-hidden flex flex-col font-sans"
      style={{ width: "100%", height: "100%" }}
    >
      {/* Navigation */}
      <nav className="absolute top-0 w-full px-12 py-8 flex justify-between items-center z-20">
        <div className="text-2xl tracking-wide font-['Playfair_Display'] font-medium text-[#1f2925] flex items-center gap-2">
          <Cloud className="w-6 h-6 text-[#5b7a70]" strokeWidth={1.5} />
          Stillwater
        </div>
        <div className="flex gap-10 text-sm tracking-wide text-[#4c5c56]">
          <a href="#" className="hover:text-[#2d3a35] transition-colors">Practices</a>
          <a href="#" className="hover:text-[#2d3a35] transition-colors">Sleep</a>
          <a href="#" className="hover:text-[#2d3a35] transition-colors">Science</a>
          <a href="#" className="hover:text-[#2d3a35] transition-colors">About</a>
        </div>
        <div>
          <button className="text-sm tracking-wide px-6 py-2.5 border border-[#5b7a70] text-[#5b7a70] rounded-full hover:bg-[#5b7a70] hover:text-white transition-all">
            Begin Journey
          </button>
        </div>
      </nav>

      <div className="flex w-full h-full">
        {/* Left Content Area */}
        <div className="w-[45%] h-full flex flex-col justify-center px-16 z-10 pt-16">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#edf1f0] text-[#5b7a70] text-xs font-medium tracking-widest uppercase mb-8 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b7a70]"></span>
            Daily Mindfulness
          </div>
          
          <h1 className="text-6xl leading-[1.1] font-['Playfair_Display'] text-[#1f2925] mb-6">
            Find your center <br/>
            in a noisy world.
          </h1>
          
          <p className="text-lg text-[#5c6b65] leading-relaxed mb-10 max-w-md font-light">
            Guided meditations, breathwork, and sleep stories designed to help you anchor yourself in the present moment, wherever you are.
          </p>
          
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-3 bg-[#5b7a70] text-white px-8 py-4 rounded-full text-sm font-medium hover:bg-[#466058] transition-colors shadow-lg shadow-[#5b7a70]/20">
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-3 text-[#4c5c56] hover:text-[#2d3a35] transition-colors text-sm font-medium px-4 py-2">
              <div className="w-10 h-10 rounded-full border border-[#d3dedb] flex items-center justify-center">
                <Play className="w-4 h-4 ml-1" />
              </div>
              How it works
            </button>
          </div>

          <div className="mt-16 flex items-center gap-12 border-t border-[#e2e8e5] pt-8">
            <div>
              <div className="text-3xl font-['Playfair_Display'] text-[#1f2925] mb-1">4.9</div>
              <div className="text-xs text-[#70807a] uppercase tracking-wider">App Store</div>
            </div>
            <div>
              <div className="text-3xl font-['Playfair_Display'] text-[#1f2925] mb-1">2M+</div>
              <div className="text-xs text-[#70807a] uppercase tracking-wider">Active users</div>
            </div>
            <div>
              <div className="text-3xl font-['Playfair_Display'] text-[#1f2925] mb-1">10k</div>
              <div className="text-xs text-[#70807a] uppercase tracking-wider">Sessions</div>
            </div>
          </div>
        </div>

        {/* Right Visual Area */}
        <div className="w-[55%] h-full relative flex items-center justify-center bg-[#eef1f0] p-12 pt-24">
          <div className="absolute inset-0 z-0">
            <img 
              src={asset2} 
              alt="Misty lake" 
              className="w-full h-full object-cover opacity-80 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#f8faf9] via-transparent to-transparent z-10 w-32"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8faf9] via-transparent to-transparent z-10 h-32 bottom-0 top-auto"></div>
          </div>
          
          <div className="relative z-20 flex gap-6 w-full max-w-2xl mt-12">
            {/* Feature Card 1 */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-black/5 w-1/2 flex flex-col transform translate-y-12 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#f2f5f4] text-[#5b7a70] flex items-center justify-center mb-6">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-['Playfair_Display'] text-[#1f2925] mb-3">Morning Rituals</h3>
              <p className="text-[#5c6b65] text-sm leading-relaxed mb-6 flex-grow">
                Start your day with intention through 5-minute guided awakenings.
              </p>
              <div className="h-32 rounded-2xl overflow-hidden mb-2 relative">
                <img 
                  src={asset1} 
                  alt="Bamboo leaf" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10"></div>
                <button className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center backdrop-blur text-[#2d3a35]">
                  <Play className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-black/5 w-1/2 flex flex-col border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#f2f5f4] text-[#5b7a70] flex items-center justify-center mb-6">
                <Moon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-['Playfair_Display'] text-[#1f2925] mb-3">Deep Sleep</h3>
              <p className="text-[#5c6b65] text-sm leading-relaxed mb-6 flex-grow">
                Drift off naturally with soundscapes and soothing bedtime stories.
              </p>
              <div className="h-32 rounded-2xl overflow-hidden mb-2 relative">
                <img 
                  src={asset0} 
                  alt="Meditation stones" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10"></div>
                <button className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center backdrop-blur text-[#2d3a35]">
                  <Play className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Element */}
          <div className="absolute top-32 right-12 bg-white/90 backdrop-blur-md py-3 px-5 rounded-full shadow-lg shadow-black/5 flex items-center gap-3 border border-white">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-[#2d3a35]">1,204 people meditating right now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Lp11 as "lp-11" };
