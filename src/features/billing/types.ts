/**
 * Payment-provider abstraction. Phase 1 defines the contract and plan catalog
 * only; no provider is wired up, and checkout is not offered in the UI until a
 * provider implementation is registered in `getPaymentProvider()`.
 */
export type BillingInterval = "month" | "year";

export type CheckoutRequest = {
  organizationId: string;
  planId: string;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
};

export type CheckoutSession = { id: string; url: string };

export type PaymentProviderResult<T> = { ok: true; data: T } | { ok: false; reason: string };

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(request: CheckoutRequest): Promise<PaymentProviderResult<CheckoutSession>>;
  createBillingPortalSession(input: {
    organizationId: string;
    returnUrl: string;
  }): Promise<PaymentProviderResult<{ url: string }>>;
}
