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
  console.log("LandingPage mounting...");

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <Activity size={16} className="text-red-500 animate-pulse" />
            <span className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400">Einsatzbereit für Bassersdorf</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
            Sekunden <br className="hidden md:block" /> <span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">entscheiden.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Meistere jede Strasse, jede Sackgasse und jeden Hydranten. <br className="hidden md:block" />
            Lokalmatador macht dich zum Experten für den Ernstfall.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={onStart}
              className="group relative px-10 py-5 bg-red-500 rounded-2xl font-black text-xl flex items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_40px_-10px_rgba(239,68,68,0.5)] active:scale-95 overflow-hidden cursor-pointer"
            >
              <Play size={24} fill="currentColor" />
              <span>JETZT TRAINIEREN</span>
            </button>
            
            <a href="#mission" className="flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-colors duration-200">
              Mehr erfahren <ArrowDown size={20} className="animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-32 px-6 relative bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <ShieldAlert size={64} className="text-red-500 mx-auto mb-8" />
          <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Warum Lokalmatador?</h2>
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-12">
            Im Einsatz zählt jede Sekunde. Wer erst auf das Navi schauen muss, verliert kostbare Zeit. 
            Lokalmatador nutzt reale Daten von OpenStreetMap, um die Strassenkenntnis spielerisch zu trainieren – 
            damit du im Ernstfall blind den schnellsten Weg findest.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-3xl backdrop-blur-md text-center">
              <Clock size={40} className="text-blue-400 mb-4 mx-auto" />
              <h3 className="text-xl font-black mb-2">Reaktionszeit</h3>
              <p className="text-sm text-slate-400">Verkürze die Zeit vom Alarm bis zum Eintreffen am Einsatzort.</p>
            </div>
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-3xl backdrop-blur-md text-center">
              <MapIcon size={40} className="text-red-500 mb-4 mx-auto" />
              <h3 className="text-xl font-black mb-2">Präzision</h3>
              <p className="text-sm text-slate-400">Kenne jede Abzweigung und jeden Hydranten in deinem Einsatzgebiet.</p>
            </div>
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-3xl backdrop-blur-md text-center">
              <Target size={40} className="text-green-400 mb-4 mx-auto" />
              <h3 className="text-xl font-black mb-2">Sicherheit</h3>
              <p className="text-sm text-slate-400">Weniger Stress bei der Anfahrt bedeutet mehr Fokus auf den Einsatz.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-black mb-16 tracking-tighter text-left">Mehr als nur eine Karte.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 bg-slate-800 border border-slate-700 rounded-[32px]">
              <Compass size={28} className="text-red-500 mb-6" />
              <h3 className="text-xl font-black mb-3">OSM Integration</h3>
              <p className="text-sm text-slate-400">Echtzeit-Daten von OpenStreetMap für maximale Genauigkeit.</p>
            </div>
            <div className="p-8 bg-slate-800 border border-slate-700 rounded-[32px]">
              <Zap size={28} className="text-blue-400 mb-6" />
              <h3 className="text-xl font-black mb-3">Gamification</h3>
              <p className="text-sm text-slate-400">Trainiere im Wettkampfmodus gegen die Zeit.</p>
            </div>
            <div className="p-8 bg-slate-800 border border-slate-700 rounded-[32px]">
              <Smartphone size={28} className="text-green-400 mb-6" />
              <h3 className="text-xl font-black mb-3">Mobile First</h3>
              <p className="text-sm text-slate-400">Optimiert für das Smartphone.</p>
            </div>
            <div className="p-8 bg-slate-800 border border-slate-700 rounded-[32px]">
              <Users size={28} className="text-yellow-500 mb-6" />
              <h3 className="text-xl font-black mb-3">Bestenliste</h3>
              <p className="text-sm text-slate-400">Steige im Rang auf und werde zur Legende.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black mb-8">Bist du bereit?</h2>
        <button onClick={onStart} className="px-12 py-6 bg-white text-slate-900 rounded-2xl font-black text-2xl hover:scale-105 transition-transform cursor-pointer shadow-2xl">
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
            &copy; {new Date().getFullYear()} Feuerwehr Bassersdorf Training Tool.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
