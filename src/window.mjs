const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(ymd, days) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function researchWindow(meetingInput, todayInput) {
  const meetingDay = String(meetingInput || "").slice(0, 10);
  const today = String(todayInput || "").slice(0, 10);
  if (!DATE.test(meetingDay) || !DATE.test(today)) {
    throw new Error("Enter a meeting date. Ante anchors the search to that day.");
  }
  const start = addDays(meetingDay, -30);
  const end = meetingDay < today ? meetingDay : today;
  const empty = start > end;
  let note;
  if (empty) {
    note = `The 30 days before ${meetingDay} have not started. There is no public record to brief yet.`;
  } else if (meetingDay > today) {
    note = `The meeting is on ${meetingDay}. This page covers ${start} through today, the part of that 30-day window that has already happened.`;
  } else {
    note = `Developments published from ${start} through ${end}, the 30 days before the meeting.`;
  }
  return { start, end, meetingDay, today, empty, note };
}
