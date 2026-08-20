import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  CirclePlus,
  ImagePlus,
  Minus,
  PackageOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  quantity: number;
  image?: string;
  createdAt: string;
};

const STORAGE_KEY = 'beauty-shelf-products';

function readProducts(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as Product[] : [];
  } catch {
    return [];
  }
}

function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (product.image && !failed) {
    return (
      <img
        src={product.image}
        alt={`${product.name} 商品照片`}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${large ? '' : 'transition-transform duration-500 group-hover:scale-105'}`}
        data-testid={`img-product-${product.id}`}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-[hsl(23_48%_91%)] text-[hsl(346_53%_49%)]" data-testid={`img-placeholder-${product.id}`}>
      <PackageOpen size={large ? 42 : 32} strokeWidth={1.25} />
    </div>
  );
}

function AddProductPanel({ onAdd }: { onAdd: (product: Product) => void }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔案。');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('圖片大小請少於 5MB。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setImageName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('請為這件寶貝寫下名字。');
      return;
    }
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
      image,
      createdAt: new Date().toISOString(),
    });
    setName('');
    setQuantity('1');
    setImage('');
    setImageName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="soft-shadow relative overflow-hidden rounded-[2rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-7" aria-labelledby="add-heading">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[hsl(346_53%_49%/.09)] blur-2xl" />
      <div className="relative">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[.22em] text-[hsl(var(--primary))]">KEEP IT CLOSE</p>
            <h2 id="add-heading" className="font-display text-2xl tracking-tight text-[hsl(var(--foreground))]">收進你的美妝架</h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">記下每一件被你珍惜的日常。</p>
          </div>
          <div className="rounded-2xl bg-[hsl(22_59%_65%/.16)] p-3 text-[hsl(var(--primary))]">
            <CirclePlus size={22} strokeWidth={1.7} />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="product-photo" className="mb-2 block text-sm font-semibold">商品照片 <span className="font-normal text-[hsl(var(--muted-foreground))]">（選填）</span></label>
            <input ref={fileRef} id="product-photo" type="file" accept="image/*" onChange={handleFile} className="sr-only" data-testid="input-product-photo" />
            {image ? (
              <div className="group relative h-36 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                <img src={image} alt="即將加入的商品照片" className="h-full w-full object-cover" data-testid="img-upload-preview" />
                <button type="button" onClick={() => { setImage(''); setImageName(''); if (fileRef.current) fileRef.current.value = ''; }} className="absolute right-2 top-2 rounded-full bg-[hsl(var(--foreground)/.72)] p-2 text-[hsl(var(--card))] transition-transform hover:scale-105" aria-label="移除照片" data-testid="button-remove-photo"><X size={16} /></button>
                <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-lg bg-[hsl(var(--foreground)/.68)] px-2 py-1 text-xs text-[hsl(var(--card))]">{imageName}</span>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-28 w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-[hsl(346_53%_49%/.35)] bg-[hsl(346_53%_49%/.045)] text-sm font-medium text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(346_53%_49%/.09)]" data-testid="button-upload-photo">
                <ImagePlus size={20} strokeWidth={1.7} />
                上傳一張照片
              </button>
            )}
          </div>
          <div>
            <label htmlFor="product-name" className="mb-2 block text-sm font-semibold">商品名稱</label>
            <input id="product-name" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder="例如：玫瑰保濕精華" className="h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(30_47%_99%)] px-4 text-[15px] outline-none transition-[border,box-shadow] placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]" data-testid="input-product-name" />
          </div>
          <div>
            <label htmlFor="product-quantity" className="mb-2 block text-sm font-semibold">目前數量</label>
            <div className="relative">
              <input id="product-quantity" type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(30_47%_99%)] px-4 pr-14 text-[15px] outline-none transition-[border,box-shadow] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]" data-testid="input-product-quantity" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))]">件</span>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-[hsl(var(--destructive))]" role="alert" data-testid="text-form-error">{error}</p>}
          <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-bold tracking-wide text-[hsl(var(--primary-foreground))] shadow-[0_7px_18px_hsl(var(--primary)/.22)] transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="button-add-product">
            <Plus size={18} strokeWidth={2.4} />
            收進美妝架
          </button>
        </form>
      </div>
    </section>
  );
}

function QuantityButtons({ product, onChange }: { product: Product; onChange: (amount: number) => void }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${product.name} 數量調整`}>
      {[1, 2, 3].map((amount) => (
        <button key={amount} type="button" disabled={product.quantity === 0} onClick={() => onChange(-amount)} className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(30_47%_99%)] px-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:bg-[hsl(346_53%_49%/.08)] hover:text-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-35" data-testid={`button-deduct-${amount}-${product.id}`}>
          −{amount}
        </button>
      ))}
      <button type="button" onClick={() => onChange(1)} className="ml-auto flex h-9 items-center gap-1 rounded-lg bg-[hsl(346_53%_49%/.11)] px-3 text-xs font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(346_53%_49%/.18)]" data-testid={`button-restock-${product.id}`}>
        <Plus size={15} strokeWidth={2.4} /> 補貨
      </button>
    </div>
  );
}

