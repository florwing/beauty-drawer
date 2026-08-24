import './organized.css';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Archive,
  ArrowDownUp,
  Box,
  CalendarClock,
  Check,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  brand?: string;
  quantity: number;
  category: string;
  image?: string;
  price?: number;
  purchaseLocation?: string;
  unopenedExpiryDate?: string;
  paoMonths?: number;
  openedDate?: string;
};

type ExpiryStatus = 'expired' | 'expiring' | null;
type ProductRecognition = { name: string; brand: string };
type SaveResult = { ok: true } | { ok: false; message: string };

const STORAGE_KEY = 'beauty-shelf-products';
const THUMBNAIL_MAX_EDGE = 512;
const THUMBNAIL_MIN_EDGE = 320;
const THUMBNAIL_MAX_DATA_URL_LENGTH = 220_000;
const CATEGORIES = ['全部', '保養', '彩妝', '清潔', '防曬'];
const tones = [
  'bg-[hsl(183_45%_80%)]',
  'bg-[hsl(7_78%_59%)]',
  'bg-[hsl(77_62%_58%)]',
  'bg-[hsl(257_55%_86%)]',
  'bg-[hsl(42_83%_78%)]',
];

function isQuotaExceededError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

function getStorageErrorMessage(error: unknown) {
  return isQuotaExceededError(error)
    ? '儲存空間已滿，這次變更尚未保存。請移除一件舊商品或將照片移除後再試。'
    : '無法保存到此瀏覽器，這次變更尚未保存。請確認瀏覽器沒有封鎖本機儲存後再試。';
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be decoded'));
    image.src = dataUrl;
  });
}

async function decodeImageForThumbnail(dataUrl: string) {
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Some older mobile browsers do not support orientation-aware ImageBitmap decoding.
    }
  }

  const image = await loadImage(dataUrl);
  return {
    source: image as CanvasImageSource,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => undefined,
  };
}

function makeStorageThumbnail(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) throw new Error('Canvas is unavailable');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/jpeg', quality);
}

