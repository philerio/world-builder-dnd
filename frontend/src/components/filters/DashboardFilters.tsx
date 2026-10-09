import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

export type FilterOption = {
  value: string;
  label: string;
};

export type DashboardFilter = {
  key: string;
  label: string;
  options: FilterOption[];
};

type DashboardFiltersProps = {
  search?: {
    label?: string;
    placeholder?: string;
  };
  filters?: DashboardFilter[];
  taggedEntities?: { tags?: string[] }[];
  onChange: (filters: Record<string, string>) => void;
};

function DashboardFilters({
  search,
  filters = [],
  taggedEntities = [],
  onChange,
}: DashboardFiltersProps) {
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const includeSearch = Boolean(search);
  const tagOptions = [...new Map(
    taggedEntities
      .flatMap((entity) => entity.tags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => [tag.toLocaleLowerCase(), tag] as const),
  ).values()].sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: "base" }),
  );
  const visibleFilters = tagOptions.length > 0
    ? [...filters, { key: "tag", label: "Tag", options: tagOptions.map((tag) => ({ value: tag, label: tag })) }]
    : filters;

  useEffect(() => {
    const values: Record<string, string> = {};

    if (includeSearch) {
      values.search = searchValue;
    }

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        values[key] = value;
      }
    });

    onChange(values);
  }, [includeSearch, searchValue, filterValues, onChange]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setSearchValue("");
    setFilterValues({});
  };

  const hasActiveFilters =
    searchValue.length > 0 ||
    Object.values(filterValues).some((value) => value.length > 0);

  return (
    <Box
      sx={{
        mb: 4,
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 1.5,
          alignItems: "center",
          minWidth: 0,
        }}
      >
        {search && (
          <TextField
            label={search.label ?? "Search"}
            placeholder={search.placeholder}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            size="small"
            sx={{
              minWidth: 0,
              width: "100%",
              gridColumn: { xs: "auto", lg: "span 2" },
            }}
          />
        )}

        {visibleFilters.map((filter) => (
          <FormControl
            key={filter.key}
            size="small"
            sx={{ minWidth: 0, width: "100%" }}
          >
            <InputLabel>{filter.label}</InputLabel>

            <Select
              value={filterValues[filter.key] ?? ""}
              label={filter.label}
              onChange={(event) =>
                handleFilterChange(filter.key, event.target.value)
              }
            >
              <MenuItem value="">All</MenuItem>

              {filter.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}

        {hasActiveFilters && (
          <Button
            variant="text"
            onClick={clearFilters}
            sx={{
              whiteSpace: "nowrap",
              gridColumn: "1 / -1",
              justifySelf: "end",
            }}
          >
            Clear filters
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default DashboardFilters;
