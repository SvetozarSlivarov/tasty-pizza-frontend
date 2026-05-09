export const productType = (item) =>
  String(item?.type ?? item?.productType ?? "").toUpperCase();

export const isPizza = (item) => productType(item) === "PIZZA";
export const isPasta = (item) => productType(item) === "PASTA";
export const isDrink = (item) => productType(item) === "DRINK";
