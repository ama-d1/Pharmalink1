// Shared pricing constants so the delivery fee can't drift out of sync between
// screens (previously hardcoded independently in order.tsx, CartReviewModal,
// and payment.tsx — fine for now since delivery pricing isn't backend-driven
// yet, see BACKEND_TODO.md).
export const DELIVERY_FEE = 5.0;
