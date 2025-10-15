import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Text,
} from "@chakra-ui/react";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { GroupBase, Select } from "chakra-react-select";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import {
  FixedPeriod,
  FixedPeriodType,
  Option,
  PickerProps,
  RelativePeriodType,
} from "../../interfaces";
import {
  createOptions2,
  fixedPeriods,
  relativePeriods,
} from "../../utils/utils";

const rangePresets: {
  label: string;
  value: [Dayjs, Dayjs];
}[] = [
    { label: "Last 7 Days", value: [dayjs().add(-7, "d"), dayjs()] },
    { label: "Last 14 Days", value: [dayjs().add(-14, "d"), dayjs()] },
    { label: "Last 30 Days", value: [dayjs().add(-30, "d"), dayjs()] },
    { label: "Last 90 Days", value: [dayjs().add(-90, "d"), dayjs()] },
  ];

const relativePeriodTypeOptions = createOptions2(
  [
    "Quarters",
    "Financial-Years",
  ],
  ["QUARTERLY", "FYJUL"]
);

const fixedPeriodTypeOptions = createOptions2(
  [
    "Quarterly",
    "Financial-Year (Start July)",
  ],
  fixedPeriods
);

const PeriodSelector = ({ selectedPeriods, onChange }: PickerProps) => {
  const onRangeChange = (
    dates: null | (Dayjs | null)[],
    dateStrings: string[]
  ) => {
    if (dates) {
    } else {
    }
  };
  const [relativePeriodType, setRelativePeriodType] =
    useState<RelativePeriodType>("FYJUL");
  const [fixedPeriodType, setFixedPeriodType] =
    useState<FixedPeriodType>("FYJUL");
  const availableRelativePeriods = relativePeriods[relativePeriodType].filter(
    ({ value }: Option) => {
      return !selectedPeriods.find(({ value: val }) => val === value);
    }
  );
  const [availableFixedPeriods, setAvailableFixedPeriods] = useState<
    Array<FixedPeriod>
  >([]);
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [year, setYear] = useState<number>(dayjs().year());

  useEffect(() => {
    setAvailableFixedPeriods(
      generateFixedPeriods({
        year,
        calendar: "iso8601",
        periodType: fixedPeriodType as any,
        locale: "en",
      }).filter(({ id }) => !selectedPeriods.find(({ value }) => value === id))
    );
  }, [fixedPeriodType, year, selectedPeriods]);

  return (
    <Stack direction="row" p="2px" w="100%">
      <Stack
        flex={1}
        borderColor="gray.200"
        borderStyle="solid"
        borderWidth="1px"
      >
        <Stack spacing="20px">
          <Stack direction="row">
            <Stack flex={1}>
              <Text>Period Options</Text>
              <Select<Option, false, GroupBase<Option>>
                isClearable
                onChange={(e) => {
                  setFixedPeriodType(
                    () => (e?.value as FixedPeriodType) || "FYJUL"
                  );
                }}
                value={fixedPeriodTypeOptions.find(
                  ({ value }) => value === fixedPeriodType
                )}
                options={fixedPeriodTypeOptions}
                size="sm"
              />
            </Stack>
            <Stack w="100px">
              <Text>Year</Text>
              <NumberInput
                size="sm"
                min={1900}
                max={new Date().getFullYear()}
                value={year}
                onChange={(_, val) => {
                  setYear(() => val);
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </Stack>
          </Stack>
          <Stack overflow="auto" maxH="300px">
            {availableFixedPeriods
              .filter(period => {
                // Filter out future periods
                const periodEndDate = new Date(period.endDate);
                const today = new Date();
                return periodEndDate <= today;
              })
              .map((val) => (
              <Text
                key={val.id}
                cursor="pointer"
                onClick={() =>
                  onChange(
                    [
                      {
                        value: val.id,
                        label: val.name,
                        type: "fixed",
                      },
                    ],
                    false
                  )
                }
              >
                {val.name}
              </Text>
            ))}
          </Stack>
        </Stack>
      </Stack>
      <Stack
        flex={1}
        borderColor="gray.200"
        borderStyle="solid"
        borderWidth="1px"
        minH="200px"
      >
        <Stack p={3} bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
          <Text fontSize="sm" fontWeight="semibold">Selected Period</Text>
        </Stack>
        <Stack p={3} overflow="auto" maxH="200px">
          {selectedPeriods.length > 0 ? (
            selectedPeriods.map(({ value, label }) => (
              <Text
                key={value}
                cursor="pointer"
                onClick={() => onChange([], true)}
                bg="blue.50"
                p={2}
                borderRadius="md"
                fontSize="sm"
              >
                {label} ✕
              </Text>
            ))
          ) : (
            <Text fontSize="sm" color="gray.500">
              No period selected
            </Text>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
};

export default PeriodSelector;
