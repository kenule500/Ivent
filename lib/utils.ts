import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Utility helper to merge a Calendar Date object and an HH:MM time string into a clean single Date instance
 */
export const combineDateTime = (date: Date | string, time: string): Date | null => {
  if (!date || !time) return null;
  
  const [hh, mm] = time.split(":").map(Number);
  const targetDate = new Date(date);
  
  targetDate.setHours(hh, mm, 0, 0);
  return targetDate;
};