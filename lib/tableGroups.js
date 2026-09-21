// Shared column-group palette for the İllik TNA and İzləmə (Tracking)
// tables — the same five semantic bands (identity / competency / resource /
// gap-analysis / learning-plan) colored identically in both tables' on-screen
// headers and in their Excel exports, so "the same visual" holds everywhere.
export const GROUP_BG = {
  identity: 'var(--ink-50)', competency: 'var(--purple-light)', resource: 'var(--amber-light)',
  gap: 'var(--green-light)', plan: 'var(--blue-light)', meta: 'var(--ink-50)',
};
export const GROUP_TEXT = {
  identity: 'var(--ink-500)', competency: 'var(--purple)', resource: 'var(--amber)',
  gap: 'var(--green)', plan: 'var(--blue)', meta: 'var(--ink-500)',
};

// Same palette in Excel-safe ARGB hex — CSS custom properties don't resolve
// inside an .xlsx cell, so the export needs its own literal copy of the
// exact same colors used on screen.
export const GROUP_FILL_ARGB = {
  identity: 'FFEEF1F6', competency: 'FFF5F3FF', resource: 'FFFFFBEB',
  gap: 'FFF0FDF4', plan: 'FFEFF6FF', meta: 'FFEEF1F6',
};
export const GROUP_FONT_ARGB = {
  identity: 'FF64748B', competency: 'FF7C3AED', resource: 'FFD97706',
  gap: 'FF059669', plan: 'FF2563EB', meta: 'FF64748B',
};
