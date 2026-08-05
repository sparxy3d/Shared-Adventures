// priceAmount is stored as whole currency units (e.g. 2500 = LKR 2,500), NOT minor units.
export function formatPrice(amount: number | null | undefined, currency: string | null | undefined): string {
  if (!amount) return "Free";
  const code = currency || "LKR";
  return `${code} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function useDocumentTitle(title: string) {
  if (typeof document !== "undefined") {
    document.title = title;
  }
}
