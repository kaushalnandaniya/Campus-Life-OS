"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { type Task } from "@/lib/demo-data";
import {
  CalendarDays,
  Sparkles,
  BookOpen,
  Dumbbell,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  List
} from "lucide-react";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

import {
  BaselineEvent,
  CalendarEvent,
  ScheduleBlock,
  defaultBaselineRoutine,
  timeToMinutes,
  minutesToTime,
  formatDuration,
  getStartOfWeek,
  getStartOfMonth,
  generateSmartScheduleRange
} from "@/lib/scheduler";

const HOURS_START = 6;
const HOURS_END = 24;
const PIXELS_PER_MINUTE = 1.2;

export default function SchedulePage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [baselineRoutine, setBaselineRoutine] = useState<BaselineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewType, setViewType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pushingToGCal, setPushingToGCal] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSlotDate, setAddSlotDate] = useState<Date | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addDuration, setAddDuration] = useState("60");
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<ScheduleBlock | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFreshData = async () => {
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    // We can just call /api/calendar again to refresh calendar
    try {
      const res = await fetch("/api/calendar");
      const calData = await res.json();
      if (calData.events) setCalendarEvents(calData.events);
      
      const { data: tasksData } = await supabase.from("tasks").select("*").eq("user_email", userEmail);
      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          id: t.id, title: t.title, description: t.description || "", subjectCourse: t.subject_course, 
          taskType: t.task_type || "assignment", deadline: t.deadline, estimatedEffortHours: t.estimated_effort_hours, 
          priority: t.priority, status: t.status, source: t.source || "manual", aiConfidence: t.ai_confidence || 100,
          createdAt: t.created_at || new Date().toISOString()
        })));
      }
    } catch (e) {}
  };

  const handleSlotClick = (e: React.MouseEvent, clickedDate: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // y is in pixels. Convert to minutes.
    // y = (mins - HOURS_START * 60) * PIXELS_PER_MINUTE
    // mins = y / PIXELS_PER_MINUTE + HOURS_START * 60
    const clickedMins = Math.floor(y / PIXELS_PER_MINUTE) + HOURS_START * 60;
    
    // Round to nearest 15 mins
    const roundedMins = Math.round(clickedMins / 15) * 15;
    
    const startHour = Math.floor(roundedMins / 60);
    const startMin = roundedMins % 60;
    
    const selectedDateTime = new Date(clickedDate);
    selectedDateTime.setHours(startHour, startMin, 0, 0);
    
    setAddSlotDate(selectedDateTime);
    setAddTitle("");
    setAddDuration("60");
    setIsAddModalOpen(true);
  };

  const handleSaveNewEvent = async () => {
    if (!addTitle || !addSlotDate) return;
    setIsSaving(true);
    
    try {
      const endDateTime = new Date(addSlotDate.getTime() + parseInt(addDuration) * 60000);
      
      const res = await fetch("/api/calendar/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle,
          startTime: addSlotDate.toISOString(),
          endTime: endDateTime.toISOString()
        })
      });
      
      if (res.ok) {
        setIsAddModalOpen(false);
        await fetchFreshData();
      } else {
        const data = await res.json();
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockClick = (block: ScheduleBlock, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering slot click
    setBlockToDelete(block);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteBlock = async () => {
    if (!blockToDelete) return;
    setIsDeleting(true);
    
    try {
      if (blockToDelete.type === "calendar") {
        // Physical event
        const res = await fetch("/api/calendar/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: blockToDelete.id })
        });
        if (!res.ok) throw new Error("Failed to delete from GCal");
      } else if (blockToDelete.type === "ai-suggested") {
        // Task block. Extract original task ID.
        // ID format: ai-{uuid}-date
        const taskId = blockToDelete.id.split("-").slice(1, -1).join("-") || blockToDelete.id.replace("ai-", "");
        
        await supabase.from("tasks").delete().eq("id", taskId);
      }
      // Note: We don't support deleting baseline routines through UI currently
      
      setIsDeleteModalOpen(false);
      await fetchFreshData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete block");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const fetchData = async () => {
      const { data: tasksData } = await supabase.from("tasks").select("*").eq("user_email", userEmail);
      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          id: t.id, 
          title: t.title, 
          description: t.description || "",
          subjectCourse: t.subject_course, 
          taskType: t.task_type || "assignment",
          deadline: t.deadline,
          estimatedEffortHours: t.estimated_effort_hours, 
          priority: t.priority, 
          status: t.status,
          source: t.source || "manual",
          aiConfidence: t.ai_confidence || 100,
          createdAt: t.created_at || new Date().toISOString()
        })));
      }

      const { data: actData } = await supabase.from("activities").select("*").eq("user_email", userEmail);
      if (actData) {
        setBaselineRoutine(actData.map((a: any) => ({
          id: a.id, title: a.title, type: "personal", daysOfWeek: a.days_of_week || [],
          startTime: a.start_time, endTime: a.end_time
        })));
      }

      try {
        const res = await fetch("/api/calendar");
        const calData = await res.json();
        if (calData.events) setCalendarEvents(calData.events);
      } catch (e) {}

      setLoading(false);
    };

    fetchData();
  }, [session]);

  const changeDate = (amount: number) => {
    const d = new Date(currentDate);
    if (viewType === "daily") d.setDate(d.getDate() + amount);
    if (viewType === "weekly") d.setDate(d.getDate() + amount * 7);
    if (viewType === "monthly") d.setMonth(d.getMonth() + amount);
    setCurrentDate(d);
  };

  const getTimelineScale = () => {
    const hours = [];
    for (let i = HOURS_START; i <= HOURS_END; i++) {
      const label = i === 12 ? "12 PM" : i > 12 ? `${i - 12} PM` : `${i} AM`;
      hours.push(<div key={i} className="text-[10px] text-[var(--text-muted)] h-[72px] relative -top-2 pr-2 text-right w-12">{label}</div>);
    }
    return hours;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" /></div>;
  }

  // Generate Data for View
  let startDate = new Date(currentDate);
  let endDate = new Date(currentDate);
  
  if (viewType === "weekly") {
    startDate = getStartOfWeek(currentDate);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
  } else if (viewType === "monthly") {
    startDate = getStartOfMonth(currentDate);
    startDate = getStartOfWeek(startDate); // pad beginning
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41); // 6 weeks total
  }

  const scheduleMap = generateSmartScheduleRange(startDate, endDate, baselineRoutine, calendarEvents, tasks);

  const computeLayout = (dayBlocks: ScheduleBlock[]) => {
    const sorted = [...dayBlocks].sort((a, b) => a.startMins - b.startMins);
    const clusters: ScheduleBlock[][] = [];
    let currentCluster: ScheduleBlock[] = [];
    let clusterEnd = 0;
    
    for (const block of sorted) {
      if (currentCluster.length === 0) {
        currentCluster.push(block);
        clusterEnd = block.endMins;
      } else if (block.startMins < clusterEnd) {
        currentCluster.push(block);
        clusterEnd = Math.max(clusterEnd, block.endMins);
      } else {
        clusters.push(currentCluster);
        currentCluster = [block];
        clusterEnd = block.endMins;
      }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);
    
    const layout: Record<string, { left: number, width: number }> = {};
    for (const cluster of clusters) {
      const columns: ScheduleBlock[][] = [];
      for (const block of cluster) {
        let placed = false;
        for (const col of columns) {
          const last = col[col.length - 1];
          if (last.endMins <= block.startMins) {
            col.push(block);
            placed = true;
            break;
          }
        }
        if (!placed) columns.push([block]);
      }
      
      const numCols = columns.length;
      for (let i = 0; i < numCols; i++) {
        for (const block of columns[i]) {
          layout[block.id] = {
            left: (i / numCols) * 100,
            width: (1 / numCols) * 100
          };
        }
      }
    }
    return layout;
  };

  const renderEventBlock = (block: ScheduleBlock, layoutInfo?: { left: number, width: number }) => {
    const top = (block.startMins - HOURS_START * 60) * PIXELS_PER_MINUTE;
    const height = (block.endMins - block.startMins) * PIXELS_PER_MINUTE;

    let bgClass = "bg-[var(--bg-surface)] border-[var(--border)]";
    let accentColor = "var(--text-muted)";
    
    if (block.type === "ai-suggested") {
      bgClass = "bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)]";
      accentColor = "var(--accent)";
    } else if (block.type === "calendar") {
      bgClass = "bg-[var(--bg-surface)] border-l-2 border-l-[var(--color-warning)] border-[var(--border)]";
      accentColor = "var(--color-warning)";
    } else if (block.type === "academic") {
      bgClass = "bg-[var(--color-info-dim)] border-[var(--color-info)] opacity-80 text-[var(--text-primary)]";
      accentColor = "var(--color-info)";
    }

    const style: React.CSSProperties = {
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`,
      left: layoutInfo ? `calc(${layoutInfo.left}% + 4px)` : '4px',
      width: layoutInfo ? `calc(${layoutInfo.width}% - 8px)` : 'calc(100% - 8px)'
    };

    return (
      <div
        key={block.id}
        onClick={(e) => handleBlockClick(block, e)}
        className={`absolute rounded-md border p-1.5 overflow-hidden shadow-sm transition-all hover:z-10 hover:shadow-md cursor-pointer ${bgClass}`}
        style={style}
      >
        <div className="flex items-start gap-1">
          <div className="mt-0.5" style={{ color: accentColor }}>{block.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold truncate leading-tight">{block.title}</div>
            {height > 30 && (
              <div className="text-[9px] opacity-70 truncate mt-0.5">
                {block.time} - {block.endTimeStr}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDailyView = () => {
    const blocks = scheduleMap[currentDate.toDateString()] || [];
    const layout = computeLayout(blocks);
    return (
      <div className="glass-card flex animate-fade-in overflow-hidden border border-[var(--border)]">
        <div className="bg-[var(--bg-elevated)] border-r border-[var(--border)] pt-4">
          {getTimelineScale()}
        </div>
        <div 
          className="flex-1 relative min-h-[1000px] bg-[var(--bg-card)] cursor-crosshair"
          onClick={(e) => handleSlotClick(e, currentDate)}
        >
          {/* Grid lines */}
          {Array.from({ length: HOURS_END - HOURS_START + 1 }).map((_, i) => (
             <div key={i} className="absolute left-0 right-0 border-t border-[var(--border)] opacity-30 pointer-events-none" style={{ top: `${i * 60 * PIXELS_PER_MINUTE}px` }} />
          ))}
          {blocks.map(b => renderEventBlock(b, layout[b.id]))}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    return (
      <div className="glass-card flex animate-fade-in overflow-hidden border border-[var(--border)]">
        <div className="bg-[var(--bg-elevated)] border-r border-[var(--border)] pt-8">
          {getTimelineScale()}
        </div>
        <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory">
          {days.map((d, i) => {
            const dateStr = d.toDateString();
            const blocks = scheduleMap[dateStr] || [];
            const isToday = d.toDateString() === new Date().toDateString();
            
            return (
              <div key={i} className="flex-1 min-w-[120px] border-r border-[var(--border)] last:border-r-0 snap-start">
                <div className={`p-2 text-center border-b border-[var(--border)] sticky top-0 z-10 ${isToday ? 'bg-[rgba(96,165,250,0.1)]' : 'bg-[var(--bg-card)]'}`}>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{dayNames[d.getDay()]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-[var(--accent)]' : ''}`}>{d.getDate()}</div>
                </div>
                <div 
                  className="relative min-h-[1000px] bg-[var(--bg-surface)] cursor-crosshair hover:bg-[rgba(0,0,0,0.01)] transition-colors"
                  onClick={(e) => handleSlotClick(e, d)}
                >
                  {Array.from({ length: HOURS_END - HOURS_START + 1 }).map((_, idx) => (
                    <div key={idx} className="absolute left-0 right-0 border-t border-[var(--border)] opacity-20 pointer-events-none" style={{ top: `${idx * 60 * PIXELS_PER_MINUTE}px` }} />
                  ))}
                  {blocks.map(b => renderEventBlock(b, computeLayout(blocks)[b.id]))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    const days = [];
    let cur = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    return (
      <div className="glass-card animate-fade-in border border-[var(--border)] flex flex-col">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          {dayNames.map(d => (
             <div key={d} className="py-2 text-center text-[10px] font-medium text-[var(--text-muted)] uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-[var(--border)] gap-px">
           {days.map((d, i) => {
             const isCurrentMonth = d.getMonth() === currentDate.getMonth();
             const isToday = d.toDateString() === new Date().toDateString();
             const blocks = scheduleMap[d.toDateString()] || [];
             
             return (
               <div key={i} className={`min-h-[100px] bg-[var(--bg-card)] p-1 ${!isCurrentMonth ? "opacity-40" : ""}`}>
                  <div className={`text-[11px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {blocks.slice(0, 4).map(b => (
                       <div key={b.id} className="text-[8px] truncate px-1 rounded-sm bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-1">
                         <span className={b.type === 'ai-suggested' ? 'text-[var(--accent)]' : b.type === 'calendar' ? 'text-[var(--color-warning)]' : 'text-[var(--color-info)]'}>
                           •
                         </span>
                         {b.title}
                       </div>
                    ))}
                    {blocks.length > 4 && (
                       <div className="text-[8px] text-[var(--text-muted)] px-1">+{blocks.length - 4} more</div>
                    )}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between animate-fade-in-up gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Smart Schedule</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Visual Planner with AI Block Injection</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-lg">
            <button onClick={() => setViewType("daily")} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${viewType === "daily" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Day</button>
            <button onClick={() => setViewType("weekly")} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${viewType === "weekly" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Week</button>
            <button onClick={() => setViewType("monthly")} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${viewType === "monthly" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Month</button>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-lg">
            <button onClick={() => changeDate(-1)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[12px] font-medium text-[var(--text-primary)] min-w-[120px] text-center">
              {viewType === "daily" && currentDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
              {viewType === "weekly" && `${startDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}`}
              {viewType === "monthly" && currentDate.toLocaleDateString("en-US", { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeDate(1)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] inline-flex items-center gap-1.5 animate-fade-in">
        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
        AI correctly interweaves your Tasks between your real Calendar Events and Activities.
      </div>

      {viewType === "daily" && renderDailyView()}
      {viewType === "weekly" && renderWeeklyView()}
      {viewType === "monthly" && renderMonthlyView()}

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
              <h3 className="font-semibold text-sm">Add Calendar Event</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wider">Event Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={addTitle} 
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. Lunch with Sarah"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wider">Start Time</label>
                  <div className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] opacity-70 cursor-not-allowed">
                    {addSlotDate ? addSlotDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wider">Duration</label>
                  <select 
                    value={addDuration} 
                    onChange={(e) => setAddDuration(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] flex gap-2 justify-end bg-[var(--bg-elevated)]">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNewEvent}
                disabled={isSaving || !addTitle.trim()}
                className="px-4 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {isSaving ? "Saving..." : "Add to Google Calendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && blockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
              <h3 className="font-semibold text-sm text-[var(--color-danger)]">Confirm Deletion</h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[var(--text-primary)]">
                Are you sure you want to delete <strong>{blockToDelete.title}</strong>?
              </p>
              {blockToDelete.type === "calendar" && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  This is a physical event and will be permanently deleted from your Google Calendar.
                </p>
              )}
              {blockToDelete.type === "ai-suggested" && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  This task will be deleted from your Campus Life OS workspace.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border)] flex gap-2 justify-end bg-[var(--bg-elevated)]">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteBlock}
                disabled={isDeleting || blockToDelete.type === "personal" || blockToDelete.type === "academic"}
                className="px-4 py-2 text-xs font-medium bg-[var(--color-danger)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {blockToDelete.type === "personal" || blockToDelete.type === "academic" ? "Cannot Delete Routine" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
