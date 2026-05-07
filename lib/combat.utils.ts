export const getRandomId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

export const getRandomDamage = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
