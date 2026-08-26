import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  Settings, 
  Bell,
  Menu,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  AlignLeft,
  Trash2,
  X
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  subWeeks, 
  addWeeks, 
  subDays, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  getDaysInMonth, 
  getDay, 
  isSameMonth 
} from 'date-fns';

type ViewType = 'day' | 'week';

type CalendarColor = 'blue' | 'purple' | 'orange' | 'green' | 'red';

type CalendarType = {
  id: string;
  name: string;
  color: CalendarColor;
  visible: boolean;
};

type EventType = {
  id: string;
  title: string;
  date: Date;
  startHour: number; // 0-24
  duration: number; // hours
  calendarId: string;
  location?: string;
};

const COLOR_MAP: Record<CalendarColor, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900 ring-blue-400 hover:border-blue-300 hover:shadow-md',
  purple: 'bg-purple-50 border-purple-200 text-purple-900 ring-purple-400 hover:border-purple-300 hover:shadow-md',
  orange: 'bg-orange-50 border-orange-200 text-orange-900 ring-orange-400 hover:border-orange-300 hover:shadow-md',
  green: 'bg-green-50 border-green-200 text-green-900 ring-green-400 hover:border-green-300 hover:shadow-md',
  red: 'bg-red-50 border-red-200 text-red-900 ring-red-400 hover:border-red-300 hover:shadow-md',
};

const DOT_MAP: Record<CalendarColor, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
};

const INITIAL_CALENDARS: CalendarType[] = [
  { id: 'c1', name: 'Work', color: 'blue', visible: true },
  { id: 'c2', name: 'Personal', color: 'purple', visible: true },
  { id: 'c3', name: 'Design Team', color: 'orange', visible: true },
];

const INITIAL_EVENTS: EventType[] = [
  { id: 'e1', title: 'Weekly Sync', date: new Date(), startHour: 10, duration: 1, calendarId: 'c1' },
  { id: 'e2', title: 'Design Review: Dashboard', date: new Date(), startHour: 13.5, duration: 1.5, calendarId: 'c3' },
  { id: 'e3', title: 'Lunch with Sarah', date: new Date(), startHour: 12, duration: 1, calendarId: 'c2' },
  { id: 'e4', title: 'Deep Work', date: addDays(new Date(), 1), startHour: 9, duration: 2.5, calendarId: 'c1' },
  { id: 'e5', title: 'Doctor Appointment', date: addDays(new Date(), 2), startHour: 15, duration: 1, calendarId: 'c2' },
];

