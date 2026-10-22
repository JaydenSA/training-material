export type Employee = { id: string; name: string; role: string; color: string; bio: string; visible: boolean; deletedAt: string | null };
export type Tip = { id: string; employeeId: string; amount: number; status: 'paid' | 'pending' | 'failed' | 'refunded' | 'cancelled'; createdAt: string; rating?: number };
export type Tag = { id: string; employeeId: string; type: 'NFC card' | 'QR stand'; status: 'active' | 'suspended' | 'deleted' };
export type DemoState = { restaurant: { name: string; slug: string; email: string; city: string }; employees: Employee[]; tips: Tip[]; tags: Tag[]; orders: { id: string; product: string; quantity: number; amount: number; createdAt: string }[]; plan: string; onboarded: boolean };
export const money = (cents: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(cents / 100);
export const initialState = (): DemoState => {
  const now = new Date();
  return {
    restaurant: { name: 'The Green Table', slug: 'the-green-table', email: 'hello@greentable.example', city: 'Cape Town' },
    employees: [
      { id: 'sarah', name: 'Sarah Jacobs', role: 'Head waiter', color: '#e3eee4', bio: 'Good food, warm welcomes, and making your day a little brighter.', visible: true, deletedAt: null },
      { id: 'thabo', name: 'Thabo Molefe', role: 'Waiter', color: '#f6e8d5', bio: 'Always happy to help you find your new favourite dish.', visible: true, deletedAt: null },
      { id: 'mia', name: 'Mia Williams', role: 'Barista', color: '#e8e5f1', bio: 'A great day starts with a great coffee.', visible: true, deletedAt: null },
      { id: 'james', name: 'James Petersen', role: 'Waiter', color: '#e2edf2', bio: 'Here to make every visit feel special.', visible: true, deletedAt: null },
    ],
    tips: Array.from({ length: 36 }, (_, i) => ({ id: `demo-${i + 1}`, employeeId: ['sarah', 'thabo', 'mia', 'james'][i % 4], amount: [5000, 3000, 10000, 2000, 7500, 4000][i % 6], status: i === 8 ? 'refunded' : i === 14 ? 'failed' : 'paid', createdAt: new Date(now.getTime() - i * 5 * 3600000).toISOString(), rating: i % 5 === 0 ? undefined : i % 7 === 0 ? 4 : 5 })),
    tags: [{ id: 'GT-001', employeeId: 'sarah', type: 'NFC card', status: 'active' }, { id: 'GT-002', employeeId: 'thabo', type: 'NFC card', status: 'active' }, { id: 'GT-003', employeeId: 'mia', type: 'QR stand', status: 'active' }, { id: 'GT-004', employeeId: 'james', type: 'NFC card', status: 'suspended' }],
    orders: [], plan: 'Restaurant', onboarded: true,
  };
};
export const ratingFor = (state: DemoState, id: string) => {
  const rated = state.tips.filter(t => t.employeeId === id && t.status === 'paid' && t.rating);
  return { count: rated.length, average: rated.length ? rated.reduce((sum, t) => sum + (t.rating || 0), 0) / rated.length : 0 };
};
