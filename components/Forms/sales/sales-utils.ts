export const sanitizeMoneyInput = (value: string) =>
  value.replace(/[^\d.,]/g, "").replace(/,/g, "");

export const moneyInputToNumber = (value: string) => {
  const cleaned = sanitizeMoneyInput(value);
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoneyForInput = (value: string) => {
  const cleaned = sanitizeMoneyInput(value);
  if (!cleaned) return "";
  const [whole, decimal] = cleaned.split(".");
  const withCommas = Number(whole || "0").toLocaleString("en-US");
  return decimal !== undefined ? `${withCommas}.${decimal.slice(0, 2)}` : withCommas;
};
