import { Link, Route, Routes } from 'react-router-dom';
import { AdminOrders } from '@/components/AdminOrders';
import { AdminProducts } from '@/components/AdminProducts';
import type { Profile } from '@/types';
import { AdminLayout } from './AdminLayout';
import { AdminHome } from './AdminHome';
import { AdminActivity, AdminCategories, AdminCustomers, AdminReports, AdminSettings, AdminTeam } from './AdminManagementPages';

type AdminRoutesProps = {
  profile: Profile | null;
  onExit: () => void;
  onSignOut: () => void;
  onPriceFilterMaxChange: (value: number) => void;
};

export function AdminRoutes({ profile, onExit, onSignOut, onPriceFilterMaxChange }: AdminRoutesProps) {
  return <Routes><Route path="/admin" element={<AdminLayout profile={profile} onExit={onExit} onSignOut={onSignOut} />}>
    <Route index element={<AdminHome />} /><Route path="orders" element={<AdminOrders />} /><Route path="products" element={<AdminProducts onBack={onExit} />} />
    <Route path="categories" element={<AdminCategories />} /><Route path="customers" element={<AdminCustomers />} /><Route path="reports" element={<AdminReports />} />
    <Route path="settings" element={<AdminSettings onPriceFilterMaxChange={onPriceFilterMaxChange} />} /><Route path="team" element={<AdminTeam />} /><Route path="activity" element={<AdminActivity />} />
    <Route path="*" element={<div className="mt-10 text-center"><p className="text-lg font-bold">Page not found</p><Link to="/admin" className="mt-3 inline-block text-sm font-semibold text-orange-600">Back to dashboard</Link></div>} />
  </Route></Routes>;
}
