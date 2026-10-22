import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, LayoutDashboard, LogOut, Menu, Package, Receipt, Store, Tags, Users, BarChart3, Settings, ShieldCheck, X } from 'lucide-react';
import type { Profile } from '@/types';

type AdminLayoutProps = { profile: Profile | null; onExit: () => void; onSignOut: () => void };
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: Receipt }, { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags }, { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 }, { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/team', label: 'Admin access', icon: ShieldCheck }, { to: '/admin/activity', label: 'Activity log', icon: Activity },
];

export function AdminLayout({ profile, onExit, onSignOut }: AdminLayoutProps) {
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-600 hover:bg-orange-50'}`;
  const sidebar = <div className="flex h-full flex-col overflow-y-auto p-4"><div className="mb-6 flex items-center gap-2 px-2 pt-1"><img src="/logo.jpeg" alt="iCa" className="h-10 w-10 rounded-xl object-cover"/><div><p className="font-black leading-tight">iCa<span className="text-orange-500">.</span></p><p className="text-[11px] text-slate-500">Shop admin</p></div></div><nav className="space-y-1">{NAV.map(({ to,label,icon:Icon,end })=><NavLink key={to} to={to} end={end} className={linkClass} onClick={()=>setOpen(false)}><Icon size={18}/>{label}</NavLink>)}</nav><div className="mt-auto space-y-1 border-t border-orange-100 pt-4"><button onClick={onExit} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-orange-50"><Store size={18}/>Back to shop</button><button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-orange-50"><LogOut size={18}/>Sign out</button></div></div>;
  return <div className="min-h-screen bg-[#FAF7F4] text-[#0F172A]"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-orange-100 bg-white lg:block">{sidebar}</aside>{open&&<div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-slate-900/40" onClick={()=>setOpen(false)}/><aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside></div>}<div className="lg:pl-64"><header className="sticky top-0 z-30 flex items-center gap-3 border-b border-orange-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-8"><button className="rounded-xl p-2 hover:bg-orange-50 lg:hidden" onClick={()=>setOpen(!open)} aria-label={open?'Close menu':'Open menu'}>{open?<X size={22}/>:<Menu size={22}/>}</button><div className="ml-auto text-right"><p className="text-sm font-bold leading-tight">{profile?.full_name||'Admin'}</p><p className="text-[11px] text-slate-500">Administrator</p></div></header><main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-8"><Outlet/></main></div></div>;
}
