"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputFieldProps {
  value?: string;
  onChange?: (value?: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function PhoneInputField({
  value,
  onChange,
  placeholder = "+966 5X XXX XXXX",
  className,
  id,
}: PhoneInputFieldProps) {
  return (
    <div className={cn("phone-input-wrapper", className)}>
      <PhoneInput
        international
        defaultCountry="SA"
        countryCallingCodeEditable={false}
        value={value}
        onChange={(val) => onChange?.(val || undefined)}
        placeholder={placeholder}
        id={id}
      />
      <style jsx global>{`
        .phone-input-wrapper .PhoneInput {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .phone-input-wrapper .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .phone-input-wrapper .PhoneInputCountryIcon {
          width: 1.5rem;
          height: 1.125rem;
          border-radius: 2px;
          overflow: hidden;
        }
        .phone-input-wrapper .PhoneInputCountryIcon--border {
          box-shadow: none;
          background: none;
        }
        .phone-input-wrapper .PhoneInputCountrySelectArrow {
          width: 0.35rem;
          height: 0.35rem;
          border-color: hsl(var(--muted-foreground));
          opacity: 0.6;
        }
        .phone-input-wrapper .PhoneInputInput {
          flex: 1;
          height: 2.75rem;
          width: 100%;
          border-radius: calc(var(--radius) - 2px);
          border: 1px solid hsl(var(--border));
          background: transparent;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .phone-input-wrapper .PhoneInputInput::placeholder {
          color: hsl(var(--muted-foreground));
        }
        .phone-input-wrapper .PhoneInputInput:focus {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 1px hsl(var(--ring));
        }
        .phone-input-wrapper .PhoneInputCountrySelect {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          z-index: 1;
          border: 0;
          opacity: 0;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
