import type { SelectHTMLAttributes } from "react";
type Option = { value: string; label: string };
export function FilterSelect({
  label,
  options,
  hideLabel = false,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly Option[];
  hideLabel?: boolean;
}) {
  const select = (
    <select {...props} aria-label={label}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  return hideLabel ? (
    select
  ) : (
    <label>
      {label}
      {select}
    </label>
  );
}
