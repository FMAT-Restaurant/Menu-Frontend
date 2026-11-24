import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

interface NativeNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "min" | "max" | "step"> {
  id: string;
  integer?: boolean;
  errorMessage: string;
}

function validateNumber(input: HTMLInputElement, integer: boolean, errorMessage: string): string {
  input.setCustomValidity("");
  const number = input.valueAsNumber;
  const invalid = !input.validity.valid || !Number.isFinite(number) || number <= 0 || (integer && !Number.isSafeInteger(number));
  const message = invalid ? errorMessage : "";
  input.setCustomValidity(message);
  return message;
}

/** Native constraints and immediate feedback, without changing the captured value. */
export function NativeNumberInput({ integer = false, errorMessage, ...props }: Readonly<NativeNumberInputProps>) {
  const input = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!input.current) return;
    const message = validateNumber(input.current, integer, errorMessage);
    if (touched) setError(message);
  }, [props.value, integer, errorMessage, touched]);

  const externalError = props["aria-invalid"] === true || props["aria-invalid"] === "true";
  const errorId = `${props.id}-native-error`;
  const showError = Boolean(error) && !externalError;
  const description = [props["aria-describedby"], showError && errorId].filter(Boolean).join(" ") || undefined;
  return <>
    <input {...props} ref={input} type="number" min={integer ? 1 : 0} step={integer ? 1 : "any"}
      max={integer ? Number.MAX_SAFE_INTEGER : undefined} inputMode={integer ? "numeric" : "decimal"}
      aria-invalid={externalError || Boolean(error)} aria-describedby={description}
      onChange={event => {
        setTouched(true);
        setError(validateNumber(event.currentTarget, integer, errorMessage));
        props.onChange?.(event);
      }}
      onBlur={event => {
        setTouched(true);
        setError(validateNumber(event.currentTarget, integer, errorMessage));
        props.onBlur?.(event);
      }} />
    {showError && <p id={errorId} className="field-error" aria-live="polite">{error}</p>}
  </>;
}
