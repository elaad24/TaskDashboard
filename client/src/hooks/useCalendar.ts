import { useMutation } from '@tanstack/react-query';
import { apiCalendar, ApiError } from '@/lib/api';

export const useAddToCalendar = () => {
  const addTask = useMutation({
    mutationFn: (taskId: string) => apiCalendar.addTask(taskId),
  });

  const addReminder = useMutation({
    mutationFn: (reminderId: string) => apiCalendar.addReminder(reminderId),
  });

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      if (error.code === 'CALENDAR_DAILY_CAP') return error.message;
      if (error.code === 'ALREADY_SYNCED') return 'Already on your calendar';
      return error.message;
    }
    return error instanceof Error ? error.message : 'Calendar write failed';
  };

  return { addTask, addReminder, getErrorMessage };
};
