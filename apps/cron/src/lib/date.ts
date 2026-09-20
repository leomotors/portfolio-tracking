const BANGKOK = "Asia/Bangkok";

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function bangkokPart(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return parts.find((part) => part.type === type)?.value ?? "";
}

/** `SUN 20 SEP 2026` in ICT. */
export function formatAsOfLabel(date: Date): string {
  const weekday = bangkokPart(date, "weekday");
  const day = bangkokPart(date, "day");
  const month = bangkokPart(date, "month");
  const year = bangkokPart(date, "year");
  return `${weekday.slice(0, 3)} ${day} ${month.slice(0, 3)} ${year}`.toUpperCase();
}

/** `AS OF 20:05 ICT` */
export function formatAsOfTime(date: Date): string {
  const hour = bangkokPart(date, "hour");
  const minute = bangkokPart(date, "minute");
  return `AS OF ${hour}:${minute} ICT`;
}

export function getYesterday(date: Date) {
  const yest = new Date(date);
  yest.setDate(date.getDate() - 1);
  return yest;
}

export function orPreviousWorkDay(date: Date) {
  const newDate = new Date(date);

  const dayOfWeek = newDate.getDay();

  if (dayOfWeek === 0) {
    // Sunday
    newDate.setDate(newDate.getDate() - 2);
  } else if (dayOfWeek === 6) {
    // Saturday
    newDate.setDate(newDate.getDate() - 1);
  }

  return newDate;
}
