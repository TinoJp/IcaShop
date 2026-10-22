import { NavLink, Outlet } from 'react-router-dom';
import { Heart, LayoutDashboard, Package, ShieldCheck, UserRound } from 'lucide-react';

type AccountDashboardProps = {
  savedCount: number;
  isAdmin: boolean;
};

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold transition ${
    isActive ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-orange-50'
  }`;

export function AccountDashboard({ savedCount, isAdmin }: AccountDashboardProps) {
  return (
    <div className="mx-auto mt-6 max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex max-w-full gap-2 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-orange-100">
          <NavLink to="/account" end className={tabClass}>
            <LayoutDashboard size={16} /> Overview
          </NavLink>
          <NavLink to="/account/orders" className={tabClass}>
            <Package size={16} /> Orders
          </NavLink>
          <NavLink to="/account/saved" className={tabClass}>
            <Heart size={16} /> Saved
            {savedCount > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-600">{savedCount}</span>
            )}
          </NavLink>
          <NavLink to="/account/profile" className={tabClass}>
            <UserRound size={16} /> Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={tabClass}>
              <ShieldCheck size={16} /> Admin
            </NavLink>
          )}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}