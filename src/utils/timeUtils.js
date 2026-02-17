export const calculateLateMinutes = (startTime) => {
  const now = new Date();

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const start = new Date();
  start.setHours(startHour, startMinute, 0);

  const diff = (now - start) / (1000 * 60); // in minutes

  if (diff > 0) {
    return Math.floor(diff);
  }
  return 0;
};
