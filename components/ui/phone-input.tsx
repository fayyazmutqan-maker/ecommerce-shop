"use client";

import PhoneInput from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/utils";
import "./phone-input.css";

interface PhoneInputFieldProps {
  value?: string;
  onChange?: (value?: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  defaultCountry?: Country;
  countries?: Country[];
  onCountryChange?: (country?: Country) => void;
}

export function PhoneInputField({
  value,
  onChange,
  placeholder = "+966 5X XXX XXXX",
  className,
  id,
  defaultCountry = "SA",
  countries,
  onCountryChange,
}: PhoneInputFieldProps) {
  return (
    <PhoneInput
      international
      defaultCountry={defaultCountry}
      countries={countries}
      countryCallingCodeEditable={false}
      value={value}
      onChange={(val) => onChange?.(val || undefined)}
      onCountryChange={onCountryChange}
      placeholder={placeholder}
      id={id}
      flags={flags}
      className={cn("phone-input-field", className)}
    />
  );
}
