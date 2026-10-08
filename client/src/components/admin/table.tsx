import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export type AdminColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};
export function AdminTable<T>({
  rows, columns, searchText, filterControls,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  searchText?: (row: T) => string;
  filterControls?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 }>({ key: columns[0]?.key ?? "", direction: 1 });
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const match = rows.filter((row) => !needle || (searchText?.(row) ?? columns.map((column) => String((row as unknown as Record<string, unknown>)[column.key] ?? "")).join(" ")).toLowerCase().includes(needle));
    const column = columns.find((item) => item.key === sort.key);
    if (column) match.sort((a, b) => {
      const av = column.sortValue ? column.sortValue(a) : String((a as unknown as Record<string, unknown>)[column.key] ?? "");
      const bv = column.sortValue ? column.sortValue(b) : String((b as unknown as Record<string, unknown>)[column.key] ?? "");
      return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })) * sort.direction;
    });
    return match;
  }, [rows, columns, search, searchText, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 25));
  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);
  const current = filtered.slice(page * 25, page * 25 + 25);
  const toggleSort = (key: string) => {
    setPage(0);
    setSort((old) => ({ key, direction: old.key === key ? (old.direction === 1 ? -1 : 1) : 1 }));
  };
  return <div>
    <div className="ad-table-tools"><label className="ad-search-wrap"><Search size={15} /><input className="ad-input" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search this list" aria-label="Search this list" /></label>{filterControls}</div>
    <div className="ad-table-scroll"><table className="ad-table"><thead><tr>{columns.map((column) => <th key={column.key}><button type="button" onClick={() => toggleSort(column.key)} aria-label={`Sort by ${column.label}`}>{column.label}{sort.key === column.key ? (sort.direction === 1 ? " ↑" : " ↓") : ""}</button></th>)}</tr></thead>
      <tbody>{current.map((row, index) => <tr key={String((row as unknown as Record<string, unknown>).id ?? `${page}-${index}`)}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String((row as unknown as Record<string, unknown>)[column.key] ?? "—")}</td>)}</tr>)}
        {!current.length && <tr><td colSpan={columns.length} className="ad-table-empty">{search ? "No matching records. Try another search." : "Nothing to show here yet."}</td></tr>}
      </tbody></table></div>
    <div className="ad-mobile-cards">{current.map((row, index) => {
      const primary = columns[0];
      const secondary = columns[1];
      const rest = columns.slice(2).filter((column) => column.key !== "actions");
      const record = row as unknown as Record<string, unknown>;
      return <article key={String(record.id ?? `m-${index}`)} className="ad-mobile-card">
        <div className="ad-mobile-card-top"><div><div className="ad-mobile-card-title">{primary?.render ? primary.render(row) : String(record[primary?.key ?? ""] ?? "—")}</div>{secondary && <div className="ad-mobile-card-sub">{secondary.render ? secondary.render(row) : String(record[secondary.key] ?? "—")}</div>}</div>
          {columns.find((column) => column.key === "status")?.render?.(row)}
        </div>
        <div className="ad-mobile-fields">{rest.filter((column) => column.key !== "status" && column.key !== "actions").map((column) => <div className="ad-mobile-field" key={column.key}><span>{column.label}</span><strong>{column.render ? column.render(row) : String(record[column.key] ?? "—")}</strong></div>)}</div>
        {columns.find((column) => column.key === "actions")?.render && <div className="ad-row-actions">{columns.find((column) => column.key === "actions")?.render?.(row)}</div>}
      </article>;
    })}{!current.length && <div className="ad-mobile-card ad-table-empty">{search ? "No matching records. Try another search." : "Nothing to show here yet."}</div>}</div>
    <div className="ad-pagination"><span>{filtered.length ? `${page * 25 + 1}–${Math.min((page + 1) * 25, filtered.length)} of ${filtered.length}` : "0 records"}</span><div className="ad-pager-buttons"><button className="ad-icon-button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /></button><span style={{ alignSelf: "center", minWidth: 44, textAlign: "center" }}>{page + 1} / {pageCount}</span><button className="ad-icon-button" aria-label="Next page" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}><ChevronRight size={16} /></button></div></div>
  </div>;
}
