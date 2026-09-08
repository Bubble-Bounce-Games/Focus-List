export const CALENDAR_REMINDERS_KEY = "fl.calendarReminders";

export type CalendarReminder = {
  id: string;
  title: string;
  dueDate: string;
  createdAt: string;
};

export function asCalendarReminders(value: unknown): CalendarReminder[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CalendarReminder =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as CalendarReminder).id === "string" &&
      typeof (item as CalendarReminder).title === "string" &&
      typeof (item as CalendarReminder).dueDate === "string" &&
      typeof (item as CalendarReminder).createdAt === "string"
  );
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isUpcomingReminderDate(value: string, today = toDateKey(new Date())): boolean {
  return value >= today;
}
