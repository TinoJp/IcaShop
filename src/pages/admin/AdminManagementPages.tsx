import { useEffect, useState, type FormEvent } from 'react';
import { Check, Download, MessageCircle, Search, ShieldCheck, Tag, Trash2, Truck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatTsh } from '@/utils';
import type { Category, OrderWithItems, ProductAdmin } from '@/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const box='rounded-2xl border border-orange-100 bg-white p-5 shadow-sm';
const input='w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100';
const action='inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50';
function ErrorMessage({text}:{text:string}){return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{text}</p>}

export function AdminCategories() {
  type Row = Category & { description: string | null; display_order: number };
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [categories, products] = await Promise.all([
      supabase.from('categories').select('id,name,slug,description,display_order').order('display_order'),
      supabase.from('products').select('category_id'),
    ]);
    if (categories.error || products.error) {
      setError('Could not load categories.');
      return;
    }
    setRows((categories.data ?? []) as Row[]);
    const productCounts = new Map<string, number>();
    (products.data ?? []).forEach(product => productCounts.set(product.category_id, (productCounts.get(product.category_id) ?? 0) + 1));
    setCounts(Object.fromEntries(productCounts));
  };
  useEffect(() => { void load(); }, []);

  const clearForm = () => { setEditing(null); setName(''); setDescription(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const clean = name.trim();
    const slug = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const result = editing
      ? await supabase.from('categories').update({ name: clean, slug, description: description.trim() }).eq('id', editing)
      : await supabase.from('categories').insert({ name: clean, slug, description: description.trim(), display_order: rows.length });
    if (result.error) setError(result.error.message);
    else { clearForm(); await load(); }
    setBusy(false);
  };
  const requestRemove = (row: Row) => {
    if (counts[row.id]) { setError(`Move ${counts[row.id]} products out of ${row.name} before deleting it.`); return; }
    setError('');
    setConfirming(row);
  };
  const remove = async () => {
    if (!confirming) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', confirming.id);
    if (deleteError) setError(deleteError.message);
    else { setConfirming(null); await load(); }
    setDeleting(false);
  };
  const move = async (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= rows.length) return;
    const currentRow = rows[index], nextRow = rows[next];
    const first = await supabase.from('categories').update({ display_order: nextRow.display_order }).eq('id', currentRow.id);
    if (first.error) { setError(first.error.message); return; }
    const second = await supabase.from('categories').update({ display_order: currentRow.display_order }).eq('id', nextRow.id);
    if (second.error) setError(second.error.message);
    await load();
  };

  return <>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className={box}>
        <div className="mb-4"><h2 className="text-lg font-black">Store categories</h2><p className="text-sm text-slate-500">Manage names and storefront order.</p></div>
        {error && <ErrorMessage text={error} />}
        <div className="mt-3 space-y-2">{rows.map((row, index) => <div key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 font-black text-orange-700">{index + 1}</span>
          <span className="flex-1"><b>{row.name}</b><small className="block text-slate-500">{counts[row.id] || 0} products</small></span>
          <button onClick={() => void move(index, -1)} disabled={index === 0} aria-label="Move up" className="rounded border px-2 py-1 disabled:opacity-30">↑</button>
          <button onClick={() => void move(index, 1)} disabled={index === rows.length - 1} aria-label="Move down" className="rounded border px-2 py-1 disabled:opacity-30">↓</button>
          <button onClick={() => { setEditing(row.id); setName(row.name); setDescription(row.description || ''); }} className="text-sm font-bold text-orange-700">Edit</button>
          <button onClick={() => requestRemove(row)} aria-label={`Delete ${row.name}`} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
        </div>)}</div>
        {!rows.length && <p className="text-sm text-slate-500">No categories yet.</p>}
      </section>
      <form onSubmit={save} className={`${box} h-fit`}>
        <div className="mb-4 flex items-center gap-2"><Tag className="text-orange-600" /><h2 className="font-black">{editing ? 'Edit category' : 'Add category'}</h2></div>
        <label className="mb-4 block text-sm font-bold">Name<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} className={`${input} mt-1.5`} /></label>
        <label className="mb-5 block text-sm font-bold">Description <span className="font-normal text-slate-400">optional</span><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} className={`${input} mt-1.5`} /></label>
        <button disabled={busy} className={action}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</button>
        {editing && <button type="button" onClick={clearForm} className="ml-2 rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button>}
      </form>
    </div>
    {confirming && <ConfirmDialog title="Remove this category?" message={`Are you sure you want to delete “${confirming.name}”? This action cannot be undone.`} confirmLabel="Delete category" busyLabel="Deleting…" busy={deleting} onCancel={() => setConfirming(null)} onConfirm={() => void remove()} />}
  </>;
}