async function createStorageThumbnail(imageData: string) {
  if (!imageData) return '';
  if (!imageData.startsWith('data:image/')) return imageData;

  const decoded = await decodeImageForThumbnail(imageData);

  try {
    const initialScale = Math.min(
      1,
      THUMBNAIL_MAX_EDGE / Math.max(decoded.width, decoded.height),
    );
    let width = Math.max(1, Math.round(decoded.width * initialScale));
    let height = Math.max(1, Math.round(decoded.height * initialScale));
    let smallest = '';

    for (let attempt = 0; attempt < 4; attempt += 1) {
      for (const quality of [0.88, 0.82, 0.76, 0.7, 0.64]) {
        const candidate = makeStorageThumbnail(
          decoded.source,
          width,
          height,
          quality,
        );
        if (!smallest || candidate.length < smallest.length) smallest = candidate;
        if (candidate.length <= THUMBNAIL_MAX_DATA_URL_LENGTH) return candidate;
      }

      if (
        Math.max(width, height) <= THUMBNAIL_MIN_EDGE ||
        Math.min(width, height) <= 1
      ) {
        break;
      }

      const scale = Math.max(
        THUMBNAIL_MIN_EDGE / Math.max(decoded.width, decoded.height),
        (Math.max(width, height) * 0.84) /
          Math.max(decoded.width, decoded.height),
      );
      width = Math.max(1, Math.round(decoded.width * scale));
      height = Math.max(1, Math.round(decoded.height * scale));
    }

    if (smallest && smallest.length <= THUMBNAIL_MAX_DATA_URL_LENGTH) {
      return smallest;
    }

    throw new Error('Thumbnail remains too large');
  } finally {
    decoded.dispose();
  }
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;

  const product = value as Partial<Product>;
  if (
    typeof product.id !== 'string' ||
    typeof product.name !== 'string' ||
    typeof product.quantity !== 'number' ||
    typeof product.category !== 'string'
  ) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    brand: typeof product.brand === 'string' ? product.brand : '',
    quantity: Math.max(0, Math.floor(product.quantity)),
    category: product.category,
    image: typeof product.image === 'string' ? product.image : '',
    price:
      typeof product.price === 'number' && Number.isFinite(product.price)
        ? product.price
        : undefined,
    purchaseLocation:
      typeof product.purchaseLocation === 'string'
        ? product.purchaseLocation
        : '',
    unopenedExpiryDate:
      typeof product.unopenedExpiryDate === 'string'
        ? product.unopenedExpiryDate
        : '',
    paoMonths:
      typeof product.paoMonths === 'number' && product.paoMonths > 0
        ? Math.floor(product.paoMonths)
        : undefined,
    openedDate:
      typeof product.openedDate === 'string' ? product.openedDate : '',
  };
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function dateFromInput(value?: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getExpiryDate(product: Product) {
  const candidates: Date[] = [];
  const unopened = dateFromInput(product.unopenedExpiryDate, true);
  if (unopened) candidates.push(unopened);

  const opened = dateFromInput(product.openedDate);
  if (opened && product.paoMonths) candidates.push(addMonths(opened, product.paoMonths));

  if (!candidates.length) return null;
  return new Date(Math.min(...candidates.map((date) => date.getTime())));
}

function getExpiryStatus(product: Product): ExpiryStatus {
  const expiry = getExpiryDate(product);
  if (!expiry) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return null;
}

function formatDate(value: Date | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}

function ProductVisual({ product }: { product: Product }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={`${product.name} 商品照片`}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${tones[product.id.length % tones.length]}`}
      aria-label={`${product.name} 商品示意圖`}
    >
      <div className="relative h-24 w-16 rounded-[10px] bg-[hsl(0_0%_98%/.86)] shadow-[8px_12px_18px_hsl(222_35%_17%/.18)]">
        <div className="absolute left-1/2 top-0 h-3 w-10 -translate-x-1/2 rounded-b bg-[hsl(222_35%_17%/.2)]" />
        <div className="absolute bottom-7 left-1/2 w-full -translate-x-1/2 text-center text-[8px] font-bold tracking-[.08em] text-[hsl(222_35%_17%/.62)]">
          BEAUTY
        </div>
        <div className="absolute bottom-2 left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-[hsl(7_78%_59%/.7)]" />
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-bold text-[hsl(var(--drawer-ink))]"
    >
      {children}
    </label>
  );
}

function AddSheet({
  product,
  onSave,
  onClose,
}: {
  product: Product | null;
  onSave: (product: Product) => SaveResult;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product?.name ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [quantity, setQuantity] = useState(String(product?.quantity ?? 1));
  const [category, setCategory] = useState(product?.category ?? '保養');
  const [image, setImage] = useState(product?.image ?? '');
  const [imageNeedsProcessing, setImageNeedsProcessing] = useState(false);
  const [price, setPrice] = useState(
    product?.price === undefined ? '' : String(product.price),
  );
  const [purchaseLocation, setPurchaseLocation] = useState(
    product?.purchaseLocation ?? '',
  );
  const [unopenedExpiryDate, setUnopenedExpiryDate] = useState(
    product?.unopenedExpiryDate ?? '',
  );
  const [paoMonths, setPaoMonths] = useState(
    product?.paoMonths === undefined ? '' : String(product.paoMonths),
  );
  const [openedDate, setOpenedDate] = useState(product?.openedDate ?? '');
  const [error, setError] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const recognize = async (imageData: string) => {
    setAiMessage('DeepSeek 正在辨識商品包裝…');
    setIsRecognizing(true);

    try {
      const response = await fetch('/api/ai/product-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });
      if (!response.ok) throw new Error('Recognition request failed');

      const result = (await response.json()) as ProductRecognition;
      if (!result.name?.trim() || !result.brand?.trim()) {
        throw new Error('Recognition response is incomplete');
      }

      setName(result.name);
      setBrand(result.brand);
      setAiMessage('已自動填入名稱與品牌，你可再自行修改。');
    } catch {
      setAiMessage('AI 暫時未能辨識，請自行填寫名稱與品牌。');
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔案。');
      return;
    }
    if (file.size > 3_500_000) {
      setError('為了提供 AI 辨識，圖片請小於 3.5MB。');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result);
      setImage(imageData);
      setImageNeedsProcessing(true);
      setError('');
      recognize(imageData);
    };
    reader.onerror = () => {
      setError('無法讀取這張照片，請選擇另一張後再試。');
    };
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('請輸入商品名稱。');
      return;
    }

    const parsedPrice = Number(price);
    const parsedPao = Number(paoMonths);
    setError('');
    setIsSaving(true);

    try {
      const savedImage = imageNeedsProcessing
        ? await createStorageThumbnail(image)
        : image;
      const result = onSave({
        id: product?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        brand: brand.trim(),
        quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
        category,
        image: savedImage,
        price:
          price.trim() && Number.isFinite(parsedPrice) && parsedPrice >= 0
            ? parsedPrice
            : undefined,
        purchaseLocation: purchaseLocation.trim(),
        unopenedExpiryDate,
        paoMonths:
          paoMonths.trim() && Number.isFinite(parsedPao) && parsedPao > 0
            ? Math.floor(parsedPao)
            : undefined,
        openedDate,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onClose();
    } catch {
      setError(
        '這張照片無法在保留清晰度下安全保存。請移除照片或選擇另一張後再試。',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const sheetTitle = product ? '編輯商品資料' : '新增一件商品';

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(222_35%_17%/.3)] p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-sheet-title"
        className="organize-in flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-[hsl(var(--drawer-panel))] shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div>
            <p className="text-[10px] font-bold tracking-[.2em] text-[hsl(var(--drawer-coral))]">
              {product ? '整理資訊' : '放進抽屜'}
            </p>
            <h2 id="product-sheet-title" className="mt-1 text-xl font-extrabold">
              {sheetTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`關閉${sheetTitle}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--drawer-paper))]"
          >
            <X size={19} />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="space-y-4 overflow-y-auto px-5 pb-6 sm:px-7 sm:pb-7"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFile}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isSaving}
            className="relative flex h-32 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--drawer-coral)/.5)] bg-[hsl(7_78%_59%/.06)] text-sm font-bold text-[hsl(var(--drawer-coral-dark))]"
          >
            {image ? (
              <>
                <img
                  src={image}
                  alt="商品照片預覽"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-2 right-2 rounded-lg bg-[hsl(var(--drawer-ink)/.82)] px-2.5 py-1.5 text-xs text-white">
                  更換照片
                </span>
              </>
            ) : (
              <>
                <ImagePlus size={20} />
                上傳商品照片並自動辨識
              </>
            )}
          </button>
          {image && (
            <button
              type="button"
              onClick={() => {
                setImage('');
                setImageNeedsProcessing(false);
                setError('');
                if (fileRef.current) fileRef.current.value = '';
              }}
              disabled={isSaving}
              className="text-xs font-bold text-[hsl(var(--drawer-coral-dark))] disabled:opacity-50"
            >
              移除照片，僅保存商品資料
            </button>
          )}
          {aiMessage && (
            <p
              role="status"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                isRecognizing
                  ? 'bg-[hsl(var(--drawer-aqua)/.45)] text-[hsl(var(--drawer-ink))]'
                  : 'bg-[hsl(77_62%_58%/.25)] text-[hsl(var(--drawer-ink))]'
              }`}
            >
              {isRecognizing ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {aiMessage}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="drawer-name">商品名稱</FieldLabel>
              <input
                id="drawer-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                placeholder="例如：玻尿酸保濕精華"
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]"
              />
            </div>
            <div>
              <FieldLabel htmlFor="drawer-brand">品牌</FieldLabel>
              <input
                id="drawer-brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="例如：CeraVe"
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="drawer-quantity">目前數量</FieldLabel>
              <input
                id="drawer-quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm"
              />
            </div>
            <div>
              <FieldLabel htmlFor="drawer-category">分類</FieldLabel>
              <select
                id="drawer-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm"
              >
                {CATEGORIES.slice(1).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="drawer-price">價格</FieldLabel>
              <input
                id="drawer-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="例如：680"
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm"
              />
            </div>
            <div>
              <FieldLabel htmlFor="drawer-location">購買地點</FieldLabel>
              <input
                id="drawer-location"
                value={purchaseLocation}
                onChange={(event) => setPurchaseLocation(event.target.value)}
                placeholder="例如：品牌官網"
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper)/.7)] p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock size={16} className="text-[hsl(var(--drawer-coral))]" />
              <p className="text-sm font-extrabold">有效期限追蹤</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="drawer-unopened-expiry">
                  未開封到期日
                </FieldLabel>
                <input
                  id="drawer-unopened-expiry"
                  type="date"
                  value={unopenedExpiryDate}
                  onChange={(event) => setUnopenedExpiryDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-white px-3 text-sm"
                />
              </div>
              <div>
                <FieldLabel htmlFor="drawer-pao">PAO（開封後）</FieldLabel>
                <div className="relative">
                  <input
                    id="drawer-pao"
                    type="number"
                    min="1"
                    max="60"
                    inputMode="numeric"
                    value={paoMonths}
                    onChange={(event) => setPaoMonths(event.target.value)}
                    placeholder="例如：12"
                    className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-white px-3 pr-9 text-sm"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[hsl(var(--drawer-muted))]">
                    M
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="drawer-opened-date">開封日期</FieldLabel>
                <input
                  id="drawer-opened-date"
                  type="date"
                  value={openedDate}
                  onChange={(event) => setOpenedDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-white px-3 text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-bold text-[hsl(var(--drawer-coral-dark))]"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="h-12 w-full rounded-xl bg-[hsl(var(--drawer-coral))] text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving
              ? '正在確認保存…'
              : product
                ? '儲存商品資料'
                : '放入我的抽屜'}
          </button>
        </form>
      </section>
    </div>
  );
}

function DeleteDialog({
  product,
  onCancel,
  onConfirm,
}: {
  product: Product;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(222_35%_17%/.35)] p-5 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-title"
        className="organize-in w-full max-w-sm rounded-3xl bg-[hsl(var(--drawer-panel))] p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(7_78%_59%/.12)] text-[hsl(var(--drawer-coral))]">
          <Trash2 size={20} />
        </div>
        <h2 id="remove-title" className="text-lg font-extrabold">
          從抽屜移除這件商品？
        </h2>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--drawer-muted))]">
          「{product.name}」將會被刪除，這個動作無法復原。
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-[hsl(var(--drawer-line))] text-sm font-bold"
          >
            先留著
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl bg-[hsl(var(--drawer-coral))] text-sm font-bold text-white"
          >
            確認移除
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductTile({
  product,
  onChange,
  onEdit,
  onDelete,
}: {
  product: Product;
  onChange: (amount: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const empty = product.quantity === 0;
  const expiry = getExpiryStatus(product);
  const expiryDate = getExpiryDate(product);

  return (
    <article className="drawer-card flex gap-3 rounded-[20px] border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-panel))] p-3 shadow-[0_8px_22px_hsl(222_35%_17%/.05)] sm:p-3.5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[15px] bg-[hsl(var(--drawer-paper))] sm:h-[72px] sm:w-[72px]">
        <ProductVisual product={product} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`編輯 ${product.name}`}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="truncate text-[15px] font-extrabold leading-5 text-[hsl(var(--drawer-ink))]">
              {product.name}
            </h3>
            <p className="mt-1 truncate text-[11px] font-medium text-[hsl(var(--drawer-muted))]">
              {[
                product.brand || '未標示品牌',
                product.category,
                product.price !== undefined ? `$${product.price}` : '',
                product.purchaseLocation,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </button>
          <div className="shrink-0 text-right">
            <strong
              className={`block text-[28px] font-black leading-6 tracking-tight ${
                empty
                  ? 'text-[hsl(var(--drawer-coral))]'
                  : 'text-[hsl(var(--drawer-ink))]'
              }`}
            >
              {product.quantity}
            </strong>
            <span className="text-[9px] font-bold text-[hsl(var(--drawer-muted))]">
              件
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${
              empty
                ? 'bg-[hsl(var(--drawer-ink))] text-white'
                : product.quantity < 2
                  ? 'bg-[hsl(42_83%_78%)] text-[hsl(var(--drawer-ink))]'
                  : 'bg-[hsl(var(--drawer-paper))] text-[hsl(var(--drawer-muted))]'
            }`}
          >
            {empty ? '用曬啦' : product.quantity < 2 ? '快用完' : '使用中'}
          </span>
          {expiry && (
            <span
              className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${
                expiry === 'expired'
                  ? 'bg-[hsl(var(--drawer-coral))] text-white'
                  : 'bg-[hsl(42_83%_78%)] text-[hsl(var(--drawer-ink))]'
              }`}
            >
              {expiry === 'expired' ? '已過期' : '即將過期'}
            </span>
          )}
          {expiryDate && (
            <span
              className={`text-[10px] font-bold ${
                expiry
                  ? 'text-[hsl(var(--drawer-coral-dark))]'
                  : 'text-[hsl(var(--drawer-muted))]'
              }`}
            >
              至 {formatDate(expiryDate)}
            </span>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {[1, 2, 3].map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={empty}
              onClick={() => onChange(-amount)}
              aria-label={`從${product.name}扣除${amount}件`}
              className="flex h-7 min-w-8 items-center justify-center rounded-lg border border-[hsl(var(--drawer-line))] px-1.5 text-[10px] font-extrabold disabled:opacity-30"
            >
              −{amount}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(1)}
            aria-label={`替${product.name}補貨一件`}
            className="flex h-7 min-w-8 items-center justify-center rounded-lg bg-[hsl(77_62%_58%/.38)] px-1.5 text-[10px] font-extrabold"
          >
            +1
          </button>
          <span className="mx-0.5 h-4 w-px bg-[hsl(var(--drawer-line))]" />
          <button
            type="button"
            onClick={onEdit}
            aria-label={`編輯 ${product.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--drawer-paper))] text-[hsl(var(--drawer-muted))]"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`刪除 ${product.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(7_78%_59%/.1)] text-[hsl(var(--drawer-coral-dark))]"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved)
        ? saved.map(normalizeProduct).filter((product): product is Product => !!product)
        : [];
    } catch {
      return [];
    }
  });
  const productsRef = useRef(products);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [sheetProduct, setSheetProduct] = useState<Product | null | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [storageError, setStorageError] = useState('');

  const persistProducts = (nextProducts: Product[]): SaveResult => {
    try {
      const serialized = JSON.stringify(nextProducts);
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized) {
        throw new Error('Storage write could not be verified');
      }
      productsRef.current = nextProducts;
      setProducts(nextProducts);
      setStorageError('');
      return { ok: true };
    } catch (error) {
      const message = getStorageErrorMessage(error);
      setStorageError(message);
      return { ok: false, message };
    }
  };

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (!query.trim() ||
            `${product.name} ${product.brand ?? ''}`
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase())) &&
          (category === '全部' || product.category === category),
      ),
    [products, query, category],
  );

  const total = products.reduce((sum, product) => sum + product.quantity, 0);
  const low = products.filter(
    (product) => product.quantity > 0 && product.quantity < 2,
  ).length;
  const expiring = products.filter(
    (product) => getExpiryStatus(product) === 'expiring',
  ).length;
  const expired = products.filter(
    (product) => getExpiryStatus(product) === 'expired',
  ).length;

  const updateQuantity = (id: string, amount: number) =>
    persistProducts(
      productsRef.current.map((product) =>
        product.id === id
          ? { ...product, quantity: Math.max(0, product.quantity + amount) }
          : product,
      ),
    );

  const saveProduct = (product: Product) => {
    const exists = productsRef.current.some((item) => item.id === product.id);
    return persistProducts(
      exists
        ? productsRef.current.map((item) =>
            item.id === product.id ? product : item,
          )
        : [product, ...productsRef.current],
    );
  };

  const deleteProduct = (id: string) => {
    const result = persistProducts(
      productsRef.current.filter((product) => product.id !== id),
    );
    if (result.ok) setDeleteTarget(null);
  };

  const openNewProduct = () => setSheetProduct(null);

  return (
    <div className="organized-beauty-root drawer-noise min-h-[100dvh] bg-[hsl(var(--drawer-paper))]">
      <main className="drawer-surface min-h-[100dvh] pb-24">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-7 sm:pt-8">
          <header className="organize-in flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--drawer-ink))] text-[hsl(var(--drawer-lime))]">
                <Box size={20} />
              </div>
              <div>
                <p className="text-[15px] font-black">我的美妝抽屜</p>
                <p className="text-[9px] font-bold tracking-[.22em] text-[hsl(var(--drawer-muted))]">
                  BEAUTY DRAWER
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openNewProduct}
              className="flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--drawer-coral))] px-4 text-sm font-extrabold text-white"
            >
              <Plus size={18} />
              新增
            </button>
          </header>
          {storageError && (
            <p
              role="alert"
              className="organize-in mt-4 rounded-xl bg-[hsl(7_78%_59%/.12)] px-3 py-2.5 text-xs font-bold leading-5 text-[hsl(var(--drawer-coral-dark))]"
            >
              {storageError}
            </p>
          )}

          <section className="organize-in organize-delay-1 mt-7 rounded-[27px] bg-[hsl(var(--drawer-ink))] p-5 text-white drawer-shadow sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-[.16em] text-[hsl(var(--drawer-aqua))]">
                  今日抽屜狀態
                </p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  一眼找到，<span className="text-[hsl(var(--drawer-lime))]">剛剛好。</span>
                </h1>
              </div>
              <ArrowDownUp className="text-[hsl(var(--drawer-aqua))]" size={22} />
            </div>
            <div className="mt-7 flex items-end justify-between">
              <div>
                <strong className="text-5xl font-black">{total}</strong>
                <span className="ml-2 text-sm text-white/60">件存貨</span>
              </div>
              <div className="text-right text-xs text-white/60">
                <p>{products.length} 件商品</p>
                <p className="mt-1 text-[hsl(var(--drawer-lime))]">
                  {low} 件快用完
                </p>
              </div>
            </div>
            {(expiring > 0 || expired > 0) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3 text-xs font-bold">
                {expired > 0 && (
                  <span className="rounded-full bg-[hsl(var(--drawer-coral))] px-2.5 py-1 text-white">
                    {expired} 件已過期
                  </span>
                )}
                {expiring > 0 && (
                  <span className="rounded-full bg-[hsl(42_83%_78%)] px-2.5 py-1 text-[hsl(var(--drawer-ink))]">
                    {expiring} 件即將過期
                  </span>
                )}
              </div>
            )}
          </section>

          <section className="organize-in organize-delay-2 mt-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[.18em] text-[hsl(var(--drawer-coral))]">
                  我的收藏
                </p>
                <h2 className="mt-1 text-2xl font-black">抽屜裡有什麼</h2>
              </div>
              <span className="rounded-full bg-[hsl(var(--drawer-panel))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--drawer-muted))]">
                {filtered.length} 件
              </span>
            </div>
            <div
              className="mt-5 flex gap-2 overflow-x-auto pb-1"
              role="tablist"
              aria-label="商品分類"
            >
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={category === item}
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${
                    category === item
                      ? 'bg-[hsl(var(--drawer-ink))] text-white'
                      : 'bg-[hsl(var(--drawer-panel))] text-[hsl(var(--drawer-muted))]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="relative mt-4">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--drawer-muted))]"
              />
              <label htmlFor="organized-search" className="sr-only">
                搜尋商品
              </label>
              <input
                id="organized-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋商品名稱或品牌"
                className="h-11 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-panel))] pl-10 pr-10 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]"
              />
              <SlidersHorizontal
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--drawer-muted))]"
              />
            </div>
          </section>

          {products.length === 0 ? (
            <section className="mt-6 flex min-h-[380px] flex-col items-center justify-center rounded-[26px] border border-dashed border-[hsl(var(--drawer-coral)/.35)] bg-[hsl(7_78%_59%/.05)] text-center">
              <Archive size={35} className="mb-5 text-[hsl(var(--drawer-coral))]" />
              <h3 className="text-xl font-black">抽屜現在是空的</h3>
              <p className="mt-2 text-sm text-[hsl(var(--drawer-muted))]">
                上傳商品照片，讓 AI 幫你整理名稱與品牌。
              </p>
              <button
                type="button"
                onClick={openNewProduct}
                className="mt-5 rounded-xl bg-[hsl(var(--drawer-coral))] px-5 py-3 text-sm font-extrabold text-white"
              >
                新增第一件商品
              </button>
            </section>
          ) : filtered.length === 0 ? (
            <section className="mt-6 flex min-h-[230px] flex-col items-center justify-center rounded-[26px] bg-[hsl(var(--drawer-panel))] text-center">
              <Search size={28} className="text-[hsl(var(--drawer-muted))]" />
              <p className="mt-3 font-bold">找不到相符商品</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('全部');
                }}
                className="mt-3 text-xs font-bold text-[hsl(var(--drawer-coral))]"
              >
                清除篩選
              </button>
            </section>
          ) : (
            <div className="organize-in organize-delay-3 mt-6 space-y-3">
              {filtered.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  onChange={(amount) => updateQuantity(product.id, amount)}
                  onEdit={() => setSheetProduct(product)}
                  onDelete={() => setDeleteTarget(product)}
                />
              ))}
            </div>
          )}

          <footer className="mt-8 flex justify-between border-t border-[hsl(var(--drawer-line))] pt-5 text-xs text-[hsl(var(--drawer-muted))]">
            <span className="flex items-center gap-1.5">
              <Check size={14} />
              每一件都記得很清楚
            </span>
            <span className="flex items-center gap-1 font-bold">
              <Store size={13} />
              收納完成
            </span>
          </footer>
        </div>
      </main>

      {sheetProduct !== undefined && (
        <AddSheet
          product={sheetProduct}
          onSave={saveProduct}
          onClose={() => setSheetProduct(undefined)}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          product={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProduct(deleteTarget.id);
          }}
        />
      )}
    </div>
  );
}