function ProductCard({ product, onChange, onDelete }: { product: Product; onChange: (amount: number) => void; onDelete: () => void }) {
  const finished = product.quantity === 0;
  const low = product.quantity > 0 && product.quantity <= 2;
  return (
    <article className={`group card-shadow overflow-hidden rounded-[1.45rem] border bg-[hsl(var(--card))] transition-transform duration-300 hover:-translate-y-1 ${finished ? 'border-[hsl(346_53%_49%/.25)]' : 'border-[hsl(var(--card-border))]'}`} data-testid={`card-product-${product.id}`}>
      <div className="relative aspect-[1.35/1] overflow-hidden bg-[hsl(24_36%_91%)]">
        <ProductImage product={product} />
        <div className="absolute left-3 top-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${finished ? 'bg-[hsl(346_53%_49%)] text-[hsl(var(--primary-foreground))]' : low ? 'bg-[hsl(22_59%_65%/.9)] text-[hsl(var(--foreground))]' : 'bg-[hsl(30_47%_99%/.86)] text-[hsl(var(--foreground))]'}`} data-testid={`status-product-${product.id}`}>
            {finished ? '用曬啦' : low ? '快用完了' : '使用中'}
          </span>
        </div>
        <button type="button" onClick={onDelete} className="absolute right-3 top-3 rounded-full bg-[hsl(30_47%_99%/.85)] p-2 text-[hsl(var(--muted-foreground))] opacity-0 shadow-sm transition-opacity hover:text-[hsl(var(--destructive))] group-hover:opacity-100 focus:opacity-100" aria-label={`刪除 ${product.name}`} data-testid={`button-delete-${product.id}`}><Trash2 size={16} strokeWidth={1.8} /></button>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-h-12 text-[15px] font-bold leading-6 text-[hsl(var(--foreground))]" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
          <div className="shrink-0 text-right">
            <span className={`block font-display text-3xl leading-none ${finished ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`} data-testid={`text-quantity-${product.id}`}>{product.quantity}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">剩餘</span>
          </div>
        </div>
        <QuantityButtons product={product} onChange={onChange} />
      </div>
    </article>
  );
}

function DeleteDialog({ product, onCancel, onConfirm }: { product: Product; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[hsl(334_32%_20%/.32)] p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="rise-in w-full max-w-sm rounded-[1.6rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(346_53%_49%/.12)] text-[hsl(var(--primary))]"><Trash2 size={20} strokeWidth={1.8} /></div>
        <h2 id="delete-title" className="font-display text-xl">要把這件寶貝移除嗎？</h2>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">「{product.name}」會從你的美妝架消失，這個動作無法復原。</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl border border-[hsl(var(--border))] text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))]" data-testid="button-cancel-delete">先留著</button>
          <button type="button" onClick={onConfirm} className="h-11 flex-1 rounded-xl bg-[hsl(var(--destructive))] text-sm font-bold text-[hsl(var(--destructive-foreground))] transition-transform hover:-translate-y-0.5" data-testid="button-confirm-delete">確認移除</button>
        </div>
      </div>
    </div>
  );
}

