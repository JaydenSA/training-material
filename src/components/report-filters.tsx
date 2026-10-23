import type { Employee } from "@/lib/demo";
import type { ReportFilters as Filters } from "@/lib/reporting";
import { FilterSelect } from "./filter-select";
export function ReportFilters({
  value,
  onChange,
  employees,
  fixedEmployee = false,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
  employees: Employee[];
  fixedEmployee?: boolean;
}) {
  return (
    <div className="report-filters">
      {!fixedEmployee && (
        <FilterSelect
          label="Report employee"
          value={value.employeeId}
          onChange={(event) =>
            onChange({ ...value, employeeId: event.target.value })
          }
          options={[
            { value: "", label: "All employees" },
            ...employees.map((employee) => ({
              value: employee.id,
              label: `${employee.name}${employee.deletedAt ? " (archived)" : ""}`,
            })),
          ]}
        />
      )}
      <label>
        Report from
        <input
          type="date"
          value={value.from}
          max={value.until || undefined}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
      </label>
      <label>
        Report until
        <input
          type="date"
          value={value.until}
          min={value.from || undefined}
          onChange={(event) =>
            onChange({ ...value, until: event.target.value })
          }
        />
      </label>
      <button
        className="button secondary"
        onClick={() =>
          onChange({
            employeeId: fixedEmployee ? value.employeeId : "",
            from: "",
            until: "",
          })
        }
      >
        Reset report filters
      </button>
      {value.from && value.until && value.from > value.until && (
        <p role="alert">The start date must be on or before the end date.</p>
      )}
    </div>
  );
}
