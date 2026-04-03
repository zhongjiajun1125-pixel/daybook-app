import { format, isToday, isYesterday } from "date-fns";
import { zhCN } from "date-fns/locale";

export function formatEntryDayLabel(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) return "今天";
  if (isYesterday(date)) return "昨天";
  return format(date, "M月d日", { locale: zhCN });
}

export function formatEntryTime(dateString: string) {
  return format(new Date(dateString), "HH:mm", { locale: zhCN });
}
