export const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

export const isSunday = () => {
  return new Date().getDay() === 0;
};
