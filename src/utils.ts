export const formatTsh = (amount: number) => `TSh ${amount.toLocaleString('en-TZ')}`;
export const normalizeTanzanianPhone = (value: string) => value.replace(/[^0-9+]/g, '');
export const isTanzanianPhone = (value: string) => /^(0[678][0-9]{8}|\+255[678][0-9]{8})$/.test(value);
export const orderStatusLabels: Record<string, string> = { pending: 'Pending', delivered: 'Delivered', cancelled: 'Cancelled' };
export const orderStatusStyles: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
