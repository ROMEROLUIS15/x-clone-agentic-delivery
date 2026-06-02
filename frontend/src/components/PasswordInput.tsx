import React, { useState } from "react";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
}

const EYE_OPEN = "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z";
const EYE_CLOSED = "M12 7a5 5 0 015 5c0 .65-.13 1.26-.36 1.83l2.92 2.92A11.91 11.91 0 0023 12c-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16A4.97 4.97 0 0112 7zM2 4.27l2.28 2.28.46.46A11.81 11.81 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65a3 3 0 003 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 01-5-5c0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16a3 3 0 00-3-3l-.17.01z";

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id, value, onChange, placeholder, disabled,
  required, maxLength, autoComplete = "current-password",
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        className="form-input password-input"
        type={visible ? "text" : "password"}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d={visible ? EYE_CLOSED : EYE_OPEN} />
        </svg>
      </button>
    </div>
  );
};
