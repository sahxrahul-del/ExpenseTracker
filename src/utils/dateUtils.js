import {
  format,
  parseISO,
  endOfMonth,
  subDays,
  isAfter,
  isSameDay,
  addDays,
} from "date-fns";

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowTimestamp() {
  return Date.now();
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  return format(parseISO(dateStr), "MMM dd, yyyy");
}

export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  return format(parseISO(dateStr), "MMM dd");
}

export function formatTime(timestamp) {
  if (!timestamp) return "";
  return format(new Date(timestamp), "hh:mm a");
}

export function formatMonthYear(year, month) {
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy");
}

export function getMonthYearString(dateStr) {
  const d = dateStr ? parseISO(dateStr) : new Date();
  return format(d, "yyyy-MM");
}

export function getMonthStart(monthYear) {
  const [year, month] = monthYear.split("-").map(Number);
  return format(new Date(year, month - 1, 1), "yyyy-MM-dd");
}

export function getMonthEnd(monthYear) {
  const [year, month] = monthYear.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return format(endOfMonth(date), "yyyy-MM-dd");
}

export function isSameDate(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return false;
  return isSameDay(parseISO(dateStr1), parseISO(dateStr2));
}

export function getDaysInRange(startDate, endDate) {
  const days = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);
  if (isNaN(current.getTime()) || isNaN(end.getTime())) return [];
  let maxIterations = 10000;
  while (!isAfter(current, end) && maxIterations > 0) {
    days.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
    maxIterations--;
  }
  return days;
}

export function getPastDays(days) {
  const today = new Date();
  const start = subDays(today, days - 1);
  return getDaysInRange(format(start, "yyyy-MM-dd"), todayISO());
}

export function getDateRange(days) {
  const end = new Date();
  const start = subDays(end, days - 1);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

export function parseDateToISO(date) {
  if (typeof date === "string") return date;
  return format(date, "yyyy-MM-dd");
}
