import './_group.css';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Archive,
  ArrowDownUp,
  Box,
  Check,
  ImagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  quantity: number;
  category: string;
  tone: string;
  detail: string;
  image?: string;
};

const INITIAL_PRODUCTS: Product[] = [
  { id: 'drawer-1', name: '玻尿酸保濕精華', quantity: 2, category: '保養', tone: 'bg-[hsl(183_45%_80%)]', detail: '透明滴管瓶' },
  { id: 'drawer-2', name: '柔霧持色唇釉 05', quantity: 4, category: '彩妝', tone: 'bg-[hsl(7_78%_59%)]', detail: '珊瑚紅管身' },
  { id: 'drawer-3', name: '清爽防曬乳 SPF50+', quantity: 0, category: '防曬', tone: 'bg-[hsl(77_62%_58%)]', detail: '白色軟管' },
  { id: 'drawer-4', name: '晚安修護面膜', quantity: 1, category: '保養', tone: 'bg-[hsl(257_55%_86%)]', detail: '紫色鋁管' },
  { id: 'drawer-5', name: '卸妝潔顏油', quantity: 3, category: '清潔', tone: 'bg-[hsl(42_83%_78%)]', detail: '琥珀按壓瓶' },
];

const CATEGORIES = ['全部', '保養', '彩妝', '清潔', '防曬'];

