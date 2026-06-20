/**
 * Pushes a task to the user's Google Calendar as an event.
 * @param accessToken The access token for the specific Google Account.
 * @param task The task to be added.
 * @returns The Calendar Event ID, or null if failed.
 */
export async function pushTaskToCalendar(accessToken: string, task: any): Promise<string | null> {
  // We only push tasks that have a deadline
  if (!task.deadline || task.deadline === "null") {
    return null;
  }

  try {
    const deadlineDate = new Date(task.deadline);
    
    // Check if the AI returned a valid date string
    if (isNaN(deadlineDate.getTime())) {
      console.warn(`[GCal] Skipping calendar push for task "${task.title}" because deadline format is invalid: "${task.deadline}"`);
      return null;
    }

    // Create an event that starts 1 hour before the deadline, and ends at the deadline
    const startDate = new Date(deadlineDate.getTime() - 60 * 60 * 1000);

    const event = {
      summary: `[Campus OS] ${task.title}`,
      description: `Task Type: ${task.taskType}\nCourse: ${task.subjectCourse}\nPriority: ${task.priority}\n\n${task.description}`,
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: deadlineDate.toISOString(),
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("[GCal] Error pushing to calendar:", errData);
      return null;
    }

    const data = await response.json();
    return data.id; // Return the Google Calendar Event ID
  } catch (error) {
    console.error("[GCal] Exception while pushing to calendar:", error);
    return null;
  }
}

/**
 * Fetches upcoming events from the user's primary calendar.
 */
export async function fetchCalendarEvents(accessToken: string) {
  try {
    const timeMin = new Date().toISOString();
    
    // Fetch events for the next 60 days
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    const timeMax = maxDate.toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("[GCal] Error fetching calendar events");
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("[GCal] Exception while fetching calendar events:", error);
    return [];
  }
}

export async function addCalendarEvent(accessToken: string, title: string, startTime: string, endTime: string): Promise<string | null> {
  try {
    const event = {
      summary: title.startsWith("[Campus OS]") ? title : `[Campus OS] ${title}`,
      start: { dateTime: new Date(startTime).toISOString() },
      end: { dateTime: new Date(endTime).toISOString() },
    };

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("[GCal] Exception while adding calendar event:", error);
    return null;
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("[GCal] Exception while deleting calendar event:", error);
    return false;
  }
}
