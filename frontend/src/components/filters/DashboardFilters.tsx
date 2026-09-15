import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
  onChange: (filters: Record<string, string>) => void;
};

function DashboardFilters({
  search,
  filters = [],
  onChange,
}: DashboardFiltersProps) {
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const values: Record<string, string> = {};

    if (search) {
      values.search = searchValue;
    }

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        values[key] = value;
      }
    });

    onChange(values);
  }, [search, searchValue, filterValues, onChange]);

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
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{
          gap: 2,
          alignItems: { xs: "stretch", md: "center" },
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
              minWidth: { md: 260 },
              flex: 1,
            }}
          />
        )}

        {filters.map((filter) => (
          <FormControl key={filter.key} size="small" sx={{ minWidth: 160 }}>
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
            sx={{ whiteSpace: "nowrap" }}
          >
            Clear filters
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export default DashboardFilters;
