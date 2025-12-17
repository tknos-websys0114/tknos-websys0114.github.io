import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, AlignLeft, Calendar, Check, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, STORES } from '../../utils/db';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  description: string;
  color: string;
}

const COLORS = [
  '#FFD1DC', // Pastel Pink
  '#D4E0D6', // Pastel Green
  '#CCE5FF', // Pastel Blue
  '#FFF5BA', // Pastel Yellow
  '#E6E6FA', // Lavender
];

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Event Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventColor, setNewEventColor] = useState(COLORS[0]);

  useEffect(() => {
    loadEvents();
    // Default select today
    const today = new Date();
    setSelectedDate(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  }, []);

  const loadEvents = async () => {
    const savedEvents = await db.get<CalendarEvent[]>(STORES.SCHEDULE, 'events');
    if (savedEvents) {
      // Auto cleanup: Remove events before today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 00:00:00 today

      const validEvents = savedEvents.filter(event => {
        const [y, m, d] = event.date.split('-').map(Number);
        const eventDate = new Date(y, m - 1, d);
        return eventDate >= today;
      });

      if (validEvents.length !== savedEvents.length) {
        await db.set(STORES.SCHEDULE, 'events', validEvents);
        setEvents(validEvents);
      } else {
        setEvents(savedEvents);
      }
    }
  };

  const saveEvents = async (newEvents: CalendarEvent[]) => {
    await db.set(STORES.SCHEDULE, 'events', newEvents);
    setEvents(newEvents);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day: number) => {
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(dateKey);
  };

  const handleStartAdd = () => {
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventLocation('');
    setIsAllDay(false);
    setStartTime('09:00');
    setEndTime('10:00');
    setNewEventColor(COLORS[0]);
    setShowAddModal(true);
  };

  const handleStartEdit = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventDesc(event.description || '');
    setNewEventLocation(event.location || '');
    setIsAllDay(event.isAllDay);
    setStartTime(event.startTime || '09:00');
    setEndTime(event.endTime || '10:00');
    setNewEventColor(event.color);
    setShowAddModal(true);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    // Basic validation
    if (!isAllDay && startTime >= endTime) {
        alert('结束时间必须晚于开始时间');
        return;
    }

    const eventData: CalendarEvent = {
      id: editingEventId || Date.now().toString(),
      title: newEventTitle,
      date: selectedDate,
      isAllDay,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      location: newEventLocation,
      description: newEventDesc,
      color: newEventColor,
    };

    let updatedEvents;
    if (editingEventId) {
      updatedEvents = events.map(e => e.id === editingEventId ? eventData : e);
    } else {
      updatedEvents = [...events, eventData];
    }

    await saveEvents(updatedEvents);
    setShowAddModal(false);
  };

  const handleDeleteEvent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering edit
    if (confirm('确定要撕掉这张日程贴纸吗？')) {
      const updatedEvents = events.filter(e => e.id !== id);
      await saveEvents(updatedEvents);
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[3rem] sm:min-h-[4rem]" />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const dayEvents = events.filter(e => e.date === dateKey);
      const isSelected = selectedDate === dateKey;
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div 
          key={day} 
          onClick={() => handleDateClick(day)}
          className="relative min-h-[3rem] sm:min-h-[4rem] flex flex-col items-center pt-1 cursor-pointer active:scale-95 transition-transform duration-100 group"
        >
          <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-all z-10 ${
            isSelected 
              ? 'bg-[#5A5A5A] text-white shadow-md scale-110' 
              : isToday 
                ? 'bg-[#FFD1DC] text-[#5A5A5A]' 
                : 'text-[#5A5A5A] group-hover:bg-[#5A5A5A]/5'
          }`}>
            {day}
          </div>
          
          {/* Event Dots */}
          <div className="flex gap-0.5 sm:gap-1 mt-1 flex-wrap justify-center px-1">
            {dayEvents.slice(0, 4).map((e, i) => (
              <div 
                key={i} 
                className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full" 
                style={{ backgroundColor: e.color }}
              />
            ))}
            {dayEvents.length > 4 && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gray-300" />}
          </div>
        </div>
      );
    }
    return days;
  };

  const selectedDayEvents = selectedDate 
    ? events
        .filter(e => e.date === selectedDate)
        .sort((a, b) => {
            if (a.isAllDay && !b.isAllDay) return -1;
            if (!a.isAllDay && b.isAllDay) return 1;
            if (a.isAllDay && b.isAllDay) return 0;
            return (a.startTime || '').localeCompare(b.startTime || '');
        })
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F9F7F2]">
      {/* Calendar Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="p-2 active:bg-[#5A5A5A]/10 active:scale-90 rounded-full transition-all duration-200">
          <ChevronLeft className="w-5 h-5 text-[#5A5A5A]" />
        </button>
        <h2 className="text-lg font-bold text-[#5A5A5A] tracking-widest">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h2>
        <button onClick={() => changeMonth(1)} className="p-2 active:bg-[#5A5A5A]/10 active:scale-90 rounded-full transition-all duration-200">
          <ChevronRight className="w-5 h-5 text-[#5A5A5A]" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 px-4 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-[#9A9A9A]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar">
        <div className="grid grid-cols-7 gap-y-2 mb-6 bg-white p-2 rounded-2xl border-2 border-dashed border-[#5A5A5A]/10 shadow-sm">
          {renderCalendar()}
        </div>

        {/* Selected Date Events */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 px-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[#5A5A5A] font-bold border-l-4 border-[#5A5A5A] pl-2">
                  {selectedDate}
                </h3>
                <button 
                  onClick={handleStartAdd}
                  className="flex items-center gap-1 text-xs font-bold bg-[#5A5A5A] text-white px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform duration-200"
                >
                  <Plus className="w-3 h-3" />
                  记一笔
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-[#999] text-sm italic opacity-60">
                  今天还没有贴任何日程贴纸哦
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(event => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleStartEdit(event)}
                      className="relative p-4 rounded-xl shadow-sm border border-black/5 flex gap-4 overflow-hidden active:scale-[0.98] transition-transform duration-150 bg-white cursor-pointer"
                    >
                      {/* Left color bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: event.color }} />
                      
                      <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-black/5 pr-4 py-1">
                        {event.isAllDay ? (
                            <span className="text-xs font-bold text-[#5A5A5A] bg-[#5A5A5A]/10 px-2 py-1 rounded">全天</span>
                        ) : (
                            <>
                                <span className="text-sm font-bold text-[#5A5A5A]">{event.startTime}</span>
                                <span className="text-xs text-[#999] mt-0.5">{event.endTime}</span>
                            </>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                        <h4 className="font-bold text-[#5A5A5A] truncate text-sm">{event.title}</h4>
                        {event.location && (
                            <div className="flex items-center gap-1 text-xs text-[#5A5A5A]/70">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{event.location}</span>
                            </div>
                        )}
                        {event.description && (
                          <p className="text-xs text-[#5A5A5A]/50 truncate">{event.description}</p>
                        )}
                      </div>

                      <button 
                        onClick={(e) => handleDeleteEvent(e, event.id)}
                        className="absolute top-2 right-2 p-2 text-[#5A5A5A]/30 active:text-[#FF6B6B] active:scale-110 transition-all z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/20 backdrop-blur-[2px]">
            {/* Backdrop click handler */}
            <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />
            
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="bg-[#FDFBF7] w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 border-t-2 sm:border-2 border-[#5A5A5A]/10 relative z-10"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-2 bg-[#F5F5F5] rounded-full active:scale-90 transition-transform"
              >
                <X className="w-4 h-4 text-[#5A5A5A]" />
              </button>

              <h3 className="text-lg font-bold text-[#5A5A5A] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-[#5A5A5A] rounded-full"></span>
                {editingEventId ? '修改日程' : '添加新日程'}
              </h3>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-[#999] mb-1 block">标题</label>
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full bg-white border-b-2 border-[#E0E0E0] focus:border-[#5A5A5A] px-2 py-2 outline-none transition-colors rounded-t-md"
                    placeholder="去做什么？"
                  />
                </div>

                {/* Location - NEW */}
                <div>
                    <label className="text-xs font-bold text-[#999] mb-1 block flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> 地点
                    </label>
                    <input
                    type="text"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    className="w-full bg-white border-b-2 border-[#E0E0E0] focus:border-[#5A5A5A] px-2 py-2 outline-none transition-colors rounded-t-md text-sm"
                    placeholder="在哪里？"
                    />
                </div>

                {/* All Day Toggle */}
                <div className="flex items-center gap-2 pt-1 active:opacity-60 transition-opacity" onClick={() => setIsAllDay(!isAllDay)}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAllDay ? 'bg-[#5A5A5A] border-[#5A5A5A]' : 'border-[#999]'}`}>
                        {isAllDay && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <label className="text-sm font-bold text-[#5A5A5A]">全天事件</label>
                </div>

                {/* Time Range */}
                <AnimatePresence>
                    {!isAllDay && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex gap-4 overflow-hidden"
                        >
                          <div className="flex-1">
                            <label className="text-xs font-bold text-[#999] mb-1 block flex items-center gap-1">
                              <Clock className="w-3 h-3" /> 开始
                            </label>
                            <input
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              className="w-full bg-white border-b-2 border-[#E0E0E0] focus:border-[#5A5A5A] px-2 py-2 outline-none transition-colors rounded-t-md text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-bold text-[#999] mb-1 block flex items-center gap-1">
                              <Clock className="w-3 h-3" /> 结束
                            </label>
                            <input
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="w-full bg-white border-b-2 border-[#E0E0E0] focus:border-[#5A5A5A] px-2 py-2 outline-none transition-colors rounded-t-md text-sm"
                            />
                          </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Color & Description */}
                <div>
                     <label className="text-xs font-bold text-[#999] mb-2 block">标签颜色</label>
                     <div className="flex gap-3">
                       {COLORS.map(c => (
                         <button
                           key={c}
                           onClick={() => setNewEventColor(c)}
                           className={`w-8 h-8 rounded-full border-2 transition-transform ${newEventColor === c ? 'border-[#5A5A5A] scale-110 shadow-sm' : 'border-transparent active:scale-90'}`}
                           style={{ backgroundColor: c }}
                         />
                       ))}
                     </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#999] mb-1 block flex items-center gap-1">
                    <AlignLeft className="w-3 h-3" /> 备注
                  </label>
                  <textarea
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    className="w-full bg-white border-2 border-[#F0F0F0] rounded-xl px-3 py-2 outline-none focus:border-[#5A5A5A]/30 resize-none h-20 text-sm"
                    placeholder="详细内容..."
                  />
                </div>

                <button
                  onClick={handleAddEvent}
                  className="w-full bg-[#5A5A5A] text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 active:scale-95 transition-transform duration-150"
                >
                  {editingEventId ? '修改完毕' : '贴 上'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
