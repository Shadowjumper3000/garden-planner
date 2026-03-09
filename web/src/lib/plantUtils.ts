/** Deterministic colour palette for plant tiles and placeholders. */
export const PLANT_PALETTE = [
  '#3A5A40','#4A7C52','#52796F','#588157','#7CB27E',
  '#84A98C','#2D6A4F','#A3B18A','#BC6C25','#606C38',
  '#DDA15E','#283618','#B5838D','#6D6875','#E07A5F',
];

/** Deterministically pick a colour from PLANT_PALETTE based on the plant name. */
export const getPlantColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PLANT_PALETTE[Math.abs(hash) % PLANT_PALETTE.length];
};
