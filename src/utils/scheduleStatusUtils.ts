import { db, STORES } from './db';

interface ScheduleSettings {
  shareEnabled: boolean;
  shareScope: 'all' | 'specific';
  shareCharacterId: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

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

interface Course {
  id: string;
  day: number; // 0=Monday, ... 6=Sunday
  startPeriod: number;
  endPeriod: number;
  subject: string;
  room: string;
  color: string;
  weeks: number[]; // Array of week numbers
}

const DEFAULT_TIMETABLE_SETTINGS: TimetableSettings = {
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

/**
 * Calculate current week number based on start date
 */
const getWeekInfo = (startDateStr: string) => {
  const start = new Date(startDateStr);
  const now = new Date();
  
  // Normalize to midnight
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Find the Monday of the start week
  const startDay = startMidnight.getDay() || 7; // 1=Mon, ..., 7=Sun
  const firstMonday = new Date(startMidnight);
  firstMonday.setDate(startMidnight.getDate() - (startDay - 1));

  const diffTime = nowMidnight.getTime() - firstMonday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeek = Math.floor(diffDays / 7) + 1;

  return currentWeek;
};

export async function getScheduleStatus(characterId: string): Promise<string> {
  try {
    // 1. Check Share Settings
    const settings = await db.get<ScheduleSettings>(STORES.SCHEDULE, 'schedule_settings');
    if (!settings || !settings.shareEnabled) {
      return '';
    }

    if (settings.shareScope === 'specific' && settings.shareCharacterId !== characterId) {
      return '';
    }

    const parts: string[] = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 2. Uncompleted Todos
    const todos = await db.get<Todo[]>(STORES.SCHEDULE, 'todos') || [];
    const uncompletedTodos = todos.filter(t => !t.completed);
    
    if (uncompletedTodos.length > 0) {
      const todoTexts = uncompletedTodos.map(t => t.text).join('、');
      parts.push(`待办事项:${todoTexts}`);
    }

    // 3. Today's Calendar Events
    const events = await db.get<CalendarEvent[]>(STORES.SCHEDULE, 'events') || [];
    const todayEvents = events.filter(e => e.date === todayStr);
    
    if (todayEvents.length > 0) {
      const eventDetails = todayEvents.map(e => {
        let timeStr = '';
        if (e.isAllDay) {
          timeStr = '(全天)';
        } else if (e.startTime) {
          timeStr = `(${e.startTime}${e.endTime ? '-' + e.endTime : ''})`;
        }
        return `${e.title}${timeStr}`;
      }).join('、');
      parts.push(`今日日程:${eventDetails}`);
    }

    // 4. Today's Timetable Classes
    const timetableSettings = await db.get<TimetableSettings>(STORES.SCHEDULE, 'timetable_settings');
    const courses = await db.get<Course[]>(STORES.SCHEDULE, 'timetable_courses') || [];
    
    if (courses.length > 0) {
      // Ensure mergedSettings has a valid periodTimes array even if DB data is partial
      const mergedSettings = { ...DEFAULT_TIMETABLE_SETTINGS, ...timetableSettings };
      
      // If the loaded settings have fewer periodTimes than totalPeriods, fill them up
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

      const currentWeek = getWeekInfo(mergedSettings.startDate);
      
      // Calculate today's index (0=Mon, ... 6=Sun)
      const jsDay = today.getDay(); // 0=Sun, 1=Mon
      const dayIndex = (jsDay + 6) % 7;

      // Filter courses: Today + Current Week
      const todayCourses = courses
        .filter(c => c.day === dayIndex && c.weeks.includes(currentWeek))
        .sort((a, b) => a.startPeriod - b.startPeriod);

      if (todayCourses.length > 0) {
        const courseDetails = todayCourses.map(c => {
          const roomStr = c.room ? `@${c.room}` : '';
          
          // Find time range
          const startP = mergedSettings.periodTimes.find(p => p.period === c.startPeriod);
          const endP = mergedSettings.periodTimes.find(p => p.period === c.endPeriod);
          
          let timeStr = '';
          if (startP && endP) {
             timeStr = `(${startP.startTime}-${endP.endTime})`;
          } else if (startP) {
             timeStr = `(${startP.startTime})`;
          }

          return `第${c.startPeriod}-${c.endPeriod}节${timeStr}:${c.subject}${roomStr}`;
        }).join('、');
        parts.push(`今日课程:${courseDetails}`);
      } else if (currentWeek > 0 && currentWeek <= mergedSettings.totalWeeks) {
        // Only mention "no classes" if we are within the semester
        // parts.push(`今日无课`); 
        // User didn't strictly ask for "No classes" message, just "Today's classes". If none, maybe omit or say none. 
        // Let's omit to keep prompt clean unless there ARE classes.
      }
    }

    return parts.join(' ');
  } catch (error) {
    console.error('Failed to get schedule status:', error);
    return '';
  }
}
