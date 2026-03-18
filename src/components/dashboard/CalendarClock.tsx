
import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { getCurrentSaoPauloTime } from '@/utils/dateTimeUtils';

export function CalendarClock() {
  const [currentTime, setCurrentTime] = useState(getCurrentSaoPauloTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentSaoPauloTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
  };

  return (
    <div className="space-y-1">
      <div className="text-lg font-bold text-blue-500">
        {formatTime(currentTime)}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatDate(currentTime)}
      </div>
    </div>
  );
}
