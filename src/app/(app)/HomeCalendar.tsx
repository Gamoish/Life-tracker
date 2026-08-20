import { Card } from "@/components/ui";
import { addDays, daysInMonth, isoWeekday } from "@/lib/date";
import { isDueOn } from "@/lib/task-schedule";
import type { TaskWithCompletions } from "./tasks/queries";

export default function HomeCalendar({ tasks, today }: { tasks: TaskWithCompletions[]; today: string }) {
  const [year, month] = today.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const blanks = isoWeekday(first) - 1;
  const cells = Array.from({ length: blanks + daysInMonth(year, month) }, (_, index) => index < blanks ? null : `${year}-${String(month).padStart(2, "0")}-${String(index - blanks + 1).padStart(2, "0")}`);
  const label = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const countFor = (date: string) => tasks.filter((task) => task.recurrence === "one_off" ? task.dueDate === date && !task.completedAt : isDueOn(task, date) && !task.completedDates.includes(date)).length;

  return <Card className="p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-sm font-semibold tracking-tight">Calendar</h2><span className="font-mono text-2xs text-faint">{label}</span></div><div className="grid grid-cols-7 gap-1 text-center">{"Mon Tue Wed Thu Fri Sat Sun".split(" ").map((day) => <span key={day} className="py-1 text-2xs text-faint">{day}</span>)}{cells.map((date, index) => date === null ? <span key={`blank-${index}`} /> : <span key={date} className={`relative flex aspect-square items-center justify-center rounded-md text-xs ${date === today ? "bg-accent text-accent-ink font-bold" : "text-muted"}`}>{Number(date.slice(-2))}{countFor(date) > 0 && <i className={`absolute bottom-1 h-1 w-1 rounded-full ${date === today ? "bg-accent-ink" : "bg-accent"}`} />}</span>)}</div><p className="mt-3 text-2xs text-faint">Dots mark incomplete tasks scheduled for that day.</p></Card>;
}