function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  if (product.image) {
    return <img src={product.image} alt={`${product.name} 商品照片`} className="h-full w-full object-cover" />;
  }
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden ${product.tone}`} aria-label={`${product.name} 商品示意圖`}>
      <div className={`relative ${large ? 'h-32 w-20' : 'h-24 w-16'} rounded-[10px] bg-[hsl(0_0%_98%/.86)] shadow-[8px_12px_18px_hsl(222_35%_17%/.18)]`}>
        <div className="absolute left-1/2 top-0 h-3 w-10 -translate-x-1/2 rounded-b bg-[hsl(222_35%_17%/.2)]" />
        <div className="absolute bottom-7 left-1/2 w-full -translate-x-1/2 text-center text-[8px] font-bold tracking-[.08em] text-[hsl(222_35%_17%/.62)]">BEAUTY</div>
        <div className="absolute bottom-2 left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-[hsl(7_78%_59%/.7)]" />
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-[hsl(0_0%_100%/.55)] px-1.5 py-0.5 text-[9px] font-semibold text-[hsl(222_35%_17%/.7)]">{product.detail}</span>
    </div>
  );
}

function AddSheet({ onAdd, onClose }: { onAdd: (product: Product) => void; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('保養');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('請選擇圖片檔案。'); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setError(''); };
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('請輸入商品名稱。'); return; }
    onAdd({
      id: `drawer-${Date.now()}`,
      name: name.trim(),
      quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
      category,
      image,
      tone: 'bg-[hsl(183_45%_80%)]',
      detail: '新加入商品',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(222_35%_17%/.3)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-drawer-title" className="organize-in w-full max-w-lg rounded-t-[28px] bg-[hsl(var(--drawer-panel))] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-[10px] font-bold tracking-[.2em] text-[hsl(var(--drawer-coral))]">放進抽屜</p><h2 id="add-drawer-title" className="mt-1 text-xl font-extrabold">新增一件商品</h2></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--drawer-paper))]" aria-label="關閉新增商品"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input ref={fileRef} id="drawer-photo" type="file" accept="image/*" onChange={handleFile} className="sr-only" />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[hsl(var(--drawer-coral)/.5)] bg-[hsl(7_78%_59%/.06)] text-sm font-bold text-[hsl(var(--drawer-coral-dark))]" aria-label="上傳商品照片">
            {image ? <img src={image} alt="商品照片預覽" className="h-full w-full rounded-2xl object-cover" /> : <><ImagePlus size={20} />{` ${'上傳商品照片'}`}</>}
          </button>
          <div><label htmlFor="drawer-name" className="mb-1.5 block text-xs font-bold">商品名稱</label><input id="drawer-name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="例如：玻尿酸保濕精華" className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm outline-none focus:border-[hsl(var(--drawer-coral))] focus:ring-4 focus:ring-[hsl(var(--drawer-coral)/.12)]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="drawer-quantity" className="mb-1.5 block text-xs font-bold">目前數量</label><input id="drawer-quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]" /></div>
            <div><label htmlFor="drawer-category" className="mb-1.5 block text-xs font-bold">分類</label><select id="drawer-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm outline-none"><option>保養</option><option>彩妝</option><option>清潔</option><option>防曬</option></select></div>
          </div>
          {error && <p role="alert" className="text-xs font-bold text-[hsl(var(--drawer-coral-dark))]">{error}</p>}
          <button type="submit" className="h-12 w-full rounded-xl bg-[hsl(var(--drawer-coral))] text-sm font-extrabold text-white shadow-[0_8px_18px_hsl(7_78%_59%/.25)]">放入我的抽屜</button>
        </form>
      </section>
    </div>
  );
}

function DeleteDialog({ product, onCancel, onConfirm }: { product: Product; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel(); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [onCancel]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(222_35%_17%/.35)] p-5 backdrop-blur-sm" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
    <div role="dialog" aria-modal="true" aria-labelledby="remove-title" className="organize-in w-full max-w-sm rounded-3xl bg-[hsl(var(--drawer-panel))] p-6 shadow-2xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(7_78%_59%/.12)] text-[hsl(var(--drawer-coral))]"><Trash2 size={20} /></div>
      <h2 id="remove-title" className="text-lg font-extrabold">從抽屜移除這件商品？</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--drawer-muted))]">「{product.name}」將會被刪除，這個動作無法復原。</p>
      <div className="mt-6 flex gap-3"><button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl border border-[hsl(var(--drawer-line))] text-sm font-bold">先留著</button><button type="button" onClick={onConfirm} className="h-11 flex-1 rounded-xl bg-[hsl(var(--drawer-coral))] text-sm font-bold text-white">確認移除</button></div>
    </div>
  </div>;
}

function ProductTile({ product, onChange, onDelete }: { product: Product; onChange: (amount: number) => void; onDelete: () => void }) {
  const empty = product.quantity === 0;
  return <article className="drawer-card overflow-hidden rounded-[22px] border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-panel))]">
    <div className="relative aspect-[1.18/1]"><ProductVisual product={product} /><span className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-extrabold ${empty ? 'bg-[hsl(var(--drawer-ink))] text-white' : product.quantity <= 2 ? 'bg-[hsl(42_83%_78%)]' : 'bg-[hsl(0_0%_100%/.82)]'}`}>{empty ? '用曬啦' : product.quantity <= 2 ? '快用完' : '使用中'}</span><button type="button" onClick={onDelete} aria-label={`刪除 ${product.name}`} className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(0_0%_100%/.86)] text-[hsl(var(--drawer-muted))]"><Trash2 size={15} /></button></div>
    <div className="p-3.5"><div className="flex min-h-[54px] items-start justify-between gap-2"><div><p className="text-[10px] font-bold text-[hsl(var(--drawer-muted))]">{product.category}</p><h3 className="mt-1 text-sm font-extrabold leading-5">{product.name}</h3></div><div className="text-right"><strong className={`block text-2xl font-black leading-none ${empty ? 'text-[hsl(var(--drawer-coral))]' : ''}`}>{product.quantity}</strong><span className="text-[9px] text-[hsl(var(--drawer-muted))]">件</span></div></div>
      <div className="mt-3 grid grid-cols-4 gap-1.5"><button type="button" disabled={empty} onClick={() => onChange(-1)} className="flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--drawer-line))] text-xs font-extrabold disabled:opacity-30" aria-label={`從${product.name}扣除一件`}>−1</button><button type="button" disabled={empty} onClick={() => onChange(-2)} className="flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--drawer-line))] text-xs font-extrabold disabled:opacity-30" aria-label={`從${product.name}扣除兩件`}>−2</button><button type="button" disabled={empty} onClick={() => onChange(-3)} className="flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--drawer-line))] text-xs font-extrabold disabled:opacity-30" aria-label={`從${product.name}扣除三件`}>−3</button><button type="button" onClick={() => onChange(1)} className="flex h-9 items-center justify-center rounded-lg bg-[hsl(77_62%_58%/.38)] text-xs font-extrabold text-[hsl(222_35%_17%)]" aria-label={`替${product.name}補貨一件`}>+1</button></div>
    </div>
  </article>;
}