export default function Timeblock() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [calendars, setCalendars] = useState(INITIAL_CALENDARS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [miniMonthDate, setMiniMonthDate] = useState(new Date());
  
  // Handlers
  const handlePrev = () => {
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  
  const handleNext = () => {
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
    setMiniMonthDate(new Date());
  };

  const toggleCalendar = (id: string) => {
    setCalendars(cals => cals.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const handleGridClick = (date: Date, hour: number) => {
    const newEvent: EventType = {
      id: Math.random().toString(36).substring(7),
      title: 'New Event',
      date,
      startHour: hour,
      duration: 1,
      calendarId: 'c1'
    };
    setEvents([...events, newEvent]);
    setSelectedEventId(newEvent.id);
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    setSelectedEventId(null);
  };

  const visibleEvents = events.filter(e => calendars.find(c => c.id === e.calendarId)?.visible);

  // Derived dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const displayDays = view === 'week' ? weekDays : [currentDate];
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  // Mini calendar logic
  const monthStart = startOfMonth(miniMonthDate);
  const daysInMonth = getDaysInMonth(monthStart);
  const startDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1; // 0 is Monday
  const miniDays = Array.from({ length: 42 }).map((_, i) => {
    const dayOffset = i - startDayOfWeek;
    return addDays(monthStart, dayOffset);
  });

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans text-slate-900 overflow-hidden border border-slate-200">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-white z-20">
        <div className="flex items-center gap-4">
          <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleToday}>
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Timeblock</span>
          </div>
          
          <div className="h-4 w-px bg-slate-200 mx-2" />
          
          <div className="flex items-center gap-1">
            <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium hover:bg-slate-100 rounded-md border border-slate-200 transition-colors">
              Today
            </button>
            <div className="flex items-center ml-1 border border-slate-200 rounded-md overflow-hidden">
              <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 text-slate-600 border-r border-slate-200 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="ml-3 text-lg font-semibold tracking-tight text-slate-800">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => setView('day')} 
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setView('week')} 
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${view === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Week
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 relative transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-medium text-sm ml-1 hover:bg-indigo-200 transition-colors">
            JV
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
          <div className="p-4 border-b border-slate-200 bg-white">
            <button 
              onClick={() => handleGridClick(currentDate, 9)}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>

          <div className="p-4 bg-white border-b border-slate-200">
            {/* Mini Calendar */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-slate-800">{format(miniMonthDate, 'MMMM yyyy')}</span>
              <div className="flex">
                <button onClick={() => setMiniMonthDate(subMonths(miniMonthDate, 1))} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setMiniMonthDate(addMonths(miniMonthDate, 1))} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 gap-x-1">
              {miniDays.map((date, i) => {
                const isCurrentMonth = isSameMonth(date, miniMonthDate);
                const isToday = isSameDay(date, new Date());
                const isSelected = isSameDay(date, currentDate);
                
                return (
                  <button 
                    key={i}
                    onClick={() => {
                      setCurrentDate(date);
                      setMiniMonthDate(date);
                    }}
                    className={`
                      h-7 w-7 rounded-full text-xs flex items-center justify-center transition-all
                      ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}
                      ${isSelected ? 'bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200' : ''}
                      ${isToday && !isSelected ? 'bg-slate-900 text-white font-semibold hover:bg-slate-800' : ''}
                    `}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto hide-scrollbar">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">My Calendars</h3>
            <div className="space-y-1">
              {calendars.map(cal => {
                const dotColor = DOT_MAP[cal.color];
                return (
                  <label key={cal.id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-200/50 rounded-md cursor-pointer group transition-colors">
                    <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors
                      ${cal.visible ? dotColor + ' border-transparent text-white' : 'border-slate-300 bg-white'}`}
                    >
                      {cal.visible && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={cal.visible} onChange={() => toggleCalendar(cal.id)} />
                    <span className="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">{cal.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Calendar Area */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
          
          {/* Calendar Header (Days) */}
          <div className="flex border-b border-slate-200 bg-white shrink-0 pl-16">
            {displayDays.map((day, i) => (
              <div 
                key={i} 
                className="flex-1 py-3 text-center border-l border-slate-100 first:border-l-0 relative group cursor-pointer hover:bg-slate-50 transition-colors" 
                onClick={() => { setView('day'); setCurrentDate(day); }}
              >
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-500'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-2xl font-light w-10 h-10 mx-auto flex items-center justify-center rounded-full transition-colors ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : 'text-slate-900 group-hover:bg-slate-200'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* All Day Event row */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0">
            <div className="w-16 border-r border-slate-200 text-[10px] text-slate-400 font-medium p-2 text-right">
              all-day
            </div>
            <div className="flex-1 flex">
              {displayDays.map((day, i) => (
                <div key={i} className="flex-1 border-l border-slate-100 first:border-l-0 p-1 min-h-[32px]">
                  {/* Empty all day area */}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Grid */}
          <div className="flex-1 overflow-y-auto relative hide-scrollbar scroll-smooth">
            <div className="flex min-h-[1440px]"> {/* 24 hours * 60px */}
              
              {/* Time axis */}
              <div className="w-16 shrink-0 border-r border-slate-200 relative bg-white z-10">
                {hours.map(hour => (
                  <div key={hour} className="h-[60px] relative border-b border-transparent">
                    {hour > 0 && (
                      <span className="absolute -top-2.5 right-2 text-xs text-slate-400 font-medium bg-white px-1">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Grid content */}
              <div className="flex-1 flex relative">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {hours.map(hour => (
                    <div key={hour} className="h-[60px] border-b border-slate-100 box-border w-full" />
                  ))}
                </div>

                {/* Vertical day columns */}
                {displayDays.map((day, dayIndex) => {
                  const dayEvents = visibleEvents.filter(e => isSameDay(e.date, day));
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className="flex-1 relative border-l border-slate-100 first:border-l-0 group"
                    >
                      {/* Clickable slots */}
                      {hours.map(hour => (
                        <div 
                          key={hour} 
                          className="h-[60px] hover:bg-blue-50/30 cursor-pointer transition-colors"
                          onClick={() => handleGridClick(day, hour)}
                        />
                      ))}
                      
                      {/* Events for this day */}
                      {dayEvents.map(event => {
                        const calendar = calendars.find(c => c.id === event.calendarId);
                        const styleClasses = calendar ? COLOR_MAP[calendar.color] : COLOR_MAP.blue;
                        const top = event.startHour * 60;
                        const height = event.duration * 60;
                        const isSelected = selectedEventId === event.id;
                        
                        return (
                          <div 
                            key={event.id}
                            className={`absolute left-0 right-0 mx-1 rounded-md border p-2 overflow-hidden transition-all cursor-pointer z-10
                              ${styleClasses}
                              ${isSelected ? `ring-2 ring-offset-1 z-20 shadow-md` : ''}
                            `}
                            style={{ top: `${top}px`, height: `${height}px` }}
                            onClick={(e) => { e.stopPropagation(); setSelectedEventId(event.id); }}
                          >
                            <div className="text-xs font-semibold leading-tight truncate">{event.title}</div>
                            {height >= 45 && (
                              <div className="text-[10px] opacity-80 mt-0.5 truncate font-medium">
                                {Math.floor(event.startHour)}:{event.startHour % 1 === 0.5 ? '30' : '00'} - {Math.floor(event.startHour + event.duration)}:{(event.startHour + event.duration) % 1 === 0.5 ? '30' : '00'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Current time indicator line (if today) */}
                      {isSameDay(day, new Date()) && (
                        <div 
                          className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                          style={{ top: `${(new Date().getHours() * 60) + new Date().getMinutes()}px` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 absolute -left-1 -top-[3px]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Selected Event Sidebar/Flyout */}
        {selectedEventId && (
          <div className="w-80 border-l border-slate-200 bg-white shadow-xl z-30 shrink-0 flex flex-col animate-in slide-in-from-right-8 duration-200">
            {(() => {
              const event = events.find(e => e.id === selectedEventId);
              if (!event) return null;
              const cal = calendars.find(c => c.id === event.calendarId);
              const dotColor = cal ? DOT_MAP[cal.color] : DOT_MAP.blue;
              
              return (
                <>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-sm ${dotColor}`} />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cal?.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteEvent(event.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete event">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSelectedEventId(null)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors" title="Close">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col gap-6">
                    <div>
                      <input 
                        type="text" 
                        value={event.title}
                        onChange={(e) => setEvents(events.map(ev => ev.id === event.id ? { ...ev, title: e.target.value } : ev))}
                        className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none w-full placeholder:text-slate-300 focus:bg-slate-50 rounded px-1 -ml-1 transition-colors"
                        placeholder="Event title"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-5">
                      <div className="flex gap-3 text-slate-600">
                        <Clock className="w-5 h-5 shrink-0 text-slate-400" />
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">
                            {format(event.date, 'EEEE, MMMM d')}
                          </div>
                          <div className="mt-0.5 text-slate-500">
                            {Math.floor(event.startHour)}:{event.startHour % 1 === 0.5 ? '30' : '00'} to {Math.floor(event.startHour + event.duration)}:{(event.startHour + event.duration) % 1 === 0.5 ? '30' : '00'} ({event.duration}h)
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 text-slate-600 items-center">
                        <MapPin className="w-5 h-5 shrink-0 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Add location" 
                          className="text-sm bg-transparent border-none outline-none w-full hover:bg-slate-50 focus:bg-slate-50 rounded px-1 -ml-1 py-0.5 transition-colors placeholder:text-slate-400"
                        />
                      </div>
                      
                      <div className="flex gap-3 text-slate-600 items-start">
                        <Users className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
                        <div className="w-full">
                          <input 
                            type="text" 
                            placeholder="Add guests" 
                            className="text-sm bg-transparent border-none outline-none w-full hover:bg-slate-50 focus:bg-slate-50 rounded px-1 -ml-1 py-0.5 transition-colors mb-2 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 text-slate-600 items-center">
                        <Video className="w-5 h-5 shrink-0 text-slate-400" />
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors w-full text-left">
                          Add Video Conferencing
                        </button>
                      </div>
                      
                      <div className="flex gap-3 text-slate-600 items-start">
                        <AlignLeft className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
                        <textarea 
                          placeholder="Add description or attachments" 
                          className="text-sm bg-transparent border-none outline-none w-full hover:bg-slate-50 focus:bg-slate-50 rounded px-1 -ml-1 py-1 transition-colors min-h-[100px] resize-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                    <button 
                      onClick={() => setSelectedEventId(null)}
                      className="w-full bg-slate-900 text-white font-medium text-sm py-2 rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      Save Event
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
