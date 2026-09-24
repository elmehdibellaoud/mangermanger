import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable } from "./DataTable";

interface Row {
  id: number;
  name: string;
}

describe("DataTable", () => {
  const columns = [
    { key: "name", header: "Nom", accessor: (r: Row) => r.name },
  ];

  it("renders rows", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: 1, name: "Pizza" }, { id: 2, name: "Salade" }]}
        rowKey={(r) => r.id}
      />
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("Salade")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        empty="Rien ici."
      />
    );
    expect(screen.getByText("Rien ici.")).toBeInTheDocument();
  });
});
