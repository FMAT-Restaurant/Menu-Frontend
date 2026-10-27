import { useEffect, useState } from "react";
import { canManualRetryAttempt, type SealedOperationAttempt } from "../application/operationAttempt";

/** Time only changes eligibility. Sending always requires an explicit user action. */
export function useRetryEligibility(attempt: SealedOperationAttempt | null) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!attempt?.retryAfterUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [attempt?.retryAfterUntil]);
  return attempt ? canManualRetryAttempt(attempt, now) : null;
}