function Summary({ products }: { products: Product[] }) {
  const low = products.filter((product) => product.quantity > 0 && product.quantity <= 2).length;
  const finished = products.filter((product) => product.quantity === 0).length;
  const stats = [
    { label: '全部寶貝', value: products.length, mark: <Archive size={16} /> },
    { label: '快用完了', value: low, mark: <ChevronDown size={17} /> },
    { label: '已用曬', value: finished, mark: <Check size={16} /> },
  ];
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3" aria-label="庫存摘要">
      {stats.map((stat, index) => (
        <div key={stat.label} className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-3.5 sm:px-4 ${index === 1 ? 'bg-[hsl(22_59%_65%/.1)]' : ''}`} data-testid={`summary-${index}`}>
          <div className="mb-2 flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">{stat.mark}<span className="text-[11px] font-medium sm:text-xs">{stat.label}</span></div>
          <p className="font-display text-2xl leading-none text-[hsl(var(--foreground))]" data-testid={`text-summary-value-${index}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function Home() {
  const [products, setProducts] = useState<Product[]>(readProducts);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter((product) => product.name.toLowerCase().includes(normalized));
  }, [products, query]);

  const addProduct = (product: Product) => setProducts((current) => [product, ...current]);
  const changeQuantity = (id: string, amount: number) => setProducts((current) => current.map((product) => product.id === id ? { ...product, quantity: Math.max(0, product.quantity + amount) } : product));
  const removeProduct = () => {
    if (!deleteTarget) return;
    setProducts((current) => current.filter((product) => product.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <main className="paper-grain shelf-shell min-h-[100dvh]">
      <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-6 sm:px-8 sm:pt-9 lg:px-12">
        <header className="rise-in mb-8 flex items-center justify-between lg:mb-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_7px_16px_hsl(var(--primary)/.2)]"><Sparkles size={19} strokeWidth={1.7} /></div>
            <div>
              <p className="font-display text-lg leading-none">nacre</p>
              <p className="mt-1 text-[9px] font-bold tracking-[.28em] text-[hsl(var(--muted-foreground))]">BEAUTY SHELF</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-2 w-2 rounded-full bg-[hsl(145_38%_48%)]" />你的收藏，只在這裡</div>
        </header>

        <div className="grid items-start gap-9 lg:grid-cols-[minmax(290px,360px)_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-8">
            <div className="rise-in mb-7 max-w-xl lg:mb-9">
              <p className="mb-3 text-xs font-bold tracking-[.18em] text-[hsl(var(--primary))]">MY DAILY RITUAL</p>
              <h1 className="font-display text-[clamp(2.65rem,6vw,4.5rem)] leading-[1.02] tracking-[-.035em] text-[hsl(var(--foreground))]">把美好，<br /><em className="text-[hsl(var(--primary))]">放在手邊。</em></h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[hsl(var(--muted-foreground))]">一個專屬於你的溫柔清單。記得還剩多少，也記得哪些正在陪你變漂亮。</p>
            </div>
            <AddProductPanel onAdd={addProduct} />
          </aside>

          <section className="min-w-0" aria-labelledby="shelf-heading">
            <div className="rise-in rise-in-delay-1 mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-[.2em] text-[hsl(var(--muted-foreground))]">YOUR COLLECTION</p>
                <h2 id="shelf-heading" className="font-display text-3xl tracking-tight">我的美妝架</h2>
              </div>
              {products.length > 0 && <div className="relative w-full sm:w-52"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><label htmlFor="search-products" className="sr-only">搜尋商品</label><input id="search-products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋你的寶貝" className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] pl-9 pr-3 text-sm outline-none transition-[border,box-shadow] placeholder:text-[hsl(var(--muted-foreground)/.75)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]" data-testid="input-search-products" /></div>}
            </div>
            <div className="rise-in rise-in-delay-2 mb-6"><Summary products={products} /></div>

            {products.length === 0 ? (
              <div className="rise-in rise-in-delay-3 flex min-h-[390px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[hsl(346_53%_49%/.28)] bg-[hsl(346_53%_49%/.035)] px-6 text-center" data-testid="empty-state">
                <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[hsl(346_53%_49%/.1)] text-[hsl(var(--primary))]"><div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-[hsl(var(--accent))]" /><PackageOpen size={35} strokeWidth={1.2} /></div>
                <h3 className="font-display text-2xl">這裡還有好多空間</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">把第一件愛用的商品放進來，從今天開始好好照顧你的美妝收藏。</p>
                <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))]"><CirclePlus size={15} /> 從左側開始新增</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-6 text-center" data-testid="no-search-results">
                <Search size={28} className="mb-3 text-[hsl(var(--muted-foreground))]" strokeWidth={1.4} />
                <h3 className="font-display text-xl">找不到這件寶貝</h3>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">試試另一個名字，或清除搜尋。</p>
                <button type="button" onClick={() => setQuery('')} className="mt-4 text-sm font-bold text-[hsl(var(--primary))] underline underline-offset-4" data-testid="button-clear-search">清除搜尋</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="product-grid">
                {filteredProducts.map((product, index) => <div key={product.id} className={`rise-in ${index < 4 ? `rise-in-delay-${index + 1}` : ''}`}><ProductCard product={product} onChange={(amount) => changeQuantity(product.id, amount)} onDelete={() => setDeleteTarget(product)} /></div>)}
              </div>
            )}
            <footer className="mt-8 flex items-center justify-between border-t border-[hsl(var(--border)/.7)] pt-5 text-xs text-[hsl(var(--muted-foreground))]"><span>你的美妝日常，值得被記住。</span><span className="font-display text-sm text-[hsl(var(--primary))]">nacre</span></footer>
          </section>
        </div>
      </div>
      {deleteTarget && <DeleteDialog product={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={removeProduct} />}
    </main>
  );
}

function App() {
  return <Home />;
}

export default App;
