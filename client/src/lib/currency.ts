export function formatPrice(amount: number | null | undefined, currency: string | null | undefined): string {
  if (!amount) return "Free";
  const code = currency || "LKR";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${code} ${(amount / 100).toFixed(0)}`;
  }
}

export function useDocumentTitle(title: string) {
  if (typeof document !== "undefined") {
    document.title = title;
  }
}
