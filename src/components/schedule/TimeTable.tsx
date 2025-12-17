import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, STORES } from '../../utils/db';

interface PeriodTime {
  period: number;
  startTime: string;
  endTime: string;
}

interface TimetableSettings {
  totalPeriods: number;
  showWeekends: boolean;
  periodTimes: PeriodTime[];
  startDate: string;
  totalWeeks: number;
}

// Old interface for migration
interface TimeTableCell {
  day: number;
  period: number;
  subject: string;
  room: string;
  color: string;
}

// New Course Interface
interface Course {
  id: string;
  day: number;
  startPeriod: number;
  endPeriod: number;
  subject: string;
  room: string;
  color: string;
  weeks: number[]; // Array of week numbers
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const COLORS = [
  '#FFD1DC', '#D4E0D6', '#CCE5FF', '#FFF5BA', '#E6E6FA', 
  '#FFABAB', '#FFC3A0', '#D5AAFF', '#85E3FF', '#B9FBC0'
];

const DEFAULT_SETTINGS: TimetableSettings = {
  totalPeriods: 12,
  showWeekends: true,
  periodTimes: Array.from({ length: 12 }, (_, i) => ({
    period: i + 1,
    startTime: `${8 + i}:00`,
    endTime: `${8 + i}:45`
  })),
  startDate: new Date().toISOString().split('T')[0],
  totalWeeks: 20
};

// Helper to calculate week info
const getWeekInfo = (startDateStr: string) => {
  const start = new Date(startDateStr);
  const now = new Date();
  
  // Normalize to midnight
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Find the Monday of the start week
  const startDay = startMidnight.getDay() || 7; // 1-7
  const firstMonday = new Date(startMidnight);
  firstMonday.setDate(startMidnight.getDate() - (startDay - 1));

  const diffTime = nowMidnight.getTime() - firstMonday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeek = Math.floor(diffDays / 7) + 1;

  return { currentWeek, firstMonday };
};

const getDayDate = (firstMonday: Date, weekNum: number, dayIndex: number) => {
  // dayIndex: 0=Mon, 6=Sun
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (weekNum - 1) * 7 + dayIndex);
  return `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
};

export default function TimeTable() {
  const [courses, setCourses] = useState<Course[]>([]);
  // selectedSlot is used when clicking an empty slot
  const [selectedSlot, setSelectedSlot] = useState<{day: number, period: number} | null>(null);
  // editingCourse is used when clicking an existing course
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  
  // Derived state for current week
  const { currentWeek, firstMonday } = getWeekInfo(settings.startDate);
  const [viewWeek, setViewWeek] = useState(1);
  
  // Sync viewWeek with currentWeek on initial load (or when currentWeek changes noticeably)
  useEffect(() => {
    if (currentWeek > 0) {
      setViewWeek(Math.min(Math.max(1, currentWeek), settings.totalWeeks));
    }
  }, [currentWeek, settings.totalWeeks]);

  // Editor State
  const [editSubject, setEditSubject] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [editStartPeriod, setEditStartPeriod] = useState(1);
  const [editEndPeriod, setEditEndPeriod] = useState(1);
  const [editWeeks, setEditWeeks] = useState<number[]>([]);
  const [showCustomWeeks, setShowCustomWeeks] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedCourses = await db.get<Course[]>(STORES.SCHEDULE, 'timetable_courses');
    
    if (savedCourses) {
      setCourses(savedCourses);
    } else {
      // Try migrating old data
      const oldCells = await db.get<TimeTableCell[]>(STORES.SCHEDULE, 'timetable');
      if (oldCells && oldCells.length > 0) {
        const migratedCourses: Course[] = oldCells.map(c => ({
          id: Math.random().toString(36).substr(2, 9),
          day: c.day,
          startPeriod: c.period,
          endPeriod: c.period,
          subject: c.subject,
          room: c.room,
          color: c.color,
          weeks: Array.from({ length: DEFAULT_SETTINGS.totalWeeks }, (_, i) => i + 1)
        }));
        setCourses(migratedCourses);
        await db.set(STORES.SCHEDULE, 'timetable_courses', migratedCourses);
      }
    }

    const savedSettings = await db.get<TimetableSettings>(STORES.SCHEDULE, 'timetable_settings');
    if (savedSettings) {
      const mergedSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
      if (mergedSettings.periodTimes.length < mergedSettings.totalPeriods) {
        const currentLength = mergedSettings.periodTimes.length;
        for (let i = currentLength; i < mergedSettings.totalPeriods; i++) {
          mergedSettings.periodTimes.push({
            period: i + 1,
            startTime: `${8 + i}:00`,
            endTime: `${8 + i}:45`
          });
        }
      }
      setSettings(mergedSettings);
    }
  };

  const saveCourses = async (newCourses: Course[]) => {
    await db.set(STORES.SCHEDULE, 'timetable_courses', newCourses);
    setCourses(newCourses);
  };

  const saveSettings = async (newSettings: TimetableSettings) => {
    const updatedPeriodTimes = [...newSettings.periodTimes];
    if (updatedPeriodTimes.length < newSettings.totalPeriods) {
       for (let i = updatedPeriodTimes.length; i < newSettings.totalPeriods; i++) {
          updatedPeriodTimes.push({
            period: i + 1,
            startTime: `${8 + i}:00`,
            endTime: `${8 + i}:45`
          });
       }
    } else if (updatedPeriodTimes.length > newSettings.totalPeriods) {
        updatedPeriodTimes.length = newSettings.totalPeriods;
    }

    const finalSettings = { ...newSettings, periodTimes: updatedPeriodTimes };
    await db.set(STORES.SCHEDULE, 'timetable_settings', finalSettings);
    setSettings(finalSettings);
  };

  const openEditor = (course?: Course, slot?: { day: number, period: number }) => {
    if (course) {
      setEditingCourse(course);
      setSelectedSlot(null);
      setEditSubject(course.subject);
      setEditRoom(course.room);
      setEditColor(course.color);
      setEditStartPeriod(course.startPeriod);
      setEditEndPeriod(course.endPeriod);
      setEditWeeks(course.weeks);
    } else if (slot) {
      setEditingCourse(null);
      setSelectedSlot(slot);
      setEditSubject('');
      setEditRoom('');
      setEditColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setEditStartPeriod(slot.period);
      setEditEndPeriod(slot.period);
      setEditWeeks(Array.from({ length: settings.totalWeeks }, (_, i) => i + 1));
    }
    setShowCustomWeeks(false);
  };

  const closeEditor = () => {
    setEditingCourse(null);
    setSelectedSlot(null);
  };

  const handleSaveCourse = async () => {
    if (!editSubject.trim()) return;

    let newCourses = [...courses];
    
    const courseData: Course = {
      id: editingCourse ? editingCourse.id : Math.random().toString(36).substr(2, 9),
      day: editingCourse ? editingCourse.day : (selectedSlot?.day || 0),
      startPeriod: editStartPeriod,
      endPeriod: editEndPeriod,
      subject: editSubject.trim(),
      room: editRoom.trim(),
      color: editColor,
      weeks: editWeeks.length > 0 ? editWeeks : [viewWeek],
    };

    if (editingCourse) {
      newCourses = newCourses.map(c => c.id === editingCourse.id ? courseData : c);
    } else {
      newCourses.push(courseData);
    }

    await saveCourses(newCourses);
    closeEditor();
  };

  const handleDeleteCourse = async () => {
    if (!editingCourse) return;
    const newCourses = courses.filter(c => c.id !== editingCourse.id);
    await saveCourses(newCourses);
    closeEditor();
  };

  const handleReset = async () => {
    if (window.confirm('确定要开始新学期吗？这将清空当前的所有课程数据，但保留课表设置。')) {
      await db.delete(STORES.SCHEDULE, 'timetable_courses');
      await db.delete(STORES.SCHEDULE, 'timetable'); // Also clear legacy
      setCourses([]);
      setShowSettings(false);
    }
  };

  // Preset week selectors
  const selectAllWeeks = () => setEditWeeks(Array.from({ length: settings.totalWeeks }, (_, i) => i + 1));
  const selectOddWeeks = () => setEditWeeks(Array.from({ length: settings.totalWeeks }, (_, i) => i + 1).filter(w => w % 2 !== 0));
  const selectEvenWeeks = () => setEditWeeks(Array.from({ length: settings.totalWeeks }, (_, i) => i + 1).filter(w => w % 2 === 0));

  const activeWeekdays = settings.showWeekends ? WEEKDAYS : WEEKDAYS.slice(0, 5);
  const periods = Array.from({ length: settings.totalPeriods }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col relative">
      {/* Week Info Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#FDFBF7] border-b border-dashed border-[#5A5A5A]/10 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
             <button 
               onClick={() => setViewWeek(p => Math.max(1, p - 1))}
               disabled={viewWeek <= 1}
               className="p-1 rounded-full hover:bg-black/5 disabled:opacity-30 transition-colors"
             >
               <ChevronLeft className="w-4 h-4 text-[#5A5A5A]" />
             </button>
             <span className="text-lg font-bold text-[#5A5A5A] min-w-[3rem] text-center">
               第 {viewWeek} 周
             </span>
             <button 
               onClick={() => setViewWeek(p => Math.min(settings.totalWeeks, p + 1))}
               disabled={viewWeek >= settings.totalWeeks}
               className="p-1 rounded-full hover:bg-black/5 disabled:opacity-30 transition-colors"
             >
               <ChevronRight className="w-4 h-4 text-[#5A5A5A]" />
             </button>
          </div>
          {currentWeek === viewWeek && (
             <span className="text-[10px] bg-[#5A5A5A] text-white px-1.5 py-0.5 rounded-full">本周</span>
          )}
        </div>
        <button 
           onClick={() => setShowSettings(true)}
           className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-all text-[#999] hover:text-[#5A5A5A]"
        >
           <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Header Days */}
      <div className="flex border-b border-[#5A5A5A]/10 bg-white/50 backdrop-blur-sm sticky top-[49px] z-10">
        <div className="w-8 flex items-center justify-center border-r border-[#5A5A5A]/10 bg-[#FDFBF7]/80" />
        {activeWeekdays.map((day, i) => (
          <div key={i} className="flex-1 py-2 text-center flex flex-col items-center justify-center text-[#5A5A5A]">
            <span className="text-xs font-bold">{day}</span>
            <span className="text-[10px] text-[#999] font-medium leading-none mt-0.5">
              {getDayDate(firstMonday, viewWeek, i)}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        <div className="flex min-h-full">
          {/* Periods Column */}
          <div className="w-8 flex flex-col bg-[#FDFBF7] sticky left-0 z-10 border-r border-[#5A5A5A]/10 shrink-0">
            {periods.map(p => {
              const time = settings.periodTimes[p-1];
              return (
                <div key={p} className="h-14 flex flex-col items-center justify-center text-[10px] font-bold text-[#999] border-b border-dashed border-[#5A5A5A]/10 last:border-b-0 box-border">
                  <span>{p}</span>
                  {time && (
                    <span className="text-[8px] font-normal scale-90 mt-0.5 opacity-60 flex flex-col items-center leading-none gap-0.5">
                      <span>{time.startTime}</span>
                      <span>|</span>
                      <span>{time.endTime}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Schedule Grid */}
          <div className="flex-1 flex">
            {activeWeekdays.map((_, dayIndex) => (
              <div key={dayIndex} className="flex-1 flex flex-col border-r border-dashed border-[#5A5A5A]/10 last:border-r-0 min-w-[60px] relative">
                {(() => {
                  const items = [];
                  let p = 1;
                  while (p <= settings.totalPeriods) {
                    // Find course starting at p for this day, active in viewWeek
                    const currentPeriod = p;
                    const course = courses.find(c =>
                        c.day === dayIndex &&
                        c.startPeriod === currentPeriod &&
                        c.weeks.includes(viewWeek)
                    );

                    if (course) {
                        const duration = course.endPeriod - course.startPeriod + 1;
                        items.push(
                            <div 
                                key={`course-${course.id}`}
                                onClick={() => openEditor(course)}
                                className="w-full p-0.5 absolute z-10"
                                style={{
                                    top: `${(course.startPeriod - 1) * 56}px`,
                                    height: `${duration * 56}px`,
                                }}
                            >
                                <motion.div
                                    className="w-full h-full rounded-lg p-1 flex flex-col justify-center items-center shadow-sm active:scale-95 transition-transform cursor-pointer border border-black/5"
                                    style={{ backgroundColor: course.color }}
                                >
                                    <span className="text-[10px] font-bold text-[#5A5A5A] text-center leading-tight line-clamp-3 break-all">
                                        {course.subject}
                                    </span>
                                    {course.room && (
                                        <span className="text-[8px] text-[#5A5A5A]/70 mt-0.5 scale-90">
                                            @{course.room}
                                        </span>
                                    )}
                                </motion.div>
                            </div>
                        );
                    }
                    p++;
                  }

                  // Render Grid Lines
                  const gridSlots = periods.map(period => (
                    <div 
                        key={`slot-${period}`} 
                        onClick={() => openEditor(undefined, { day: dayIndex, period })}
                        className="h-14 border-b border-dashed border-[#5A5A5A]/10 w-full box-border"
                    />
                  ));

                  return (
                      <>
                          {gridSlots}
                          {items}
                      </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {(editingCourse || selectedSlot) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-[#FDFBF7] w-full max-w-xs max-h-[85vh] flex flex-col rounded-2xl shadow-xl border-2 border-[#5A5A5A]/10 relative"
            >
              <div className="p-4 border-b border-[#5A5A5A]/10 flex justify-between items-center bg-white/50 rounded-t-2xl">
                 <h3 className="font-bold text-[#5A5A5A]">
                    {editingCourse ? '编辑课程' : '添加课程'}
                 </h3>
                 <button 
                    onClick={closeEditor}
                    className="p-1 text-[#999] hover:text-[#5A5A5A] active:scale-90 transition-transform"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="课程名称"
                    autoFocus={!editingCourse}
                    className="w-full bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5A5A5A]"
                  />
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    placeholder="教室 (可选)"
                    className="w-full bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5A5A5A]"
                  />
                  
                  {/* Period Selection */}
                  <div className="flex gap-2 items-center">
                     <div className="flex-1">
                        <label className="text-xs text-[#999] block mb-1">开始节数</label>
                        <select 
                           value={editStartPeriod}
                           onChange={(e) => {
                               const v = parseInt(e.target.value);
                               setEditStartPeriod(v);
                               if (v > editEndPeriod) setEditEndPeriod(v);
                           }}
                           className="w-full bg-white border border-[#E0E0E0] rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#5A5A5A]"
                        >
                            {periods.map(p => <option key={p} value={p}>第 {p} 节</option>)}
                        </select>
                     </div>
                     <span className="mt-5 text-[#999]">-</span>
                     <div className="flex-1">
                        <label className="text-xs text-[#999] block mb-1">结束节数</label>
                        <select 
                           value={editEndPeriod}
                           onChange={(e) => {
                               const v = parseInt(e.target.value);
                               setEditEndPeriod(v);
                               if (v < editStartPeriod) setEditStartPeriod(v);
                           }}
                           className="w-full bg-white border border-[#E0E0E0] rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#5A5A5A]"
                        >
                            {periods.map(p => <option key={p} value={p}>第 {p} 节</option>)}
                        </select>
                     </div>
                  </div>

                  {/* Week Selection */}
                  <div className="space-y-2">
                     <label className="text-xs text-[#999]">上课周数: <span className="text-[#5A5A5A] font-medium">{editWeeks.length}周</span></label>
                     <div className="flex gap-2 text-xs">
                        <button onClick={selectAllWeeks} className="flex-1 py-1.5 bg-white border border-[#E0E0E0] rounded hover:bg-[#F5F5F5]">全部</button>
                        <button onClick={selectOddWeeks} className="flex-1 py-1.5 bg-white border border-[#E0E0E0] rounded hover:bg-[#F5F5F5]">单周</button>
                        <button onClick={selectEvenWeeks} className="flex-1 py-1.5 bg-white border border-[#E0E0E0] rounded hover:bg-[#F5F5F5]">双周</button>
                     </div>
                     
                     <button 
                        onClick={() => setShowCustomWeeks(!showCustomWeeks)}
                        className="w-full py-1.5 text-xs text-[#5A5A5A] bg-[#F5F5F5] rounded flex items-center justify-center gap-1"
                     >
                        {showCustomWeeks ? '收起自定义' : '自定义周数'}
                     </button>

                     {showCustomWeeks && (
                        <div className="grid grid-cols-5 gap-1.5 p-2 bg-white rounded-lg border border-[#E0E0E0]">
                           {Array.from({ length: settings.totalWeeks }, (_, i) => i + 1).map(w => {
                               const isSelected = editWeeks.includes(w);
                               return (
                                   <button
                                      key={w}
                                      onClick={() => {
                                          if (isSelected) setEditWeeks(editWeeks.filter(ew => ew !== w));
                                          else setEditWeeks([...editWeeks, w].sort((a,b) => a-b));
                                      }}
                                      className={`aspect-square flex items-center justify-center text-xs rounded transition-colors ${
                                          isSelected ? 'bg-[#5A5A5A] text-white' : 'bg-[#F9F9F9] text-[#999]'
                                      }`}
                                   >
                                      {w}
                                   </button>
                               );
                           })}
                        </div>
                     )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2 justify-center pt-2 border-t border-dashed border-[#5A5A5A]/10">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${editColor === c ? 'border-[#5A5A5A] scale-110' : 'border-transparent active:scale-90'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {editingCourse && (
                        <button 
                            onClick={handleDeleteCourse}
                            className="flex-1 py-2 text-sm font-bold text-[#FF6B6B] bg-[#FFF0F0] rounded-lg active:scale-95 transition-transform"
                        >
                            删除
                        </button>
                    )}
                    <button 
                      onClick={handleSaveCourse}
                      className="flex-[2] py-2 text-sm font-bold text-white bg-[#5A5A5A] rounded-lg shadow-md active:scale-95 transition-transform"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal - Keep mostly same, just ensure it uses settings state */}
      <AnimatePresence>
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-[#FDFBF7] w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl shadow-xl border-2 border-[#5A5A5A]/10 relative overflow-hidden"
            >
              <div className="p-4 border-b border-[#5A5A5A]/10 flex justify-between items-center bg-white/50">
                <h3 className="font-bold text-[#5A5A5A]">课表设置</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-[#999] hover:text-[#5A5A5A] active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-6 flex-1 custom-scrollbar">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#5A5A5A]">学期设置</label>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <span className="text-xs text-[#999] block mb-1">开学日期</span>
                          <input 
                            type="date"
                            value={settings.startDate}
                            onChange={(e) => saveSettings({ ...settings, startDate: e.target.value })}
                            className="w-full bg-white border border-[#E0E0E0] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#5A5A5A]"
                          />
                       </div>
                       <div className="w-20">
                          <span className="text-xs text-[#999] block mb-1">周数</span>
                          <input 
                            type="number"
                            min={1}
                            max={30}
                            value={settings.totalWeeks}
                            onChange={(e) => saveSettings({ ...settings, totalWeeks: parseInt(e.target.value) || 20 })}
                            className="w-full bg-white border border-[#E0E0E0] rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-[#5A5A5A]"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[#5A5A5A]">显示周末</label>
                    <button 
                      onClick={() => saveSettings({ ...settings, showWeekends: !settings.showWeekends })}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${settings.showWeekends ? 'bg-[#5A5A5A]' : 'bg-[#E0E0E0]'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.showWeekends ? 24 : 2 }}
                        className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[#5A5A5A]">每天节数</label>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => settings.totalPeriods > 1 && saveSettings({ ...settings, totalPeriods: settings.totalPeriods - 1 })}
                         className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#5A5A5A] active:scale-90"
                       >
                         -
                       </button>
                       <span className="w-8 text-center font-bold text-[#5A5A5A]">{settings.totalPeriods}</span>
                       <button 
                         onClick={() => settings.totalPeriods < 20 && saveSettings({ ...settings, totalPeriods: settings.totalPeriods + 1 })}
                         className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#5A5A5A] active:scale-90"
                       >
                         +
                       </button>
                    </div>
                  </div>
                </div>

                {/* Time Settings */}
                <div>
                  <h4 className="text-xs font-bold text-[#999] mb-3 uppercase tracking-wider">时间设置</h4>
                  <div className="space-y-2">
                    {Array.from({ length: settings.totalPeriods }, (_, i) => {
                      const time = settings.periodTimes[i] || { period: i + 1, startTime: '08:00', endTime: '08:45' };
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-8 font-bold text-[#5A5A5A] text-center">{i + 1}</span>
                          <input
                            type="time"
                            value={time.startTime}
                            onChange={(e) => {
                              const newTimes = [...settings.periodTimes];
                              if (!newTimes[i]) newTimes[i] = { period: i + 1, startTime: '08:00', endTime: '08:45' };
                              newTimes[i].startTime = e.target.value;
                              saveSettings({ ...settings, periodTimes: newTimes });
                            }}
                            className="flex-1 bg-white border border-[#E0E0E0] rounded px-2 py-1 text-xs text-center outline-none focus:border-[#5A5A5A]"
                          />
                          <span className="text-[#999]">-</span>
                          <input
                            type="time"
                            value={time.endTime}
                            onChange={(e) => {
                              const newTimes = [...settings.periodTimes];
                              if (!newTimes[i]) newTimes[i] = { period: i + 1, startTime: '08:00', endTime: '08:45' };
                              newTimes[i].endTime = e.target.value;
                              saveSettings({ ...settings, periodTimes: newTimes });
                            }}
                            className="flex-1 bg-white border border-[#E0E0E0] rounded px-2 py-1 text-xs text-center outline-none focus:border-[#5A5A5A]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reset Button */}
                <div className="pt-4 border-t border-[#5A5A5A]/10">
                  <button 
                    onClick={handleReset}
                    className="w-full py-3 flex items-center justify-center gap-2 text-[#FF6B6B] bg-[#FFF0F0] rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" />
                    开始新学期 (清空课表)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}