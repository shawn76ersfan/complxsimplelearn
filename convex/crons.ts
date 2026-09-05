import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 13:00 UTC = 9am ET. Reminds students about anything due in the next 24h.
crons.daily(
  "assignment due-soon reminders",
  { hourUTC: 13, minuteUTC: 0 },
  internal.notifications.sendDueSoonReminders,
  {},
);

export default crons;
