import "server-only";
import type { PaymentProvider } from "./types";

/**
 * Returns the configured payment provider, or `null` when billing is not
 * enabled for this deployment. Callers must handle `null` by hiding checkout.
 */
export function getPaymentProvider(): PaymentProvider | null {
  return null;
}
