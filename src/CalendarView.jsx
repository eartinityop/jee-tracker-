import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import confetti from 'canvas-confetti';
import { Plus, X, Pencil, Trash2, Clock, Calendar as CalIcon, ChevronDown, CheckSquare, Square, Zap, Target, CheckCircle, ChevronLeft, ChevronRight, History } from 'lucide-react';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const formatLocalYMD = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const NEXT_14_DAYS = Array.from({length: 30}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i - 7); return formatLocalYMD(d);
});

const getDateLabel = (dateStr) => {
    if(!dateStr) return 'Select Date';
    const d = new Date(dateStr); const today = new Date();
    if(d.toDateString() === today.toDateString()) return `Today, ${d.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
    today.setDate(today.getDate()+1);
    if(d.toDateString() === today.toDateString()) return `Tomorrow, ${d.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
    return d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
};

const extractTime = (isoString, defaultTime = '00:00') => isoString?.includes('T') ? isoString.split('T')[1].substring(0, 5) : defaultTime;
const extractDate = (isoString) => isoString?.includes('T') ? isoString.split('T')[0] : isoString;

const continuousSprayConfetti = () => {
  const duration = 2000; const end = Date.now() + duration;
  const leftCannon = confetti.create(null, { resize: true }); const rightCannon = confetti.create(null, { resize: true });
  const fire = () => {
    leftCannon({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, gravity: 0.8, ticks: 150, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
    rightCannon({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, gravity: 0.8, ticks: 150, colors: ['#3b82f6', '#f59e0b', '#ec4899'] });
    if (Date.now() < end) requestAnimationFrame(fire); 
  };
  fire();
};

export default function CalendarView({ themeToggle, timerIsland }) {
  const calendarRef = useRef(null);
  const [currentView, setCurrentView] = useState('dayGridMonth'); 
  const [calendarTitle, setCalendarTitle] = useState('');
  const [currentRenderDate, setCurrentRenderDate] = useState(new Date());
  
  const [fullSyllabus, setFullSyllabus] = useState(() => JSON.parse(localStorage.getItem('tracker-syllabus') || '[]'));
  const [chapters, setChapters] = useState(() => JSON.parse(localStorage.getItem('tracker-chapters') || '[]'));
  const [events, setEvents] = useState(() => JSON.parse(localStorage.getItem('tracker-events') || '[]'));
  const [mocks, setMocks] = useState(() => JSON.parse(localStorage.getItem('tracker-mocks') || '[]'));

  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [isMockHistoryOpen, setIsMockHistoryOpen] = useState(false);
  const [mockForm, setMockForm] = useState({ name: '', date: formatLocalYMD(new Date()), start: '09:00', end: '12:00', type: 'JEE Mains', selectedChapters: [], isCompleted: false, score: null });
  const [mockSubjectTab, setMockSubjectTab] = useState(null);
  const [mockEditId, setMockEditId] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); 
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [activeMockForScore, setActiveMockForScore] = useState(null);
  const [tempScore, setTempScore] = useState('');

  // FORCE REFRESH DATA ON MOUNT
  useEffect(() => {
    setFullSyllabus(JSON.parse(localStorage.getItem('tracker-syllabus') || '[]'));
    setChapters(JSON.parse(localStorage.getItem('tracker-chapters') || '[]'));
    setEvents(JSON.parse(localStorage.getItem('tracker-events') || '[]'));
  }, []);

  useEffect(() => { localStorage.setItem('tracker-chapters', JSON.stringify(chapters)); }, [chapters]);
  useEffect(() => { localStorage.setItem('tracker-events', JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem('tracker-mocks', JSON.stringify(mocks)); }, [mocks]);

  useEffect(() => {
    const updateTime = () => document.documentElement.style.setProperty('--current-time', `"${new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}"`);
    updateTime(); const interval = setInterval(updateTime, 60000); 
    return () => clearInterval(interval);
  }, []);

  const getScrollTime = () => {
    const d = new Date(); d.setHours(Math.max(0, d.getHours() - 3)); 
    return `${String(d.getHours()).padStart(2, '0')}:00:00`;
  };

  const TASK_COLORS = {
    red: { bg: '#ef4444', border: '#b91c1c', text: '#ffffff' },
    orange: { bg: '#f97316', border: '#c2410c', text: '#ffffff' },
    yellow: { bg: '#eab308', border: '#a16207', text: '#ffffff' },
    green: { bg: '#10b981', border: '#047857', text: '#ffffff' },
    cyan: { bg: '#06b6d4', border: '#0e7490', text: '#ffffff' },
    blue: { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
    indigo: { bg: '#6366f1', border: '#4338ca', text: '#ffffff' },
    purple: { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' },
    pink: { bg: '#ec4899', border: '#be185d', text: '#ffffff' },
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [taskName, setTaskName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [taskColorKey, setTaskColorKey] = useState('blue');
  const [subject, setSubject] = useState('Physics');
  const [linkedChapterTitle, setLinkedChapterTitle] = useState(''); 

  const [dailyModal, setDailyModal] = useState({ isOpen: false, dateStr: '', tasks: [], dayMocks: [] });
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState([]);

  const changeView = (viewName) => { calendarRef.current.getApi().changeView(viewName); setCurrentView(viewName); };

  const currentMonthKey = `${currentRenderDate.getFullYear()}-${String(currentRenderDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthChapters = chapters.filter(c => c.monthKey === currentMonthKey);

  const openAddModal = (dateStr, existingTask = null) => {
    // Force refresh explicitly 
    setChapters(JSON.parse(localStorage.getItem('tracker-chapters') || '[]'));
    setFullSyllabus(JSON.parse(localStorage.getItem('tracker-syllabus') || '[]'));

    if (existingTask) {
      setEditingId(existingTask.id); setTaskName(existingTask.title || ''); 
      setStartTime(extractTime(existingTask.start, '08:00')); setEndTime(extractTime(existingTask.end, '10:00'));
      setTaskColorKey(existingTask.extendedProps?.colorKey || existingTask.colorKey || 'blue'); 
      setSubject(existingTask.extendedProps?.subject || existingTask.subject || 'Physics'); 
      setLinkedChapterTitle(existingTask.extendedProps?.linkedChapterTitle || existingTask.linkedChapterTitle || ''); 
      setSelectedDate(extractDate(existingTask.start));
    } else {
      setEditingId(null); setSelectedDate(extractDate(dateStr)); setTaskName(''); setStartTime('08:00'); setEndTime('10:00'); setTaskColorKey('blue'); setSubject('Physics'); setLinkedChapterTitle('');
    }
    setDailyModal({ ...dailyModal, isOpen: false }); setIsModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!taskName) return;
    const existingTask = events.find(e => e.id === editingId);
    const newEvent = { id: editingId || String(Date.now()), title: taskName, start: `${selectedDate}T${startTime}:00`, end: `${selectedDate}T${endTime}:00`, colorKey: taskColorKey, subject, linkedChapterTitle, allDay: false, done: existingTask ? existingTask.extendedProps?.done || existingTask.done : false };
    if (editingId) setEvents(events.map(e => e.id === editingId ? newEvent : e)); else setEvents([...events, newEvent]);
    setIsModalOpen(false);
  };

  const openMockModal = (existingMock = null) => {
    setOpenDropdown(null);
    if (existingMock) { setMockEditId(existingMock.id); setMockForm({ ...existingMock, selectedChapters: existingMock.selectedChapters || [] }); } 
    else { setMockEditId(null); setMockForm({ name: '', date: formatLocalYMD(new Date()), start: '09:00', end: '12:00', type: 'JEE Mains', selectedChapters: [], isCompleted: false, score: null }); }
    setDailyModal({ ...dailyModal, isOpen: false }); setIsMockModalOpen(true);
  };

  const openScoreModal = (mock) => {
    setActiveMockForScore(mock); setTempScore(mock.score ? String(mock.score) : ''); setIsScoreModalOpen(true);
  };

  const saveMockTest = () => {
    if(!mockForm.name || !mockForm.date || !mockForm.start || !mockForm.end || !mockForm.type) {
      alert("⚠️ CAUTION: Please fill all mandatory fields (Name, Date, Type, Start Time, and End Time) before saving."); return;
    }
    if (mockEditId) setMocks(mocks.map(m => m.id === mockEditId ? { ...mockForm } : m));
    else setMocks([...mocks, { id: String(Date.now()), ...mockForm, isCompleted: false, score: null }]);
    setIsMockModalOpen(false);
  };

  const handleMockScoreSubmit = () => {
    if(!tempScore || isNaN(tempScore)) return;
    setMocks(mocks.map(m => m.id === activeMockForScore.id ? { ...m, isCompleted: true, score: Number(tempScore) } : m));
    setIsScoreModalOpen(false); setTempScore(''); continuousSprayConfetti();
  };

  const getMockBoxBgClass = (m) => {
    if (!m.isCompleted) return 'bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/5 text-slate-800 dark:text-white';
    const s = Number(m.score);
    if (m.type === 'JEE Mains') {
      if (s <= 110) return 'bg-red-500/20 border-red-500/50 text-red-500';
      if (s <= 190) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500';
      return 'bg-green-500/20 border-green-500/50 text-green-500';
    } else {
      if (s <= 120) return 'bg-red-500/20 border-red-500/50 text-red-500';
      if (s <= 220) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500';
      return 'bg-green-500/20 border-green-500/50 text-green-500';
    }
  };

  const getScorePillClass = (m) => {
    const s = Number(m.score);
    if (m.type === 'JEE Mains') {
      if (s <= 110) return 'bg-red-500 border-red-400 text-white';
      if (s <= 190) return 'bg-yellow-500 border-yellow-400 text-white';
      return 'bg-green-500 border-green-400 text-white';
    } else {
      if (s <= 120) return 'bg-red-500 border-red-400 text-white';
      if (s <= 220) return 'bg-yellow-500 border-yellow-400 text-white';
      return 'bg-green-500 border-green-400 text-white';
    }
  };

  const deleteTask = (id) => { setEvents(events.filter(e => e.id !== id)); setDailyModal(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) })); };
  const deleteMock = (id) => { setMocks(mocks.filter(m => m.id !== id)); setDailyModal(prev => ({...prev, dayMocks: prev.dayMocks.filter(m => m.id !== id)})); };
  const toggleTaskDone = (id) => { setEvents(events.map(e => { const isDone = e.extendedProps?.done !== undefined ? e.extendedProps.done : e.done; if (e.id === id) { if (!isDone) continuousSprayConfetti(); return { ...e, done: !isDone }; } return e; })); };
  
  const triggerDailyModal = (dateStr) => { 
    const safeDateStr = extractDate(dateStr);
    const tasksForDay = events.filter(e => extractDate(e.start) === safeDateStr); 
    const mocksForDay = mocks.filter(m => m.date === safeDateStr);
    setDailyModal({ isOpen: true, dateStr: safeDateStr, tasks: tasksForDay, dayMocks: mocksForDay }); 
  };
  
  const handleDateClick = (arg) => { if (currentView === 'dayGridMonth') triggerDailyModal(arg.dateStr); else openAddModal(arg.dateStr.split('T')[0]); };
  
  const openChapterModal = () => { 
    // Force refresh syllabus to avoid "Empty Syllabus" bug
    const updatedSyllabus = JSON.parse(localStorage.getItem('tracker-syllabus') || '[]');
    setFullSyllabus(updatedSyllabus);
    setPendingSelection(currentMonthChapters.map(c => c.chapterId)); 
    setIsChapterModalOpen(true); 
  };
  
  const handleSaveMonthlyChapters = () => {
    let newChapters = chapters.filter(c => c.monthKey !== currentMonthKey || pendingSelection.includes(c.chapterId));
    const existingIdsInMonth = newChapters.filter(c => c.monthKey === currentMonthKey).map(c => c.chapterId);
    const newAdditions = pendingSelection.filter(id => !existingIdsInMonth.includes(id)).map(id => {
        const ch = fullSyllabus.find(s => s.id === id);
        return { id: `mc_${Date.now()}_${Math.random()}`, chapterId: ch.id, title: ch.title, subject: ch.subject, done: false, monthKey: currentMonthKey };
    });
    setChapters([...newChapters, ...newAdditions]); setIsChapterModalOpen(false);
  };
  const toggleChapterSelection = (id) => pendingSelection.includes(id) ? setPendingSelection(pendingSelection.filter(i => i !== id)) : setPendingSelection([...pendingSelection, id]);

  const toggleChapterDone = (id) => {
    setChapters(chapters.map(c => {
      if (c.id === id) {
        const newDone = !c.done;
        if (newDone) continuousSprayConfetti(); 
        const updatedFullSyllabus = fullSyllabus.map(s => {
          if (s.id === c.chapterId) {
            const mats = JSON.parse(localStorage.getItem('tracker-materials')) || {};
            const subjMats = mats[s.subject] || [];
            const newProg = { ...(s.progress || {}) };
            if (newDone) subjMats.forEach(m => newProg[m] = true);
            return { ...s, progress: newProg };
          }
          return s;
        });
        setFullSyllabus(updatedFullSyllabus); localStorage.setItem('tracker-syllabus', JSON.stringify(updatedFullSyllabus));
        return { ...c, done: newDone };
      }
      return c;
    }));
  };

  const renderEventContent = (eventInfo) => {
    const k = eventInfo.event.extendedProps?.colorKey || 'blue';
    const isDone = eventInfo.event.extendedProps?.done || false;
    const c = TASK_COLORS[k] || TASK_COLORS.blue;

    if (currentView === 'dayGridMonth') {
      return (
        <div className={`w-full flex justify-start overflow-hidden px-2 py-0.5 ${isDone ? 'opacity-50' : ''}`} style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: '4px', color: c.text }}>
          <div className={`text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis tracking-tight leading-tight ${isDone ? 'line-through' : ''}`}>{eventInfo.event.title}</div>
        </div>
      );
    }
    
    const s = eventInfo.event.start ? eventInfo.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true}) : '';
    const e = eventInfo.event.end ? eventInfo.event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true}) : '';
    return (
      <div className={`relative z-20 w-full h-full flex flex-col justify-start p-2.5 overflow-hidden shadow-md transition-all ${isDone ? 'saturate-50 brightness-75' : ''}`} style={{ backgroundColor: c.bg, borderLeft: `5px solid ${c.border}`, borderRadius: '6px', color: c.text }}>
        <div className={`text-[18px] font-black tracking-tight leading-tight mb-1 ${isDone ? 'line-through text-white/70' : ''}`}>{eventInfo.event.title}</div>
        <div className={`flex items-center gap-1.5 font-extrabold mt-0.5 ${isDone ? 'text-white/60' : 'opacity-90'}`} style={{ fontSize: '12px' }}><Clock size={13} strokeWidth={3} /><span>{s} - {e}</span></div>
      </div>
    );
  };

  const renderMonthCell = (arg) => {
    const dateStr = formatLocalYMD(arg.date);
    const dayMocks = mocks.filter(m => m.date === dateStr);
    
    const todayStr = formatLocalYMD(new Date());
    const isPast = new Date(dateStr) < new Date(todayStr);
    const isToday = dateStr === todayStr;
    const allCompleted = dayMocks.length > 0 && dayMocks.every(m => m.isCompleted);

    return (
      <div className={`flex justify-between items-start w-full h-full p-1 cursor-pointer group transition-all duration-300 ${isPast ? 'bg-slate-50/10 dark:bg-slate-800/20 opacity-50 hover:opacity-100' : ''}`} onClick={() => triggerDailyModal(dateStr)}>
        <div className="flex flex-col items-start pt-1 pl-1">
          {dayMocks.length > 0 && currentView === 'dayGridMonth' && (
             <div className="flex items-center gap-1 z-20">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${allCompleted ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 shadow-sm border border-white dark:border-slate-900 ${allCompleted ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </span>
                {dayMocks.length > 1 && <span className={`text-[10px] font-black leading-none ${allCompleted ? 'text-green-500' : 'text-red-500'}`}>+{dayMocks.length - 1}</span>}
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 pt-0.5 pr-0.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); openAddModal(dateStr); }} className="relative z-50 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/40 border border-white/20 dark:border-white/10 dark:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-md">
            <Plus size={14} className="pointer-events-none" />
          </button>
          <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${isToday ? 'bg-blue-600 text-white shadow-md z-10' : 'text-slate-700 dark:text-slate-200 group-hover:bg-slate-200/50 dark:group-hover:bg-slate-700/50 z-10'}`}>
            <span className="font-bold text-[13px]">{arg.dayNumberText.replace('日','')}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderHeaderContent = (arg) => {
    if (currentView === 'dayGridMonth') return <div className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-1">{arg.text.replace(/[0-9]/g, '')}</div>;
    const date = arg.date.getDate(); const day = arg.date.toLocaleDateString('en-US', { weekday: 'short' });
    const isToday = formatLocalYMD(arg.date) === formatLocalYMD(new Date());
    
    return (
      <div className="flex flex-col items-center justify-center py-3 relative w-full">
        <div className={`w-8 h-8 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-900 dark:text-white'}`}>
          <span className="text-[20px] font-extrabold leading-none">{date}</span>
        </div>
        <span className={`text-[10px] uppercase font-bold tracking-wider ${isToday ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600'}`}>{day}</span>
      </div>
    );
  };

  const getMiniCalendarGrid = () => {
    const year = currentRenderDate.getFullYear(), month = currentRenderDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(), adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let grid = [], currentRow = [];
    for (let i = 0; i < adjustedFirstDay; i++) currentRow.push(null);
    for (let i = 1; i <= daysInMonth; i++) { currentRow.push(new Date(year, month, i)); if (currentRow.length === 7) { grid.push(currentRow); currentRow = []; } }
    if (currentRow.length > 0) { while(currentRow.length < 7) currentRow.push(null); grid.push(currentRow); }
    return grid;
  };
  const miniGrid = getMiniCalendarGrid();
  const todayDateStr = formatLocalYMD(new Date());
  
  const todaysTasks = events.filter(e => extractDate(e.start) === todayDateStr).sort((a,b) => (a.start || '').localeCompare(b.start || ''));

  const CustomDropdown = ({ value, options, onChange, label, typeKey }) => (
    <div className="relative flex-1">
       <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{label} *</label>
       <div 
         className="w-full bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg px-4 py-3 font-bold text-slate-900 dark:text-white cursor-pointer flex justify-between items-center transition-shadow shadow-sm hover:shadow-md" 
         onClick={() => setOpenDropdown(openDropdown === typeKey ? null : typeKey)}
       >
         {typeKey === 'date' ? getDateLabel(value) : value} <ChevronDown size={14} className="text-blue-500" />
       </div>
       {openDropdown === typeKey && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-200 dark:border-blue-800 rounded-lg shadow-2xl z-[300] max-h-48 overflow-y-auto hide-scrollbar">
             {options.map(opt => (
                <div key={opt} onClick={() => { onChange(opt); setOpenDropdown(null); }} className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0">{typeKey === 'date' ? getDateLabel(opt) : opt}</div>
             ))}
          </div>
       )}
    </div>
  );

  const taskDateObj = selectedDate ? new Date(selectedDate) : currentRenderDate;
  const taskMonthKey = `${taskDateObj.getFullYear()}-${String(taskDateObj.getMonth() + 1).padStart(2, '0')}`;
  const availableChapters = chapters.filter(c => c.monthKey === taskMonthKey && c.subject === subject);

  // 🔥 BULLETPROOF AUTO-SCROLL FIX 🔥
  useEffect(() => {
    if (currentView === 'timeGridWeek' || currentView === 'timeGridDay') {
      let attempts = 0;
      
      const scrollInterval = setInterval(() => {
        const nowIndicator = document.querySelector('.fc-timegrid-now-indicator-line');
        
        if (nowIndicator) {
          // Line milte hi scroll karo aur search band kar do
          nowIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });
          clearInterval(scrollInterval);
        }
        
        attempts++;
        // Failsafe: 1.5 seconds (15 attempts) ke baad search band kar do taaki app hang na ho
        if (attempts > 15) clearInterval(scrollInterval);
      }, 100);

      return () => clearInterval(scrollInterval);
    }
  }, [currentView]);
  
  return (
   <>
    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl mini-h-screen w-full flex flex-col transition-colors duration-300 relative rounded-[32px] shadow-2xl border border-white/20 mb-2 mr-2">
      
      {isDateDropdownOpen && <div className="fixed inset-0 z-[190]" onClick={() => setIsDateDropdownOpen(false)}></div>}

      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-300/40 dark:border-slate-700/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity bg-white/40 dark:bg-white/10 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/20 dark:border-white/5 shadow-sm" onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}>
              <h2 className="text-[20px] font-extrabold text-slate-800 dark:text-white tracking-tight select-none">{calendarTitle}</h2>
              <ChevronDown size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            {isDateDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 dark:border-white/10 z-[200] p-2 max-h-[350px] overflow-y-auto hide-scrollbar">
                 {currentView === 'dayGridMonth' ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                    <button key={m} onClick={() => { calendarRef.current.getApi().gotoDate(new Date(currentRenderDate.getFullYear(), idx, 1)); setIsDateDropdownOpen(false); }} className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-[8px] text-sm font-bold transition-colors ${idx === currentRenderDate.getMonth() ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><span>{m} {currentRenderDate.getFullYear()}</span></button>
                 )) : <div className="p-4 text-sm font-semibold text-slate-500 text-center">Use arrows to change day/week</div>}
              </div>
            )}
          </div>
          <div className="flex gap-1 bg-white/40 dark:bg-white/10 backdrop-blur-md rounded-full p-1 shadow-sm border border-white/20 dark:border-white/5 hidden sm:flex">
            <button onClick={() => calendarRef.current.getApi().prev()} className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 rounded-full transition-colors">&lt;</button>
            <button onClick={() => calendarRef.current.getApi().today()} className="text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-bold hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-full transition-colors">Today</button>
            <button onClick={() => calendarRef.current.getApi().next()} className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 rounded-full transition-colors">&gt;</button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 transition-all duration-500">
          <div className="relative flex w-[280px] bg-slate-300/30 dark:bg-black/30 backdrop-blur-xl p-1.5 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/5 z-0">
            <div className="absolute top-1.5 bottom-1.5 rounded-full bg-white/90 dark:bg-white/20 shadow-md border border-white/60 dark:border-white/30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0"
                 style={{ width: 'calc(33.33% - 4px)', transform: `translateX(${['dayGridMonth', 'timeGridWeek', 'timeGridDay'].indexOf(currentView) * 100}%)` }}></div>
            {['Month', 'Week', 'Day'].map((view, idx) => {
              const apiName = ['dayGridMonth', 'timeGridWeek', 'timeGridDay'][idx];
              return (
                <button key={view} onClick={() => changeView(apiName)} className={`relative flex-1 flex justify-center items-center py-1.5 text-sm z-10 transition-all duration-300 ${currentView === apiName ? 'text-slate-900 dark:text-white font-black drop-shadow-sm scale-105' : 'text-slate-500/60 dark:text-slate-300/50 font-bold hover:text-slate-600/80 dark:hover:text-slate-300/70'}`}>
                  {view}
                </button>
              );
            })}
          </div>
          {timerIsland}
          {themeToggle}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row bg-transparent relative w-full">
        
        {/* LEFT SIDEBAR */}
        <div className="w-full md:w-[300px] border-b md:border-b-0 md:border-r border-slate-300/40 dark:border-slate-700/50 p-5 flex flex-col hidden md:flex shrink-0">
          
          <div className="mb-6 select-none shrink-0 bg-white/20 dark:bg-slate-800/30 p-4 rounded-3xl border border-white/30 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-sm font-extrabold text-slate-800 dark:text-white">{currentRenderDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <div className="flex gap-1">
                 <button onClick={() => setCurrentRenderDate(new Date(currentRenderDate.getFullYear(), currentRenderDate.getMonth() - 1, 1))} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={14}/></button>
                 <button onClick={() => setCurrentRenderDate(new Date(currentRenderDate.getFullYear(), currentRenderDate.getMonth() + 1, 1))} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"><ChevronRight size={14}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div></div>
            <div className="flex flex-col gap-1">
              {miniGrid.map((row, rowIdx) => {
                const isCurrentWeekRow = row.some(d => d && formatLocalYMD(d) === todayDateStr);
                return (
                  <div key={rowIdx} className={`grid grid-cols-7 text-center rounded-[12px] transition-colors ${isCurrentWeekRow ? 'bg-blue-500/10 dark:bg-blue-500/20' : ''}`}>
                    {row.map((day, dIdx) => {
                      if (!day) return <div key={dIdx} className="py-1.5"></div>;
                      const dateStr = formatLocalYMD(day);
                      const isToday = dateStr === todayDateStr;
                      return (
                        <div key={dIdx} className="flex justify-center items-center py-1.5 relative cursor-pointer" onClick={() => triggerDailyModal(dateStr)}>
                          <div className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full transition-colors ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'}`}>
                            {day.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-6 shrink-0 relative z-20">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2"><Zap size={16} className="text-yellow-500 fill-yellow-500" /><span className="text-sm font-bold text-slate-800 dark:text-white">Today's Tasks</span></div>
              <button type="button" onClick={() => openAddModal(todayDateStr)} className="relative z-50 p-1.5 rounded-full bg-white/40 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 border border-white/20 dark:border-white/5 transition-all hover:scale-110 shadow-sm cursor-pointer"><Plus size={14} className="pointer-events-none" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {todaysTasks.length === 0 ? <span className="text-xs font-medium text-slate-500">No tasks today.</span> : todaysTasks.map(task => {
                const isDone = task.extendedProps?.done !== undefined ? task.extendedProps.done : task.done;
                return (
                  <div key={task.id} onClick={() => toggleTaskDone(task.id)} className="flex items-start gap-3 cursor-pointer group p-3 bg-white/30 dark:bg-black/20 border border-white/30 dark:border-white/5 rounded-2xl shadow-sm hover:bg-white/40 dark:hover:bg-black/40 transition-colors">
                    <div className="pt-0.5">
                       {isDone ? <CheckSquare size={16} className="text-blue-500 flex-shrink-0" /> : <Square size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />}
                    </div>
                    <div className="flex flex-col">
                       <span className={`text-sm font-bold transition-colors ${isDone ? 'text-slate-400 line-through opacity-50' : 'text-slate-800 dark:text-white'}`}>{task.title}</span>
                       <div className={`text-[10px] font-semibold mt-1 flex items-center gap-1.5 ${isDone ? 'text-slate-400/50' : 'text-slate-500 dark:text-slate-400'}`}>
                          <span>{extractTime(task.start, '00:00')} - {extractTime(task.end, '00:00')}</span>
                          <span className="text-[8px]">•</span>
                          <span>{task.extendedProps?.subject || task.subject || 'Subject'}</span>
                       </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="w-full h-px bg-slate-300/40 dark:bg-slate-700/50 mb-6 shrink-0"></div>

          <div className="mb-6 shrink-0 relative z-20">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2"><Zap size={16} className="text-blue-500 fill-blue-500" /><span className="text-sm font-bold text-slate-800 dark:text-white">Chapters Covered</span></div>
              <button type="button" onClick={() => openChapterModal()} className="relative z-50 p-1.5 rounded-full bg-white/40 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 border border-white/20 dark:border-white/5 transition-all hover:scale-110 shadow-sm cursor-pointer"><Plus size={14} className="pointer-events-none" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {currentMonthChapters.length === 0 ? <span className="text-xs font-medium text-slate-500">No chapters mapped for this month.</span> : currentMonthChapters.map(chap => (
                <div key={chap.id} onClick={() => toggleChapterDone(chap.id)} className={`flex items-start gap-3 cursor-pointer group p-3 border rounded-2xl shadow-sm transition-colors ${chap.done ? 'bg-slate-200/50 dark:bg-slate-800/50 border-transparent opacity-60 grayscale' : 'bg-white/30 dark:bg-black/20 border-white/30 dark:border-white/5 hover:bg-white/40 dark:hover:bg-black/40'}`}>
                  <div className="pt-0.5">
                     {chap.done ? <CheckSquare size={16} className="text-blue-500 flex-shrink-0" /> : <Square size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />}
                  </div>
                  <div className="flex flex-col">
                     <span className={`text-sm font-bold transition-colors ${chap.done ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{chap.title}</span>
                     <div className={`text-[10px] font-semibold mt-1 ${chap.done ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {chap.subject}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-slate-300/40 dark:bg-slate-700/50 mb-6 shrink-0"></div>

          {/* MOCK TESTS SIDEBAR WITH NEW HISTORY ICON */}
          <div className="shrink-0 pb-10 relative z-20">
             <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-red-500 fill-red-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-white">Mock Tests</span>
              </div>
              <div className="flex items-center gap-2">
                 <button type="button" onClick={() => setIsMockHistoryOpen(true)} className="relative z-50 p-1.5 rounded-full bg-white/40 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-white/20 dark:border-white/5 transition-all hover:scale-110 shadow-sm cursor-pointer" title="View Full History">
                    <History size={14} className="pointer-events-none" />
                 </button>
                 <button type="button" onClick={() => openMockModal()} className="relative z-50 p-1.5 rounded-full bg-white/40 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-white/20 dark:border-white/5 transition-all hover:scale-110 shadow-sm cursor-pointer" title="Add Mock">
                    <Plus size={14} className="pointer-events-none" />
                 </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {mocks.filter(m => m.date?.startsWith(currentMonthKey)).length === 0 ? (
                <span className="text-xs font-medium text-slate-500">No mocks this month.</span>
              ) : (
                mocks.filter(m => m.date?.startsWith(currentMonthKey)).sort((a,b) => (a.date||'').localeCompare(b.date||'')).map(m => (
                  <div key={m.id} className={`p-4 rounded-2xl border shadow-sm relative overflow-hidden backdrop-blur-md transition-colors ${getMockBoxBgClass(m)}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            {m.isCompleted ? (
                                <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                                   <div className="absolute inset-0 bg-green-300 rounded-full animate-ping opacity-50"></div>
                                   <CheckCircle size={18} className="text-white relative z-10" />
                                </div>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); openScoreModal(m); }} className="group flex items-center justify-center w-5 h-5 flex-shrink-0 cursor-pointer relative z-50" title="Mark as Done">
                                   <div className="w-4 h-4 rounded border-2 border-slate-400 dark:border-slate-300 group-hover:border-red-400 transition-colors z-10"></div>
                                   <div className="absolute top-[-2px] right-[-2px] w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-80"></div>
                                   <div className="absolute top-[-2px] right-[-2px] w-2.5 h-2.5 bg-red-500 rounded-full z-20"></div>
                                </button>
                            )}
                            <span className="text-sm font-black text-white leading-tight drop-shadow-sm">{m.name}</span>
                        </div>
                        
                        {m.isCompleted && (
                            <div className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-sm ${getScorePillClass(m)}`}>
                                {m.score}/{m.type === 'JEE Mains' ? 300 : 360}
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] font-bold text-white/80 mt-1 pl-7">{m.date} | {m.type}</div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pl-7">
                        {m.selectedChapters?.slice(0,3).map(id => <span key={id} className="bg-black/20 text-[9px] font-bold px-2 py-1 rounded-md text-white truncate max-w-[80px] border border-white/10">{fullSyllabus.find(s=>s.id===id)?.title || 'Ch'}</span>)}
                        {m.selectedChapters && m.selectedChapters.length > 3 && <span className="text-[9px] font-black text-white/80 mt-1">+{m.selectedChapters.length - 3}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>

        {/* RIGHT CALENDAR */}
        <div className="custom-calendar relative p-4 h-full flex-1 flex flex-col z-0 overflow-hidden w-full">
          <style>{`
            .custom-calendar .fc { --fc-border-color: rgba(148, 163, 184, 0.2); --fc-button-bg-color: rgba(59, 130, 246, 0.1); --fc-button-border-color: transparent; --fc-button-hover-bg-color: rgba(59, 130, 246, 0.2); --fc-button-active-bg-color: rgba(59, 130, 246, 0.3); --fc-today-bg-color: rgba(59, 130, 246, 0.05); height: 100%; width: 100%;}
            .custom-calendar .fc-toolbar-title { font-size: 1.25rem; font-weight: 800; color: inherit; }
            .custom-calendar .fc-col-header-cell { padding: 12px 0; font-size: 0.8rem; text-transform: uppercase; font-weight: 800; opacity: 0.7; }
            .custom-calendar .fc-daygrid-day-number { width: 100%; padding: 0; }
            
            .custom-calendar .fc-daygrid-day-top { display: flex !important; flex-direction: row; justify-content: space-between; width: 100%; margin-bottom: 6px; }
            
            .custom-calendar .fc-daygrid-event-harness { margin-top: 4px; }
            .custom-calendar .fc-event { background: transparent; border: none; padding: 0; margin-bottom: 4px !important; }
            .custom-calendar .fc-daygrid-day-events { padding: 0 6px !important; }
            .fc-scrollgrid-sync-table { height: 100% !important; }
            .fc-view-harness { flex-grow: 1; overflow: hidden; }
            
            .custom-calendar .fc-timegrid-now-indicator-arrow { display: none; }
            .custom-calendar .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; }
            .custom-calendar .fc-timegrid-now-indicator-line::before {
               content: var(--current-time, "");
               position: absolute; left: -42px; top: -10px;
               background: #ef4444; color: white; font-size: 10px;
               padding: 2px 6px; border-radius: 4px; font-weight: bold;
               z-index: 50;
            }

            /*  MOBILE FIXES  */
            @media (max-width: 768px) {
              .custom-calendar { overflow-x: auto; padding-bottom: 10px; }
              /* Force min-width so tiles don't squish, and explicitly draw bottom border */
              .fc-scrollgrid { min-width: 800px !important; border-bottom: 1px solid var(--fc-border-color) !important; }
              .fc-view-harness { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
            }
          `}</style>
          <div className="w-full h-full">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView} 
              headerToolbar={false} 
              events={events}
              eventContent={renderEventContent} 
              dayMaxEvents={3} 
              datesSet={(arg) => { setCalendarTitle(arg.view.title); setCurrentRenderDate(arg.view.currentStart); }} 
              dateClick={handleDateClick}
              eventClick={(arg) => openAddModal(arg.event.startStr, events.find(e => e.id === arg.event.id))}
              dayCellContent={currentView === 'dayGridMonth' ? renderMonthCell : undefined}
              dayHeaderContent={renderHeaderContent}
              moreLinkClick={(arg) => { triggerDailyModal(formatLocalYMD(arg.date)); return 'prevent'; }}
              allDaySlot={false} slotDuration="01:00:00" slotMinTime="00:00:00" slotMaxTime="24:00:00" nowIndicator={true} height="auto"
              scrollTime={new Date(Date.now() - 3600000).toTimeString().split(' ')[0]}
            />
          </div>
        </div>
      </div>

      {/* --- MOCK TEST HISTORY MODAL --- */}
      {isMockHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] flex justify-center items-center p-4">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full max-w-4xl rounded-[32px] shadow-2xl p-8 border border-white/20 relative max-h-[90vh] flex flex-col">
             <button onClick={() => setIsMockHistoryOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={24} /></button>
             <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800 dark:text-white">
               <History className="text-red-500"/> Mock Test History & Analytics
             </h3>
             
             <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 pr-2">
                {mocks.length === 0 ? (
                   <div className="text-center text-slate-500 font-bold py-10 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl">No mock tests recorded yet. Start giving tests!</div>
                ) : (
                   mocks.sort((a,b) => new Date(b.date) - new Date(a.date)).map(m => (
                      <div key={m.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 md:items-center justify-between ${getMockBoxBgClass(m)}`}>
                         <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                               <span className="text-lg font-black">{m.name}</span>
                               {m.isCompleted && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-sm ${getScorePillClass(m)}`}>{m.score}/{m.type === 'JEE Mains' ? 300 : 360}</span>}
                            </div>
                            <div className="text-xs font-bold opacity-80 flex gap-3 flex-wrap">
                               <span>📅 {m.date}</span>
                               <span>⏱️ {m.start} - {m.end}</span>
                               <span>🎯 {m.type}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                               {m.selectedChapters?.map(id => <span key={id} className="bg-black/10 dark:bg-white/10 text-[10px] font-bold px-2 py-1 rounded-md border border-black/5 dark:border-white/5">{fullSyllabus.find(s=>s.id===id)?.title || 'Ch'}</span>)}
                            </div>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => { setIsMockHistoryOpen(false); openMockModal(m); }} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-colors"><Pencil size={16} className="text-slate-500" /></button>
                           <button onClick={() => deleteMock(m.id)} className="p-2 hover:bg-red-600 hover:text-white rounded-xl transition-colors"><Trash2 size={16} className="text-slate-500 hover:text-white" /></button>
                         </div>
                      </div>
                   ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* --- MOCK SCORE MODAL --- */}
      {isScoreModalOpen && activeMockForScore && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] flex justify-center items-center p-4">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full max-w-sm rounded-[32px] shadow-2xl p-8 border border-white/20 relative animate-in zoom-in-95">
               <button onClick={() => setIsScoreModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={24} /></button>
               <h3 className="text-2xl font-black mb-2 text-slate-800 dark:text-white flex items-center gap-2"><Target className="text-green-500"/> Log Score</h3>
               <p className="text-sm font-bold text-slate-500 mb-8">{activeMockForScore.name} ({activeMockForScore.type})</p>
               
               <div className="mb-10">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Marks Scored</label>
                  <div className="flex items-center justify-center gap-4 bg-slate-100/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full overflow-hidden shadow-inner">
                     <input type="number" placeholder="0" value={tempScore} onChange={e=>setTempScore(e.target.value)} className="w-24 bg-transparent text-4xl font-black text-center focus:outline-none text-slate-900 dark:text-white appearance-none" />
                     <div className="w-px h-10 bg-slate-300 dark:bg-slate-600"></div>
                     <span className="text-2xl font-black text-slate-400 whitespace-nowrap">/ {activeMockForScore.type === 'JEE Mains' ? 300 : 360}</span>
                  </div>
               </div>
               
               <button onClick={handleMockScoreSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-transform active:scale-95">Submit Result</button>
            </div>
         </div>
      )}

      {/* --- PRO MOCK TEST CREATION MODAL --- */}
      {isMockModalOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-center p-4">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full max-w-xl rounded-[32px] shadow-2xl p-8 border border-white/20 max-h-[90vh] overflow-y-auto hide-scrollbar relative">
             <button onClick={() => setIsMockModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={24} /></button>
             <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800 dark:text-white"><Target className="text-blue-500"/> {mockEditId ? 'Edit Mock Test' : 'Schedule Mock Test'}</h3>
             
             {openDropdown && <div className="fixed inset-0 z-[290]" onClick={() => setOpenDropdown(null)}></div>}

             <div className="space-y-5 relative">
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mock Name *</label>
                   <input type="text" placeholder="e.g. AITS-1 or Part Test 4" value={mockForm.name} onChange={e=>setMockForm({...mockForm, name: e.target.value})} className="w-full bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white focus:outline-none transition-shadow shadow-sm" />
                </div>

                <div className="flex gap-4">
                  <CustomDropdown label="Date" value={mockForm.date} options={NEXT_14_DAYS} typeKey="date" onChange={(v) => setMockForm({...mockForm, date: v})} />
                  <CustomDropdown label="Type" value={mockForm.type} options={['JEE Mains', 'JEE Advanced']} typeKey="type" onChange={(v) => setMockForm({...mockForm, type: v})} />
                </div>

                <div className="flex gap-4">
                  <CustomDropdown label="Start Time" value={mockForm.start} options={TIME_OPTIONS} typeKey="start" onChange={(v) => setMockForm({...mockForm, start: v})} />
                  <CustomDropdown label="End Time" value={mockForm.end} options={TIME_OPTIONS} typeKey="end" onChange={(v) => setMockForm({...mockForm, end: v})} />
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Syllabus Covered</label>
                   
                   <div className="flex gap-2 mb-3">
                     {['Physics', 'Chemistry', 'Mathematics'].map(subj => (
                        <button type="button" key={subj} onClick={() => setMockSubjectTab(mockSubjectTab === subj ? null : subj)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${mockSubjectTab === subj ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'}`}>{subj}</button>
                     ))}
                   </div>

                   {mockSubjectTab && (
                      <div className="bg-slate-100/80 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-[200px] overflow-y-auto mb-3 hide-scrollbar shadow-inner">
                         {fullSyllabus.filter(s=>s.subject === mockSubjectTab).map(ch => (
                            <label key={ch.id} className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                               <input type="checkbox" checked={mockForm.selectedChapters?.includes(ch.id)} onChange={(e) => {
                                  if(e.target.checked) setMockForm({...mockForm, selectedChapters: [...(mockForm.selectedChapters||[]), ch.id]});
                                  else setMockForm({...mockForm, selectedChapters: mockForm.selectedChapters.filter(id=>id!==ch.id)});
                               }} className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"/>
                               <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{ch.title}</span>
                            </label>
                         ))}
                         {fullSyllabus.filter(s=>s.subject === mockSubjectTab).length === 0 && <p className="text-xs text-slate-500 font-bold text-center py-2">No chapters found in syllabus tracker.</p>}
                      </div>
                   )}

                   <div className="flex flex-wrap gap-2 mt-2">
                     {mockForm.selectedChapters?.map(id => {
                        const ch = fullSyllabus.find(s=>s.id === id);
                        return <span key={id} className="bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">{ch?.title || 'Unknown'}</span>
                     })}
                     {(!mockForm.selectedChapters || mockForm.selectedChapters.length === 0) && <span className="text-xs text-slate-400 font-medium italic">No chapters selected.</span>}
                   </div>
                </div>

                <button type="button" onClick={saveMockTest} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-transform active:scale-95">Save Mock Test</button>
             </div>
          </div>
        </div>
      )}


              
      {/* TASK MODAL WITH 9 COLORS */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex justify-center items-center p-4">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-white/20 dark:border-white/10 text-slate-800 dark:text-white relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={24} /></button>
            <h3 className="text-2xl font-black mb-8 tracking-tight flex items-center gap-3"><CalIcon className="text-blue-500"/> {editingId ? 'Edit Task' : 'New Task'}</h3>
            
            <div className="mb-6">
              <input type="text" placeholder="Task Name (e.g. Solve Irodov)" value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>

            <div className="flex bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-4 mb-6 border border-slate-200 dark:border-slate-700/50 h-[150px]">
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] mb-2">START</span>
                <div className="w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex-1 relative">
                  <div className="h-[40px]"></div>
                  {TIME_OPTIONS.map(time => (<div key={`start-${time}`} onClick={() => setStartTime(time)} className={`h-[40px] flex items-center justify-center snap-center cursor-pointer transition-all ${startTime === time ? 'text-blue-600 dark:text-white text-xl font-black bg-white dark:bg-white/10 rounded-xl shadow-sm border border-slate-200 dark:border-transparent' : 'text-slate-400 text-sm font-bold hover:text-slate-600 dark:hover:text-slate-300'}`}>{time}</div>))}
                  <div className="h-[40px]"></div>
                </div>
              </div>
              <div className="w-px bg-slate-200 dark:bg-slate-700 mx-4 my-4"></div>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] mb-2">END</span>
                <div className="w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex-1 relative">
                  <div className="h-[40px]"></div>
                  {TIME_OPTIONS.map(time => (<div key={`end-${time}`} onClick={() => setEndTime(time)} className={`h-[40px] flex items-center justify-center snap-center cursor-pointer transition-all ${endTime === time ? 'text-blue-600 dark:text-white text-xl font-black bg-white dark:bg-white/10 rounded-xl shadow-sm border border-slate-200 dark:border-transparent' : 'text-slate-400 text-sm font-bold hover:text-slate-600 dark:hover:text-slate-300'}`}>{time}</div>))}
                  <div className="h-[40px]"></div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[11px] font-black text-slate-400 tracking-widest uppercase mb-3 block">Subject</label>
              <div className="flex gap-2">
                {['Physics', 'Chemistry', 'Mathematics'].map(sub => (
                  <button type="button" key={sub} onClick={() => { setSubject(sub); setLinkedChapterTitle(''); }} className={`flex-1 py-3 rounded-2xl text-xs font-extrabold border transition-colors ${subject === sub ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {sub === 'Mathematics' ? 'Maths' : sub}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[11px] font-black text-slate-400 tracking-widest uppercase mb-3 flex justify-between">
                <span>Linked Chapter</span>
                <span className="text-slate-400 normal-case font-semibold tracking-normal">Optional</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableChapters.length === 0 ? (
                  <div className="w-full text-center p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500 font-bold">
                    No {subject} chapters mapped for this month. Add from sidebar!
                  </div>
                ) : (
                  availableChapters.map(ch => (
                    <button type="button" key={ch.id} onClick={() => setLinkedChapterTitle(linkedChapterTitle === ch.title ? '' : ch.title)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${linkedChapterTitle === ch.title ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/50 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      {ch.title}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mb-10">
              <label className="text-[11px] font-black text-slate-400 tracking-widest uppercase mb-3 block">Task Color</label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(TASK_COLORS).map(([key, vals]) => (
                  <button 
                    type="button" 
                    key={key} 
                    onClick={() => setTaskColorKey(key)} 
                    className={`w-8 h-8 rounded-full shadow-sm transition-all border-2 ${taskColorKey === key ? 'ring-4 ring-offset-2 dark:ring-offset-[#0f172a] scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} 
                    style={{ backgroundColor: vals.bg, borderColor: vals.border }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleSaveTask} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-blue-500/30">
                {editingId ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TILE CLICK MODAL WITH SEPARATORS */}
      {dailyModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] flex justify-center items-center p-4" onClick={() => setDailyModal({ ...dailyModal, isOpen: false })}>
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full max-w-lg rounded-[32px] p-8 shadow-2xl border border-white/20 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Schedule for {new Date(dailyModal.dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
              <div className="flex gap-3">
                <button type="button" onClick={() => openAddModal(dailyModal.dateStr)} className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-full transition-colors"><Plus size={20} /></button>
                <button type="button" onClick={() => setDailyModal({ ...dailyModal, isOpen: false })} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors"><X size={20} /></button>
              </div>
            </div>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar">
              
              <div>
                 <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">Daily Tasks</h4>
                 <div className="space-y-3">
                   {dailyModal.tasks.length === 0 ? <p className="text-slate-500 text-center py-4 font-bold text-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">No tasks scheduled.</p> : (
                     dailyModal.tasks.sort((a,b) => (a.start||'').localeCompare(b.start||'')).map(task => {
                       const k = task.colorKey || 'blue';
                       const isDone = task.extendedProps?.done !== undefined ? task.extendedProps.done : task.done;
                       const c = TASK_COLORS[k] || TASK_COLORS.blue;
                       return (
                         <div key={task.id} style={{ backgroundColor: c.bg, borderLeft: `5px solid ${c.border}` }} className={`flex justify-between items-center p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.02] ${isDone ? 'opacity-50' : ''}`}>
                           <div className={`font-extrabold text-[14px] ${isDone ? 'line-through' : ''}`} style={{ color: c.text }}>{task.title}</div>
                           <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black px-2 py-1 rounded-lg opacity-80 bg-black/10" style={{ color: c.text }}>{extractTime(task.start, '00:00')} - {extractTime(task.end, '00:00')}</span>
                             <div className="flex gap-1 ml-2">
                               <button type="button" onClick={() => openAddModal(task.start, task)} className="p-1.5 hover:bg-black/10 rounded-xl transition-colors"><Pencil size={14} color={c.text} /></button>
                               <button type="button" onClick={() => deleteTask(task.id)} className="p-1.5 hover:bg-red-500 hover:text-white rounded-xl transition-colors"><Trash2 size={14} color={c.text} /></button>
                             </div>
                           </div>
                         </div>
                       );
                     })
                   )}
                 </div>
              </div>

              {dailyModal.dayMocks && dailyModal.dayMocks.length > 0 && (
                <div>
                   <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-3 border-b border-red-200 dark:border-red-900/30 pb-2">Scheduled Mocks</h4>
                   <div className="space-y-3">
                      {dailyModal.dayMocks.sort((a,b) => (a.start||'').localeCompare(b.start||'')).map(m => (
                          <div key={m.id} className="flex justify-between items-center p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.02] bg-white/30 dark:bg-black/20 border border-white/30 dark:border-white/5">
                             <div className="font-extrabold text-[14px] text-slate-800 dark:text-white">{m.name}</div>
                             <div className="flex items-center gap-3">
                               <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">{m.start} - {m.end}</span>
                               <div className="flex gap-1 ml-2">
                                 <button type="button" onClick={() => openMockModal(m)} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-colors"><Pencil size={14} className="text-slate-500" /></button>
                                 <button type="button" onClick={() => deleteMock(m.id)} className="p-1.5 hover:bg-red-600 hover:text-white rounded-xl transition-colors"><Trash2 size={14} className="text-slate-500 hover:text-white" /></button>
                               </div>
                             </div>
                          </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}      
    </div>
      {/* --- CHAPTERS MAPPING MODAL --- */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-center p-4">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full max-w-5xl rounded-[32px] p-8 shadow-2xl border border-white/20 dark:border-white/10 text-slate-800 dark:text-white relative flex flex-col max-h-[85vh]">
            <button onClick={() => setIsChapterModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={24} /></button>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Map Chapters to {currentRenderDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <p className="text-sm font-semibold text-slate-500 mb-8">Check or uncheck chapters to add/remove them from this month's goals.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 gap-0">
                {['Physics', 'Chemistry', 'Mathematics'].map((subj, idx) => {
                  const subjChapters = fullSyllabus.filter(c => c.subject === subj);
                  return (
                    <div key={subj} className={`${idx !== 0 ? 'md:pl-8 pt-6 md:pt-0' : 'pr-0 md:pr-8'} ${idx === 1 ? 'md:pr-8' : ''}`}>
                      <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">{subj}</h4>
                      <div className="grid gap-2 overflow-y-auto max-h-[50vh] hide-scrollbar pr-2">
                        {subjChapters.map(ch => {
                          const isSelected = pendingSelection.includes(ch.id);
                          return (
                            <div key={ch.id} onClick={() => toggleChapterSelection(ch.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-100/50 dark:bg-slate-800/30 border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/60'}`}>
                              {isSelected ? <CheckSquare size={18} className="text-blue-500 flex-shrink-0" /> : <Square size={18} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />}
                              <span className={`text-sm font-bold leading-tight ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{ch.title}</span>
                            </div>
                          )
                        })}
                        {subjChapters.length === 0 && <div className="text-sm font-semibold text-slate-400 py-4 text-center">No chapters in syllabus yet.</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {fullSyllabus.length === 0 && <div className="text-center text-slate-500 font-bold py-8 mt-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl">Your syllabus is empty. Add chapters in the Syllabus tab first.</div>}
            </div>
            
            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button onClick={handleSaveMonthlyChapters} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold py-4 px-10 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-blue-500/30">
                Save Selected Chapters
              </button>
            </div>
          </div>
        </div>
      )}
     </>
  );
}