export function Organized() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const filtered = useMemo(() => products.filter((p) => (!query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase())) && (category === '全部' || p.category === category)), [products, query, category]);
  const total = products.reduce((sum, p) => sum + p.quantity, 0);
  const low = products.filter((p) => p.quantity > 0 && p.quantity <= 2).length;
  const updateQuantity = (id: string, amount: number) => setProducts((items) => items.map((p) => p.id === id ? { ...p, quantity: Math.max(0, p.quantity + amount) } : p));
  const addProduct = (product: Product) => setProducts((items) => [product, ...items]);
  const remove = () => { if (deleteTarget) setProducts((items) => items.filter((p) => p.id !== deleteTarget.id)); setDeleteTarget(null); };

  return <div className="organized-beauty-root drawer-noise min-h-[100dvh] bg-[hsl(var(--drawer-paper))]">
    <main className="drawer-surface min-h-[100dvh] pb-24">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-7 sm:pt-8">
        <header className="organize-in flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--drawer-ink))] text-[hsl(var(--drawer-lime))]"><Box size={20} /></div><div><p className="text-[15px] font-black tracking-tight">我的美妝抽屜</p><p className="text-[9px] font-bold tracking-[.22em] text-[hsl(var(--drawer-muted))]">BEAUTY DRAWER</p></div></div><button type="button" onClick={() => setSheetOpen(true)} className="flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--drawer-coral))] px-4 text-sm font-extrabold text-white shadow-[0_7px_16px_hsl(7_78%_59%/.25)]"><Plus size={18} />新增</button></header>
        <section className="organize-in organize-delay-1 mt-7 overflow-hidden rounded-[27px] bg-[hsl(var(--drawer-ink))] p-5 text-white drawer-shadow sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold tracking-[.16em] text-[hsl(var(--drawer-aqua))]">今日抽屜狀態</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">一眼找到，<span className="text-[hsl(var(--drawer-lime))]">剛剛好。</span></h1></div><ArrowDownUp className="text-[hsl(var(--drawer-aqua))]" size={22} /></div><div className="mt-7 flex items-end justify-between"><div><strong className="text-5xl font-black leading-none">{total}</strong><span className="ml-2 text-sm text-white/60">件存貨</span></div><div className="text-right text-xs text-white/60"><p>{products.length} 件商品</p><p className="mt-1 text-[hsl(var(--drawer-lime))]">{low} 件需要留意</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[hsl(var(--drawer-lime))]" style={{ width: `${Math.min(100, products.length ? (total / (products.length * 5)) * 100 : 0)}%` }} /></div></section>
        <section className="organize-in organize-delay-2 mt-7" aria-labelledby="collection-heading"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.18em] text-[hsl(var(--drawer-coral))]">我的收藏</p><h2 id="collection-heading" className="mt-1 text-2xl font-black">抽屜裡有什麼</h2></div><span className="rounded-full bg-[hsl(var(--drawer-panel))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--drawer-muted))]">{filtered.length} 件</span></div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="商品分類">{CATEGORIES.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${category === item ? 'bg-[hsl(var(--drawer-ink))] text-white' : 'bg-[hsl(var(--drawer-panel))] text-[hsl(var(--drawer-muted))]'}`}>{item}</button>)}</div>
          <div className="relative mt-4"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--drawer-muted))]" /><label htmlFor="organized-search" className="sr-only">搜尋商品</label><input id="organized-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋商品名稱" className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-panel))] pl-10 pr-10 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]" /><SlidersHorizontal size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--drawer-muted))]" /></div>
        </section>
        {products.length === 0 ? <section className="organize-in mt-6 flex min-h-[380px] flex-col items-center justify-center rounded-[26px] border border-dashed border-[hsl(var(--drawer-coral)/.35)] bg-[hsl(7_78%_59%/.05)] px-6 text-center"><div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[hsl(7_78%_59%/.12)] text-[hsl(var(--drawer-coral))]"><Archive size={35} strokeWidth={1.5} /></div><h3 className="text-xl font-black">抽屜現在是空的</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[hsl(var(--drawer-muted))]">把常用的保養和彩妝收進來，之後找東西會更快。</p><button type="button" onClick={() => setSheetOpen(true)} className="mt-5 rounded-xl bg-[hsl(var(--drawer-coral))] px-5 py-3 text-sm font-extrabold text-white">新增第一件商品</button></section> : filtered.length === 0 ? <section className="mt-6 flex min-h-[230px] flex-col items-center justify-center rounded-[26px] bg-[hsl(var(--drawer-panel))] text-center"><Search size={28} className="text-[hsl(var(--drawer-muted))]" /><p className="mt-3 font-bold">找不到相符商品</p><button type="button" onClick={() => { setQuery(''); setCategory('全部'); }} className="mt-3 text-xs font-bold text-[hsl(var(--drawer-coral))]">清除篩選</button></section> : <div className="organize-in organize-delay-3 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <ProductTile key={product.id} product={product} onChange={(amount) => updateQuantity(product.id, amount)} onDelete={() => setDeleteTarget(product)} />)}</div>}
        <footer className="mt-8 flex items-center justify-between border-t border-[hsl(var(--drawer-line))] pt-5 text-xs text-[hsl(var(--drawer-muted))]"><span className="flex items-center gap-1.5"><Check size={14} className="text-[hsl(var(--drawer-coral))]" /> 每一件都記得很清楚</span><span className="font-bold">收納完成</span></footer>
      </div>
    </main>
    <button type="button" onClick={() => setSheetOpen(true)} className="fixed bottom-5 right-5 z-20 flex h-14 items-center gap-2 rounded-2xl bg-[hsl(var(--drawer-coral))] px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_hsl(7_78%_59%/.3)] sm:hidden"><Plus size={19} />新增商品</button>
    {sheetOpen && <AddSheet onAdd={addProduct} onClose={() => setSheetOpen(false)} />}
    {deleteTarget && <DeleteDialog product={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
  </div>;
}