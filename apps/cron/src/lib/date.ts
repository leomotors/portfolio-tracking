export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
