"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

type LabeledSelectProps = {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
  className,
  triggerClassName,
  placeholder,
  disabled,
}: LabeledSelectProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label>{label}</Label> : null}
      <Select
        value={value}
        onValueChange={(next) => {
          if (next != null) onValueChange(String(next));
        }}
        disabled={disabled}
      >
        <SelectTrigger className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
