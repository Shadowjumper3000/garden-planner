import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Sprout } from "lucide-react";
import { PlantingEvent } from "@/types";

const getEventStyle = (type: string) => {
  switch (type) {
    case "planting":
      return {
        bgColor: "bg-garden-primary/20",
        textColor: "text-garden-primary",
        icon: <Sprout className="h-3 w-3 mr-1" />,
      };
    case "harvest":
      return {
        bgColor: "bg-orange-300/30",
        textColor: "text-orange-700",
        icon: (
          <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" /><path d="M8 16h.01" /><path d="M8 20h.01" /><path d="M12 18h.01" /><path d="M12 22h.01" /><path d="M16 16h.01" /><path d="M16 20h.01" /></svg>
        ),
      };
    default:
      return { bgColor: "bg-gray-200", textColor: "text-gray-700", icon: null };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  } as Intl.DateTimeFormatOptions);
};

const SimpleCalendarComponent = ({ events }: { events: PlantingEvent[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.start);
    return (
      eventDate.getMonth() === currentDate.getMonth() &&
      eventDate.getFullYear() === currentDate.getFullYear()
    );
  });

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [] as any[];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        dayNumber: i,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        events: filteredEvents.filter((event) => new Date(event.start).toDateString() === date.toDateString()),
      });
    }
    return days;
  };

  const days = getDaysInMonth();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };
  const prevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="calendar-container">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>Previous</Button>
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>Next</Button>
        </div>
        <h2 className="text-xl font-medium">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex space-x-2">
          <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>Month</Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>List</Button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="text-center text-sm font-medium py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 border rounded bg-gray-50 p-1"></div>
            ))}
            {days.map(({ date, dayNumber, events }) => (
              <div key={dayNumber} className={`h-24 border rounded p-1 overflow-y-auto ${date.toDateString() === new Date().toDateString() ? 'bg-garden-primary/10' : ''}`}>
                <div className="font-medium text-sm mb-1">{dayNumber}</div>
                {events.map((event) => {
                  const style = getEventStyle(event.type);
                  return (
                    <div key={event.id} className={`text-xs p-1 mb-1 rounded truncate flex items-center ${style.bgColor} ${style.textColor}`} title={event.title}>
                      {style.icon}
                      <span className="truncate flex-1">{event.title}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.length > 0 ? (
            filteredEvents.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((event) => {
              const style = getEventStyle(event.type);
              return (
                <div key={event.id} className={`p-3 rounded flex items-center space-x-3 ${style.bgColor}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.type === 'planting' ? 'bg-garden-primary/20' : 'bg-orange-300/30'}`}>{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${style.textColor}`}>{event.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center"><CalendarDays className="h-3 w-3 mr-1" />{formatDate(event.start)}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">No events for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          )}
        </div>
      )}

      <div className="flex gap-4 justify-end mt-4 text-xs text-muted-foreground">
        <div className="flex items-center"><div className="w-3 h-3 bg-garden-primary/20 rounded mr-1"></div><span>Planting</span></div>
        <div className="flex items-center"><div className="w-3 h-3 bg-orange-300/30 rounded mr-1"></div><span>Harvest</span></div>
      </div>
    </div>
  );
};

export default SimpleCalendarComponent;
