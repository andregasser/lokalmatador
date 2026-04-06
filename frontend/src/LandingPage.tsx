import React from 'react';
import { 
  ShieldAlert, Map as MapIcon, Target, Zap, 
  Clock, Play, 
  ArrowDown, Activity, Users, Smartphone, Compass
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-white font-sans scroll-smooth overflow-y-auto">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md animate-login-fade">
            <Activity size={14} className="text-red-500 animate-pulse" />
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-slate-400">Einsatzbereit für Bassersdorf</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-[900] tracking-[-0.04em] mb-8 leading-[0.9] animate-login-fade text-white">
            Sekunden <br className="hidden md:block" /> entscheiden. <br />
            <div className="flex flex-col items-center mt-6">
              <span className="text-[0.3em] md:text-[0.25em] tracking-[0.4em] uppercase text-slate-500 font-bold mb-2">Werde zum</span>
              <span className="text-primary text-glow uppercase tracking-[-0.02em] text-7xl md:text-9xl">Lokalmatador.</span>
            </div>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-14 leading-relaxed font-medium">
            Meistere jede Strasse, jede Sackgasse und jeden Hydranten. <br className="hidden md:block" />
            Lokalmatador macht dich zum Experten für den Ernstfall.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <button 
              onClick={onStart}
              className="group relative px-12 py-6 bg-red-500 rounded-2xl font-[900] text-xl flex items-center gap-4 transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_50px_-10px_rgba(239,68,68,0.6)] active:scale-95 overflow-hidden cursor-pointer tracking-tight"
            >
              <Play size={24} fill="currentColor" />
              <span>JETZT TRAINIEREN</span>
            </button>
            
            <a href="#mission" className="flex items-center gap-2 text-slate-500 font-bold hover:text-white transition-colors duration-200 tracking-wide">
              Mehr erfahren <ArrowDown size={18} className="animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-40 px-6 relative bg-slate-950/40">
        <div className="max-w-4xl mx-auto text-center">
          <ShieldAlert size={56} className="text-red-500 mx-auto mb-10 opacity-80" />
          <h2 className="text-4xl md:text-6xl font-[900] mb-10 leading-tight tracking-[-0.03em]">Warum Lokalmatador?</h2>
          <p className="text-lg md:text-2xl text-slate-400 leading-relaxed mb-16 font-medium max-w-3xl mx-auto">
            Im Einsatz zählt jede Sekunde. Wer erst auf das Navi schauen muss, verliert kostbare Zeit. 
            Lokalmatador nutzt reale Daten von OpenStreetMap, um die Strassenkenntnis spielerisch zu trainieren – 
            damit du im Ernstfall blind den schnellsten Weg findest.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="group p-10 bg-slate-900/40 border border-slate-800 rounded-[40px] backdrop-blur-md text-center hover:bg-slate-900/60 transition-colors">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Clock size={32} className="text-blue-400" />
              </div>
              <h3 className="text-2xl font-black mb-3 tracking-tight">Reaktionszeit</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed">Verkürze die Zeit vom Alarm bis zum Eintreffen am Einsatzort.</p>
            </div>
            <div className="group p-10 bg-slate-900/40 border border-slate-800 rounded-[40px] backdrop-blur-md text-center hover:bg-slate-900/60 transition-colors">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <MapIcon size={32} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-3 tracking-tight">Präzision</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed">Kenne jede Abzweigung und jeden Hydranten in deinem Einsatzgebiet.</p>
            </div>
            <div className="group p-10 bg-slate-900/40 border border-slate-800 rounded-[40px] backdrop-blur-md text-center hover:bg-slate-900/60 transition-colors">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Target size={32} className="text-green-400" />
              </div>
              <h3 className="text-2xl font-black mb-3 tracking-tight">Sicherheit</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed">Weniger Stress bei der Anfahrt bedeutet mehr Fokus auf den Einsatz.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-40 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-24 gap-8">
            <h2 className="text-5xl md:text-7xl font-[900] tracking-[-0.04em] text-center md:text-left leading-[0.9]">Mehr als nur <br />eine Karte.</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-red-500/50 to-transparent hidden md:block"></div>
            <p className="text-slate-500 text-lg md:text-xl font-medium max-w-xs text-center md:text-right">Entwickelt für die Anforderungen der Feuerwehr.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-10 bg-slate-900/30 border border-slate-800 rounded-[40px] hover:border-red-500/30 transition-all duration-300">
              <Compass size={32} className="text-red-500 mb-8" />
              <h3 className="text-2xl font-black mb-4 tracking-tight">OSM Integration</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed font-medium">Echtzeit-Daten von OpenStreetMap für maximale Genauigkeit.</p>
            </div>
            <div className="p-10 bg-slate-900/30 border border-slate-800 rounded-[40px] hover:border-blue-500/30 transition-all duration-300">
              <Zap size={32} className="text-blue-400 mb-8" />
              <h3 className="text-2xl font-black mb-4 tracking-tight">Gamification</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed font-medium">Trainiere im Wettkampfmodus gegen die Zeit.</p>
            </div>
            <div className="p-10 bg-slate-900/30 border border-slate-800 rounded-[40px] hover:border-green-500/30 transition-all duration-300">
              <Smartphone size={32} className="text-green-400 mb-8" />
              <h3 className="text-2xl font-black mb-4 tracking-tight">Mobile First</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed font-medium">Optimiert für das Smartphone – trainiere überall.</p>
            </div>
            <div className="p-10 bg-slate-900/30 border border-slate-800 rounded-[40px] hover:border-yellow-500/30 transition-all duration-300">
              <Users size={32} className="text-yellow-500 mb-8" />
              <h3 className="text-2xl font-black mb-4 tracking-tight">Bestenliste</h3>
              <p className="text-[0.95rem] text-slate-500 leading-relaxed font-medium">Steige im Rang auf und werde zur Legende.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-red-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <h2 className="text-5xl md:text-8xl font-[900] mb-12 tracking-[-0.04em] leading-[0.9]">Bist du <br />bereit?</h2>
        <button 
          onClick={onStart} 
          className="px-16 py-8 bg-white text-slate-950 rounded-[32px] font-[950] text-3xl hover:scale-105 transition-all duration-300 cursor-pointer shadow-[0_30px_60px_-15px_rgba(255,255,255,0.3)] active:scale-95 tracking-tighter"
        >
          JETZT LOSLEGEN
        </button>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-red-500" />
            <span className="text-xl font-black tracking-tighter">LOKALMATADOR</span>
          </div>
          <div className="text-slate-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} André Gasser
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
