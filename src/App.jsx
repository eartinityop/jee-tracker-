import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Clock, Play, Pause, RotateCcw, X, Settings, Image as ImageIcon, Trash2, SunDim, Upload, Download, CheckCircle, Save, Layers } from 'lucide-react';
import CalendarView from './CalendarView';
import SyllabusView from './SyllabusView';
import ProgressView from './ProgressView';
import TimerView from './TimerView';
import { useDriveSync } from './useDriveSync';

const formatTime = (totalSeconds, showHours = false) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (showHours || h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > 1920) { h = Math.round((h * 1920) / w); w = 1920; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

const THEMES = [
  { id: 'blue', name: 'Ocean', orb1: 'bg-blue-500/40', orb2: 'bg-indigo-500/30', ring: 'ring-blue-500', hex: '#3b82f6' },
  { id: 'red', name: 'Crimson', orb1: 'bg-red-500/40', orb2: 'bg-rose-500/30', ring: 'ring-red-500', hex: '#ef4444' },
  { id: 'green', name: 'Emerald', orb1: 'bg-emerald-500/40', orb2: 'bg-teal-500/30', ring: 'ring-emerald-500', hex: '#10b981' },
  { id: 'orange', name: 'Amber', orb1: 'bg-orange-500/40', orb2: 'bg-amber-500/30', ring: 'ring-orange-500', hex: '#f59e0b' },
  { id: 'purple', name: 'Amethyst', orb1: 'bg-purple-500/40', orb2: 'bg-fuchsia-500/30', ring: 'ring-purple-500', hex: '#a855f7' },
  { id: 'pink', name: 'Rose', orb1: 'bg-pink-500/40', orb2: 'bg-rose-400/30', ring: 'ring-pink-500', hex: '#ec4899' },
  { id: 'cyan', name: 'Cyan', orb1: 'bg-cyan-500/40', orb2: 'bg-sky-500/30', ring: 'ring-cyan-500', hex: '#06b6d4' },
  { id: 'yellow', name: 'Gold', orb1: 'bg-yellow-400/40', orb2: 'bg-amber-300/30', ring: 'ring-yellow-400', hex: '#eab308' },
  { id: 'slate', name: 'Graphite', orb1: 'bg-slate-500/40', orb2: 'bg-gray-400/30', ring: 'ring-slate-500', hex: '#64748b' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tracker-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('tracker-color') || 'blue');
  const [bgImage, setBgImage] = useState(() => localStorage.getItem('tracker-bg') || null);
  
  const [colorIntensity, setColorIntensity] = useState(() => Number(localStorage.getItem('tracker-color-intensity') ?? 100));
  const [bgDimness, setBgDimness] = useState(() => Number(localStorage.getItem('tracker-bg-dimness') ?? 20));
  const [tileOpacity, setTileOpacity] = useState(() => Number(localStorage.getItem('tracker-tile-opacity') ?? 40));

  const [timerMode, setTimerMode] = useState('Pomodoro');
  const [pomodoroType, setPomodoroType] = useState('Focus');
  const [timeLeft, setTimeLeft] = useState(1500);
  const [totalTime, setTotalTime] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [islandState, setIslandState] = useState('hidden');

  const { isLoggedIn, token, loginWithGoogle, logoutGoogle, saveToDrive, isSyncing } = useDriveSync();
  
  // 🔥 FIX: Store the true original prototype method to prevent stack overflow on re-renders
  const originalSetItemRef = useRef(Storage.prototype.setItem);

  useEffect(() => {
    const triggerResize = () => window.dispatchEvent(new Event('resize'));
    const t1 = setTimeout(triggerResize, 150);
    const t2 = setTimeout(triggerResize, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeTab]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let syncTimeout;
    
    // Safely apply the patch using the cached reference
    Storage.prototype.setItem = function(key, value) {
      originalSetItemRef.current.apply(this, arguments);
      if (key.startsWith('tracker-')) {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => saveToDrive(token), 3000); 
      }
    };
    
    return () => { 
      Storage.prototype.setItem = originalSetItemRef.current; 
      clearTimeout(syncTimeout); 
    };
  }, [isLoggedIn, token, saveToDrive]);

  const handleLocalExport = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('tracker-')) data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `JEE_Tracker_Backup_${new Date().toLocaleDateString('en-US')}.json`;
    a.click();
  };

  const handleLocalImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
        alert('✅ Data Imported Successfully! App will restart.');
        window.location.reload();
      } catch (err) { alert('❌ Invalid Backup File!'); }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (timerMode === 'Stopwatch') return prev + 1;
          if (prev <= 1) {
            setIsRunning(false);
            if (activeTab !== 'timer') {
              setIslandState('expanded');
              setTimeout(() => setIslandState(c => c === 'expanded' ? 'pill' : c), 1500);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timerMode, activeTab]);

  useEffect(() => {
    if (timeLeft === 0 && !isRunning && timerMode !== 'Stopwatch' && totalTime > 0) {
      const t = setTimeout(() => {
        setTimeLeft(totalTime);
        if (activeTab !== 'timer') { setIslandState('closing'); setTimeout(() => setIslandState('hidden'), 400); }
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [timeLeft, isRunning, timerMode, totalTime, activeTab]);

  useEffect(() => {
    const hasActiveSession = isRunning || (timerMode === 'Stopwatch' ? timeLeft > 0 : timeLeft > 0 && timeLeft < totalTime);
    if (activeTab !== 'timer' && hasActiveSession && islandState === 'hidden') {
      setIslandState('expanded');
      const t = setTimeout(() => setIslandState(p => p === 'expanded' ? 'pill' : p), 2000);
      return () => clearTimeout(t);
    } else if (activeTab === 'timer') setIslandState('hidden');
  }, [activeTab, isRunning, timerMode, timeLeft, totalTime, islandState]);

  const handleTimerReset = () => {
    setIsRunning(false);
    setTimeLeft(timerMode === 'Pomodoro' ? (pomodoroType === 'Focus' ? 1500 : pomodoroType === 'Short' ? 300 : 900) : timerMode === 'Stopwatch' ? 0 : totalTime);
    setIslandState('closing');
    setTimeout(() => setIslandState('hidden'), 400);
  };

  useEffect(() => {
    localStorage.setItem('tracker-theme', isDark ? 'dark' : 'light');
    if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => { localStorage.setItem('tracker-color', activeTheme); }, [activeTheme]);
  useEffect(() => { localStorage.setItem('tracker-color-intensity', colorIntensity.toString()); }, [colorIntensity]);
  useEffect(() => { localStorage.setItem('tracker-bg-dimness', bgDimness.toString()); }, [bgDimness]);
  useEffect(() => { localStorage.setItem('tracker-tile-opacity', tileOpacity.toString()); }, [tileOpacity]);
  useEffect(() => { if (bgImage) localStorage.setItem('tracker-bg', bgImage); else localStorage.removeItem('tracker-bg'); }, [bgImage]);

  const currentTheme = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  const toggleThemeBtn = (
    <button onClick={() => setIsDark(!isDark)} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md w-9 h-9 rounded-full hover:scale-110 transition-transform flex items-center justify-center shadow-md border border-white/20 shrink-0 z-50">
      {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-indigo-500" />}
    </button>
  );

  const timerIslandUI = islandState !== 'hidden' && (
    <div className="relative flex items-center justify-center z-[100] h-[36px] w-[280px] shrink-0">
       <div className={`
           absolute right-0 top-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
           overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/5
           ${islandState === 'expanded' 
             ? 'w-[340px] h-[95px] rounded-[28px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-3xl p-4 z-[999] shadow-2xl' 
             : islandState === 'pill' 
               ? 'w-[280px] h-[36px] rounded-full bg-slate-300/30 dark:bg-black/30 backdrop-blur-xl hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer flex items-center justify-center gap-3 z-[100]' 
               : 'w-0 h-0 opacity-0 border-none'}
         `}
         onClick={(e) => { e.stopPropagation(); if(islandState === 'pill') setIslandState('expanded'); }}
       >
         {islandState === 'expanded' ? (
            <div className="flex flex-col w-full h-full justify-between animate-in fade-in duration-300">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                   <Clock className={timeLeft === 0 && !isRunning && timerMode !== 'Stopwatch' ? "text-red-500" : "text-blue-500"} size={14} />
                   <span className="font-extrabold text-[11px] tracking-[0.1em] uppercase text-slate-500 dark:text-slate-300">
                     {timeLeft === 0 && !isRunning && timerMode !== 'Stopwatch' ? (timerMode === 'Countdown' ? "Time's up!" : 'Timer Done') : 'Focus Mode'}
                   </span>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={(e) => { e.stopPropagation(); setIsRunning(!isRunning); }} className="hover:scale-110 transition-transform">
                     {isRunning ? <Pause size={14} className="text-yellow-500" fill="currentColor"/> : <Play size={14} className="text-emerald-500" fill="currentColor"/>}
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); handleTimerReset(); }} className="hover:scale-110 transition-transform">
                     <RotateCcw size={14} className="text-red-500"/>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); setIslandState('pill'); }} className="hover:scale-110 transition-transform ml-1">
                     <X size={14} className="text-slate-400"/>
                   </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                 <span className={`font-black text-2xl tabular-nums leading-none min-w-[85px] ${timeLeft===0 && !isRunning ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{formatTime(timeLeft)}</span>
                 <div className="flex-1 bg-slate-200/50 dark:bg-slate-900/50 h-2 rounded-full overflow-hidden shadow-inner">
                   <div className={`${timeLeft === 0 && !isRunning ? 'bg-red-500' : 'bg-blue-500'} h-full transition-all duration-1000 ease-linear rounded-full`} style={{width: `${timerMode === 'Stopwatch' ? 100 : (totalTime ? ((totalTime - timeLeft)/totalTime)*100 : 0)}%`}}></div>
                 </div>
              </div>
            </div>
         ) : islandState === 'pill' ? (
            <div className="flex items-center justify-center gap-2 w-full h-full animate-in fade-in duration-300">
              <Clock className={`text-blue-500 ${isRunning ? 'animate-pulse' : ''}`} size={14} />
              <span className="font-black text-[13px] text-slate-800 dark:text-white tabular-nums">{formatTime(timeLeft)}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{timerMode}</span>
            </div>
         ) : null}
       </div>
    </div>
  );

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.4); border-radius: 10px; }
        
        .bg-white\\/40 { background-color: rgba(255, 255, 255, ${tileOpacity / 100}) !important; }
        .dark .dark\\:bg-slate-900\\/40 { background-color: rgba(15, 23, 42, ${tileOpacity / 100}) !important; }
        .dark .dark\\:bg-slate-800\\/40 { background-color: rgba(30, 41, 59, ${tileOpacity / 100}) !important; }
    
        .backdrop-blur-xl { 
          backdrop-filter: blur(${(tileOpacity / 100) * 24}px) !important; 
          -webkit-backdrop-filter: blur(${(tileOpacity / 100) * 24}px) !important; 
        }

        .bg-white\\/20, .bg-white\\/30 { background-color: rgba(255, 255, 255, ${(tileOpacity / 100) * 0.25}) !important; }
        .dark .dark\\:bg-slate-800\\/30 { background-color: rgba(30, 41, 59, ${(tileOpacity / 100) * 0.3}) !important; }
        .dark .dark\\:bg-black\\/20 { background-color: rgba(0, 0, 0, ${(tileOpacity / 100) * 0.2}) !important; }
      `}</style>

      <div 
        className="flex flex-col min-h-screen w-full overflow-x-hidden text-slate-800 dark:text-slate-100 transition-colors duration-300 relative bg-slate-100 dark:bg-[#0b1120]"
        style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
      >
        <div className="absolute inset-0 pointer-events-none z-0 transition-colors duration-300" style={{ backgroundColor: `rgba(0,0,0,${bgDimness / 100})`, position: 'fixed' }}></div>

        {!bgImage && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ opacity: colorIntensity / 100 }}>
            <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] ${currentTheme.orb1} rounded-full blur-[100px] transition-colors duration-1000`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] ${currentTheme.orb2} rounded-full blur-[100px] transition-colors duration-1000`}></div>
          </div>
        )}

        <nav className="sticky top-0 w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 z-[200] shrink-0 shadow-lg border-b border-white/20 transition-all duration-300">
          
          <div className="flex-1 flex justify-start items-center">
             <h1 className="text-xl font-extrabold text-blue-500 tracking-tight hidden sm:block">JEE Tracker</h1>
             <h1 className="text-xl font-extrabold text-blue-500 tracking-tight sm:hidden">JEE</h1>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <NavButton icon="📅" label="Calendar" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <NavButton icon="📚" label="Syllabus" isActive={activeTab === 'syllabus'} onClick={() => setActiveTab('syllabus')} />
            <NavButton icon="📈" label="Progress" isActive={activeTab === 'progress'} onClick={() => setActiveTab('progress')} />
            <NavButton icon="⏱️" label="Timer" isActive={activeTab === 'timer'} onClick={() => setActiveTab('timer')} />
          </div>

          <div className="flex-1 flex justify-end items-center">
            <button onClick={() => setIsSettingsOpen(true)} title="Settings" className="p-2 sm:p-3 rounded-full transition-all text-slate-600 dark:text-slate-300 hover:bg-white/20 hover:text-slate-900 dark:hover:text-white group">
              <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500 shrink-0" />
            </button>
          </div>
        </nav>

        <main className="flex-1 p-2 md:p-4 flex flex-col z-10 relative">
          {activeTab === 'calendar' && <CalendarView themeToggle={toggleThemeBtn} timerIsland={timerIslandUI} />}
          {activeTab === 'syllabus' && <SyllabusView themeToggle={toggleThemeBtn} timerIsland={timerIslandUI} />}
          {activeTab === 'progress' && <ProgressView themeToggle={toggleThemeBtn} timerIsland={timerIslandUI} />}
          {activeTab === 'timer' && <TimerView themeToggle={toggleThemeBtn} timerMode={timerMode} setTimerMode={setTimerMode} pomodoroType={pomodoroType} setPomodoroType={setPomodoroType} timeLeft={timeLeft} setTimeLeft={setTimeLeft} totalTime={totalTime} setTotalTime={setTotalTime} isRunning={isRunning} setIsRunning={setIsRunning} />}
        </main>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex justify-center items-center p-4">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl w-full max-w-md rounded-[32px] p-8 relative shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto hide-scrollbar">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={24} /></button>
            
            <h3 className="text-2xl font-black mb-8 text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Settings className="text-blue-500" /> Settings
            </h3>
            
            <div className="mb-6">
              <label className="text-xs font-extrabold text-slate-500 tracking-widest uppercase mb-3 block">Color Theme</label>
              <div className="flex flex-wrap gap-3">
                {THEMES.map(theme => (
                  <button 
                    key={theme.id} 
                    onClick={() => setActiveTheme(theme.id)}
                    className={`w-8 h-8 rounded-full shadow-md transition-all ${activeTheme === theme.id ? `ring-4 ring-offset-2 dark:ring-offset-[#0f172a] ${theme.ring} scale-110` : 'hover:scale-110 opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: theme.hex }}
                    title={theme.name}
                  />
                ))}
              </div>
            </div>

            {!bgImage && (
              <div className="mb-6">
                <label className="text-xs font-extrabold text-slate-500 tracking-widest uppercase mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><SunDim size={16} /> Orb Intensity</span>
                  <span className="text-blue-500">{colorIntensity}%</span>
                </label>
                <input type="range" min="0" max="100" step="5" value={colorIntensity} onChange={(e) => setColorIntensity(Number(e.target.value))} className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            )}

            <div className="mb-6">
               <label className="text-xs font-extrabold text-slate-500 tracking-widest uppercase mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Moon size={16} /> BG Dimness</span>
                  <span className="text-blue-500">{bgDimness}%</span>
               </label>
               <input type="range" min="0" max="90" step="5" value={bgDimness} onChange={(e) => setBgDimness(Number(e.target.value))} className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>

            <div className="mb-6">
               <label className="text-xs font-extrabold text-slate-500 tracking-widest uppercase mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Layers size={16} /> Glass Opacity</span>
                  <span className="text-blue-500">{tileOpacity}%</span>
               </label>
               <input type="range" min="0" max="100" step="5" value={tileOpacity} onChange={(e) => setTileOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>

            <div className="mb-2 border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
              <label className="text-xs font-extrabold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2"><ImageIcon size={16} /> Custom Wallpaper</label>
              <div className="flex items-center gap-4">
                {bgImage && <img src={bgImage} alt="Wallpaper" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md" />}
                <div className="flex-1 flex flex-col gap-2">
                  <label className="bg-blue-600/80 hover:bg-blue-500 text-white text-sm font-bold py-2 px-4 rounded-2xl cursor-pointer text-center transition-colors shadow-lg backdrop-blur-md">
                    Upload Image
                    <input type="file" accept="image/*" onChange={async (e) => { 
                      if(e.target.files[0]) {
                        setBgImage(await compressImage(e.target.files[0])); 
                        e.target.value = null; // Fix: Reset input to allow re-uploads
                      }
                    }} className="hidden" />
                  </label>
                  {bgImage && <button onClick={() => setBgImage(null)} className="flex items-center justify-center gap-2 bg-red-500/20 text-red-500 text-sm font-bold py-2 px-4 rounded-2xl transition-colors hover:bg-red-500 hover:text-white"><Trash2 size={16} /> Remove</button>}
                </div>
              </div>
            </div>

            <div className="mb-2 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <label className="text-xs font-extrabold text-slate-500 tracking-widest uppercase mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2"><Save size={16} className="text-emerald-500"/> Data Backup & Sync</span>
                {isSyncing && <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full animate-pulse">Syncing...</span>}
              </label>

              <div className="flex flex-col gap-3">
                {isLoggedIn ? (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 p-3 rounded-2xl">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle size={16} /> GDrive Active</span>
                    <button onClick={logoutGoogle} className="text-xs font-bold text-slate-500 hover:text-red-500">Disconnect</button>
                  </div>
                ) : (
                  <button onClick={() => loginWithGoogle()} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold py-3 px-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-colors">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" /> Auto-Sync with Google Drive
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={handleLocalExport} className="flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl transition-colors">
                    <Download size={14} /> Export Backup
                  </button>
                  <label className="flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors">
                    <Upload size={14} /> Import Data
                    <input type="file" accept=".json" onChange={handleLocalImport} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}

function NavButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} title={label} className={`relative flex items-center justify-center p-2 rounded-full transition-all w-10 h-10 sm:w-12 sm:h-12 ${isActive ? 'bg-blue-600/90 text-white shadow-lg border border-white/20 backdrop-blur-md scale-105' : 'text-slate-600 dark:text-slate-400 hover:bg-white/20 hover:text-slate-900 dark:hover:text-white border border-transparent hover:scale-105'}`}>
      <span className="text-lg sm:text-xl shrink-0">{icon}</span>
    </button>
  );
}
