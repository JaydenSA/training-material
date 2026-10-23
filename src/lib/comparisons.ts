import type { DemoState } from "./demo";
import {
  filterTips,
  previousPeriod,
  summariseTips,
  type ReportFilters,
} from "./reporting";
export function compareEmployees(
  state: DemoState,
  ids: readonly string[],
  filters: Pick<ReportFilters, "from" | "until">,
) {
  const prior = previousPeriod(filters.from, filters.until);
  return state.employees
    .filter((employee) => ids.includes(employee.id))
    .map((employee) => {
      const select = (range: typeof filters) =>
        filterTips(state.tips, { ...range, employeeId: employee.id });
      const currentTips = select(filters);
      return {
        employee,
        current: summariseTips(currentTips),
        previous: prior ? summariseTips(select(prior)) : null,
        writtenReviews: currentTips.filter(
          (tip) =>
            tip.status === "paid" &&
            tip.processingMode !== "test" &&
            tip.rating &&
            tip.review?.trim(),
        ).length,
      };
    });
}
