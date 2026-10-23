import type { ReactNode } from "react";
import { Empty } from "@/components/ui";

export type TableColumn<Row> = {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  className?: string;
};

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  label,
  className,
  emptyMessage,
}: {
  rows: readonly Row[];
  columns: readonly TableColumn<Row>[];
  rowKey: (row: Row) => string;
  label: string;
  className?: string;
  emptyMessage?: string;
}) {
  return (
    <div className="table-scroll">
      <table className={className} aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && emptyMessage && <Empty>{emptyMessage}</Empty>}
    </div>
  );
}
