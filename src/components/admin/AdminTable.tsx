import type { ReactNode } from 'react';

export interface AdminColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

/** Tabela simples do backoffice: cabeçalho e linhas; colunas numéricas alinhadas à direita. */
export function AdminTable({ columns, rows, caption }: { columns: AdminColumn[]; rows: Record<string, ReactNode>[]; caption: string }) {
  return (
    <table className="mg-admin-table">
      <caption className="mg-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" className={c.numeric ? 'mg-admin-table__num' : undefined}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} className={c.numeric ? 'mg-admin-table__num' : undefined}>
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
