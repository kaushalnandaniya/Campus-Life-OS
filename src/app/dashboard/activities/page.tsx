"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { demoActivities, type PersonalActivity } from "@/lib/demo-data";
import { Dumbbell, Plus, Trash2, Clock, Calendar } from "lucide-react";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const emojis = ["🏋️", "🏀", "⚽", "🏊", "🎵", "📖", "😴", "🧘", "💻", "🎮", "🍳", "🏃"];

export default function ActivitiesPage() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<PersonalActivity[]>(demoActivities);
  const [showForm, setShowForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: "",
    emoji: "🏋️",
    daysOfWeek: [] as number[],
    startTime: "06:00",
    endTime: "07:00",
    isFlexible: true,
  });

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_email", userEmail);

      if (error) {
        console.error("Error fetching activities:", error);
      } else if (data && data.length > 0) {
        setActivities(
          data.map((a: any) => ({
            id: a.id,
            title: a.title,
            emoji: a.type,
            daysOfWeek: a.days_of_week,
            startTime: a.start_time,
            endTime: a.end_time,
            isFlexible: true,
          }))
        );
      } else {
        setActivities([]);
      }
    };

    fetchActivities();
  }, [session]);

  const toggleDay = (day: number) => {
    setNewActivity((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const addActivity = async () => {
    if (!newActivity.title || newActivity.daysOfWeek.length === 0) return;

    const tempId = `temp-${Date.now()}`;
    const activity: PersonalActivity = { id: tempId, ...newActivity };
    setActivities([...activities, activity]);

    setNewActivity({
      title: "",
      emoji: "🏋️",
      daysOfWeek: [],
      startTime: "06:00",
      endTime: "07:00",
      isFlexible: true,
    });
    setShowForm(false);

    const userEmail = session?.user?.email;
    if (userEmail) {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          user_email: userEmail,
          title: activity.title,
          type: activity.emoji,
          days_of_week: activity.daysOfWeek,
          start_time: activity.startTime,
          end_time: activity.endTime,
        })
        .select();

      if (error) {
        console.error("Error inserting activity:", error);
      } else if (data && data[0]) {
        setActivities((prev) =>
          prev.map((a) => (a.id === tempId ? { ...a, id: data[0].id } : a))
        );
      }
    }
  };

  const deleteActivity = async (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));

    if (session?.user?.email && !id.toString().startsWith("demo-") && !id.toString().startsWith("temp-")) {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) console.error("Error deleting activity:", error);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Activities
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Personal recurring activities the AI respects in your schedule
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">
            New Activity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Name</label>
              <div className="flex gap-2">
                <select
                  value={newActivity.emoji}
                  onChange={(e) => setNewActivity({ ...newActivity, emoji: e.target.value })}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-base w-14 focus:outline-none"
                >
                  {emojis.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="e.g., Gym, Basketball..."
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-border)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Start</label>
                <input
                  type="time"
                  value={newActivity.startTime}
                  onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-muted)] mb-1 block">End</label>
                <input
                  type="time"
                  value={newActivity.endTime}
                  onChange={(e) => setNewActivity({ ...newActivity, endTime: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Days</label>
            <div className="flex gap-1.5">
              {dayNames.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-md text-[11px] font-medium transition-colors ${
                    newActivity.daysOfWeek.includes(i)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-border)]"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={addActivity} className="btn-primary">Add</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activities.map((activity) => (
          <div key={activity.id} className="glass-card p-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{activity.emoji}</span>
                <div>
                  <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                    {activity.title}
                  </h3>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                      <Clock className="w-3 h-3" />
                      {activity.startTime} - {activity.endTime}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                      <Calendar className="w-3 h-3" />
                      {activity.daysOfWeek.map((d) => dayNames[d]).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteActivity(activity.id)}
                className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No activities yet</p>
        </div>
      )}
    </div>
  );
}