export function AdminCustomers(){
 type Person={id:string;full_name:string;phone:string;address:string;created_at:string};type Order={id:string;user_id:string;grand_total:number;status:string;created_at:string};const [people,setPeople]=useState<Person[]>([]),[orders,setOrders]=useState<Order[]>([]),[search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;(async()=>{const [p,o]=await Promise.all([supabase.from('profiles').select('id,full_name,phone,address,created_at').eq('role','customer').order('created_at',{ascending:false}),supabase.from('orders').select('id,user_id,grand_total,status,created_at').order('created_at',{ascending:false})]);if(!live)return;if(p.error||o.error)setError('Could not load customer list. Check admin profile access.');else{setPeople(p.data??[]);setOrders(o.data??[])}})();return()=>{live=false}},[]);
 const filtered=people.filter(p=>`${p.full_name} ${p.phone}`.toLowerCase().includes(search.toLowerCase())),person=people.find(p=>p.id===selected),history=orders.filter(o=>o.user_id===selected);
 return <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className={box}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Customers <span className="text-slate-400">{filtered.length}</span></h2><p className="text-sm text-slate-500">Customer profiles and order history.</p></div><label className="flex items-center gap-2 rounded-xl border px-3"><Search size={15} className="text-orange-600"/><input aria-label="Search customers" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or phone" className="w-40 py-2 text-sm outline-none"/></label></div>{error&&<ErrorMessage text={error} />}{filtered.map(p=><button key={p.id} onClick={()=>setSelected(p.id)} className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left ${selected===p.id?'bg-orange-50':'hover:bg-slate-50'}`}><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 font-black text-orange-700">{p.full_name?.[0]?.toUpperCase()||'C'}</span><span className="flex-1"><b className="block">{p.full_name||'Customer'}</b><small className="text-slate-500">{p.phone||'No phone provided'}</small></span><small>{orders.filter(o=>o.user_id===p.id).length} orders</small></button>)}</section><section className={box}>{person?<><p className="text-xs font-bold uppercase tracking-wide text-orange-600">Customer profile</p><h2 className="mt-1 text-xl font-black">{person.full_name||'Customer'}</h2><p className="text-sm text-slate-600">{person.phone||'Phone not provided'}</p><p className="mt-2 text-sm text-slate-500">{person.address}</p>{person.phone&&<a target="_blank" rel="noreferrer" href={`https://wa.me/${person.phone.replace(/\D/g,'')}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700"><MessageCircle size={15}/>WhatsApp</a>}<h3 className="mt-5 font-black">Order history · {history.length}</h3><div className="mt-2 max-h-96 space-y-2 overflow-y-auto">{history.map(o=><div key={o.id} className="rounded-xl bg-[#faf8f5] p-3"><div className="flex justify-between"><b>#{o.id.slice(0,8).toUpperCase()}</b><span className="text-xs capitalize text-orange-700">{o.status}</span></div><div className="mt-1 flex justify-between text-xs text-slate-500"><span>{new Date(o.created_at).toLocaleDateString()}</span><b className="text-slate-900">{formatTsh(o.grand_total)}</b></div></div>)}</div></>:<div className="grid min-h-52 place-items-center text-center"><p><Users className="mx-auto mb-2 text-orange-500"/><b>Select a customer</b><span className="block text-sm text-slate-500">See profile and order history.</span></p></div>}</section></div>
}

export function AdminSettings({onPriceFilterMaxChange}:{onPriceFilterMaxChange:(value:number)=>void}){
 const [values,setValues]=useState({delivery_fee:'5000',free_delivery_threshold:'100000',monthly_target:'1000000',product_price_filter_max:'250000'}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;(async()=>{const {data,error:e}=await supabase.from('settings').select('setting_key,setting_value').in('setting_key',['delivery_fee','free_delivery_threshold','monthly_target','product_price_filter_max']);if(!live)return;if(e)setError('Could not load settings.');else for(const row of data??[]){switch(row.setting_key){case'delivery_fee':setValues(v=>({...v,delivery_fee:row.setting_value}));break;case'free_delivery_threshold':setValues(v=>({...v,free_delivery_threshold:row.setting_value}));break;case'monthly_target':setValues(v=>({...v,monthly_target:row.setting_value}));break;case'product_price_filter_max':setValues(v=>({...v,product_price_filter_max:row.setting_value}));break;}}})();return()=>{live=false}},[]);
 const save=async(e:FormEvent)=>{e.preventDefault();setError('');setNotice('');if(Object.values(values).some(v=>!Number.isSafeInteger(Number(v))||Number(v)<0)||Number(values.product_price_filter_max)<25000){setError('Enter whole TSh amounts; the maximum catalogue price must be at least TSh 25,000.');return}setBusy(true);const {error:e2}=await supabase.from('settings').upsert(Object.entries(values).map(([setting_key,setting_value])=>({setting_key,setting_value:String(Number(setting_value))})),{onConflict:'setting_key'});if(e2)setError(e2.message);else{onPriceFilterMaxChange(Number(values.product_price_filter_max));setNotice('Settings saved. The catalogue price filter will use the new maximum.')}setBusy(false)};
 return <div className="max-w-3xl"><div className={`${box} mb-5 bg-orange-50`}><Truck className="mb-2 text-orange-600"/><b>Delivery, sales and catalogue</b><p className="mt-1 text-sm text-slate-600">Existing orders keep the delivery fee saved when they were placed. Set the maximum catalogue filter price high enough to include your most expensive products.</p></div><form onSubmit={save} className={`${box} space-y-5`}>{[['delivery_fee','Nationwide delivery fee (TSh)'],['free_delivery_threshold','Free delivery from (TSh)'],['monthly_target','Monthly sales target (TSh)'],['product_price_filter_max','Maximum catalogue filter price (TSh)']].map(([key,label])=><label key={key} className="block text-sm font-bold">{label}<input type="number" min={key==='product_price_filter_max'?'25000':'0'} step="1" required value={values[key as keyof typeof values]} onChange={e=>setValues({...values,[key]:e.target.value})} className={`${input} mt-1.5`}/></label>)}{error&&<ErrorMessage text={error} />}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}<button disabled={busy} className={action}>{busy?'Saving…':<><Check size={16}/>Save settings</>}</button></form></div>
}

export function AdminReports(){
 const [orders,setOrders]=useState<OrderWithItems[]>([]),[products,setProducts]=useState<ProductAdmin[]>([]),[categories,setCategories]=useState<Category[]>([]),[range,setRange]=useState('30'),[error,setError]=useState('');
 useEffect(()=>{let live=true;(async()=>{const [o,p,c]=await Promise.all([supabase.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}),supabase.from('products').select('id,category_id,name,slug,sku,description,price,sale_price,stock,is_active,is_archived'),supabase.from('categories').select('id,name,slug')]);if(!live)return;if(o.error||p.error||c.error)setError('Could not load sales reports.');else{setOrders((o.data??[]) as OrderWithItems[]);setProducts((p.data??[]) as ProductAdmin[]);setCategories(c.data??[])}})();return()=>{live=false}},[]);
 const rows=orders.filter(o=>o.status!=='cancelled'&&(range==='all'||Date.parse(o.created_at)>=Date.now()-Number(range)*86400000)),items=rows.flatMap(o=>o.order_items??[]),revenue=rows.reduce((n,o)=>n+o.grand_total,0),leaders=[...new Set(items.map(i=>i.product_name))].map(name=>({name,units:items.filter(i=>i.product_name===name).reduce((n,i)=>n+i.quantity,0),amount:items.filter(i=>i.product_name===name).reduce((n,i)=>n+i.line_total,0)})).sort((a,b)=>b.units-a.units);
 const categoryTotals=categories.map(c=>({name:c.name,amount:items.filter(i=>products.find(p=>p.name===i.product_name)?.category_id===c.id).reduce((n,i)=>n+i.line_total,0)})).sort((a,b)=>b.amount-a.amount);
 const download=()=>{const csv=[['Order ID','Date','Customer','Phone','Status','Subtotal','Delivery','Total'],...rows.map(o=>[o.id,o.created_at,o.customer_name,o.customer_phone,o.status,o.total_amount,o.delivery_fee,o.grand_total])].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ica-sales-report.csv';a.click();URL.revokeObjectURL(a.href)};
 return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Cancelled orders are excluded from revenue.</p><div className="flex gap-2"><select value={range} onChange={e=>setRange(e.target.value)} className="rounded-xl border bg-white px-3 text-sm font-bold"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="all">All time</option></select><button onClick={download} className={action}><Download size={16}/>Export CSV</button></div></div>{error&&<ErrorMessage text={error} />}<div className="grid gap-4 sm:grid-cols-3"><div className={box}><small className="text-slate-500">Revenue</small><p className="mt-2 text-xl font-black">{formatTsh(revenue)}</p></div><div className={box}><small className="text-slate-500">Orders</small><p className="mt-2 text-xl font-black">{rows.length}</p></div><div className={box}><small className="text-slate-500">Units sold</small><p className="mt-2 text-xl font-black">{items.reduce((n,i)=>n+i.quantity,0)}</p></div></div><div className="grid gap-5 xl:grid-cols-2"><section className={box}><h2 className="mb-4 text-lg font-black">Top-selling products</h2>{leaders.slice(0,10).map((p,i)=><div key={p.name} className="flex gap-3 border-b py-3"><b className="text-orange-600">{i+1}</b><b className="flex-1">{p.name}</b><small>{p.units} units</small><b>{formatTsh(p.amount)}</b></div>)}</section><section className={box}><h2 className="mb-4 text-lg font-black">Category sales</h2>{categoryTotals.map(c=><div key={c.name} className="flex justify-between border-b py-3"><b>{c.name}</b><b>{formatTsh(c.amount)}</b></div>)}</section></div></div>
}

export function AdminTeam(){
 type Member={id:string;full_name:string;phone:string;role:string};const [members,setMembers]=useState<Member[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState<string|null>(null),[confirmMember,setConfirmMember]=useState<Member|null>(null);
 const load=async()=>{const {data,error:e}=await supabase.from('profiles').select('id,full_name,phone,role').order('full_name');if(e)setError('Could not load accounts. Apply the admin access migration.');else setMembers(data??[])};useEffect(()=>{void load()},[]);
 const change=async(p:Member)=>{const makeAdmin=p.role!=='admin';setBusy(p.id);setError('');setNotice('');const {error:e}=await supabase.rpc('set_ica_admin',{target_user_id:p.id,make_admin:makeAdmin});if(e)setError(e.message);else{setNotice('Admin access updated.');setConfirmMember(null);await load()}setBusy(null)};
 return <div className="space-y-5"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6"><b className="inline-flex items-center gap-2"><ShieldCheck size={17}/>Protected action.</b> Role changes use a server-side database function. It prevents removing your own access or the last admin.</div>{error&&<ErrorMessage text={error} />}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}<section className={box}>{confirmMember&&<ConfirmDialog title={confirmMember.role==='admin'?"Remove admin access?":"Grant admin access?"} message={`${confirmMember.role==='admin'?"Remove administrator access from":"Give administrator access to"} ${confirmMember.full_name||confirmMember.phone||"this account"}?`} confirmLabel={confirmMember.role==='admin'?"Remove access":"Grant access"} tone="orange" busy={busy===confirmMember.id} onCancel={()=>setConfirmMember(null)} onConfirm={()=>void change(confirmMember)}/>}<h2 className="mb-4 text-lg font-black">Registered accounts</h2>{members.map(p=><div key={p.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 font-black text-orange-700">{p.full_name?.[0]?.toUpperCase()||'U'}</span><span className="flex-1"><b>{p.full_name||'Unnamed account'}</b><small className="block text-slate-500">{p.phone}</small></span><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold capitalize text-orange-700">{p.role}</span><button disabled={busy===p.id} onClick={()=>setConfirmMember(p)} className="rounded-lg border px-3 py-2 text-xs font-bold hover:border-orange-300 disabled:opacity-50">{busy===p.id?'Saving…':p.role==='admin'?'Remove admin':'Make admin'}</button></div>)}</section></div>
}

export function AdminActivity(){
 type Entry={id:string;actor_id:string|null;action:string;entity_type:string;entity_id:string|null;created_at:string};
 const [entries,setEntries]=useState<Entry[]>([]);
 const [actorNames,setActorNames]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [confirming,setConfirming]=useState(false);
 const [clearing,setClearing]=useState(false);
 const load=async()=>{
   const {data,error:e}=await supabase.from('admin_audit_log').select('id,actor_id,action,entity_type,entity_id,created_at').order('created_at',{ascending:false}).limit(100);
   if(e){setError('Activity log could not be loaded. Apply the admin dashboard migration and check admin access.');return}
   const rows=(data??[]) as Entry[];
   setEntries(rows);
   const actorIds=[...new Set(rows.flatMap((entry)=>entry.actor_id?[entry.actor_id]:[]))];
   if(!actorIds.length){setActorNames({});setError('');return}
   const {data:profiles,error:profileError}=await supabase.from('profiles').select('id,full_name').in('id',actorIds);
   if(profileError){setError(`Activity log loaded, but admin names could not be loaded: ${profileError.message}`);return}
   setActorNames(Object.fromEntries((profiles??[]).map((profile)=>[profile.id,profile.full_name.trim().split(/\s+/)[0]||'Unknown admin'])));
   setError('');
 };
 useEffect(()=>{void load()},[]);
 const clear=async()=>{setClearing(true);setError('');setNotice('');const {data,error:e}=await supabase.rpc('admin_clear_ica_activity_log');if(e)setError(`Could not clear activity log: ${e.message}`);else{setEntries([]);setActorNames({});setConfirming(false);setNotice(`Activity log cleared (${data ?? 0} entries).`)}setClearing(false)};
 return <section className={box}>
   {confirming&&<ConfirmDialog title="Clear activity log?" message="This permanently deletes all admin activity records. This cannot be undone." confirmLabel="Clear activity log" busyLabel="Clearing…" busy={clearing} onCancel={()=>setConfirming(false)} onConfirm={()=>void clear()}/>}
   <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="mb-1 text-lg font-black">Recent admin activity</h2><p className="text-sm text-slate-500">Latest changes to orders, products, categories and settings.</p></div><button disabled={!entries.length||clearing} onClick={()=>setConfirming(true)} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"><Trash2 size={16}/>Clear logs</button></div>
   {error&&<ErrorMessage text={error} />}{notice&&<p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
   {entries.map(e=><div key={e.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3"><span className="rounded-lg bg-orange-50 p-2 text-orange-600"><Tag size={16}/></span><b className="flex-1 capitalize">{e.action} {e.entity_type}</b><small className="font-semibold text-slate-700">{e.actor_id?actorNames[e.actor_id]||'Unknown admin':'Unknown admin'}</small><small className="text-slate-500">{e.entity_id?.slice(0,8)}</small><time className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString('en-TZ')}</time></div>)}
   {!error&&!entries.length&&<p className="text-sm text-slate-500">No activity recorded.</p>}
 </section>
}
