const MISSING = "—";

function toLocalDate(value: string | Date): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return MISSING;
  return value.toLocaleString("es-AR");
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return MISSING;
  return `${value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return MISSING;
  return toLocalDate(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function displayValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return MISSING;
  return String(value);
}
