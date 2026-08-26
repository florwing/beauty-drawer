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
  Cloud,
  ImagePlus,
  LoaderCircle,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';

import { PRODUCT_THUMBNAILS_BUCKET, supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  brand?: string;
  quantity: number;
  category: string;
  image?: string;
  imagePath?: string;
  price?: number;
  purchaseLocation?: string;
  unopenedExpiryDate?: string;
  paoMonths?: number;
  openedDate?: string;
};

type ExpiryStatus = 'expired' | 'expiring' | null;
type ProductRecognition = { name: string; brand: string };
type SaveResult = { ok: true } | { ok: false; message: string };
type ProductRow = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  quantity: number;
  category: string;
  image_path: string | null;
  price: number | null;
  purchase_location: string | null;
  unopened_expiry_date: string | null;
  pao_months: number | null;
  opened_date: string | null;
};
type MigrationMarker = {
  status: 'pending' | 'complete';
  productIds: string[];
  completedIds: string[];
  updatedAt: string;
};
type MigrationClaim = {
  userId: string;
  productIds: string[];
  claimedAt: string;
};

const STORAGE_KEY = 'beauty-shelf-products';
const LOCAL_BACKUP_KEY = 'beauty-shelf-products-backup';
const MIGRATION_CLAIM_KEY = 'beauty-shelf-products-migration-claim';
const MIGRATION_MARKER_PREFIX = 'beauty-shelf-products-migration:';
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
    imagePath:
      typeof product.imagePath === 'string' ? product.imagePath : '',
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

function readProductsAtKey(key: string) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved)
      ? saved.map(normalizeProduct).filter((product): product is Product => !!product)
      : [];
  } catch {
    return [];
  }
}

function readLocalProducts() {
  return readProductsAtKey(STORAGE_KEY);
}

function localBackupKey(userId: string) {
  return `${LOCAL_BACKUP_KEY}:${userId}`;
}

function readMigrationSource(userId: string) {
  const perUserBackup = readProductsAtKey(localBackupKey(userId));
  if (perUserBackup.length) return perUserBackup;
  return readProductsAtKey(LOCAL_BACKUP_KEY);
}

function productToRow(
  product: Product,
  userId: string,
  imagePath: string,
): ProductRow {
  return {
    id: product.id,
    user_id: userId,
    name: product.name,
    brand: product.brand?.trim() || null,
    quantity: Math.max(0, Math.floor(product.quantity)),
    category: product.category,
    image_path: imagePath || null,
    price:
      typeof product.price === 'number' && Number.isFinite(product.price)
        ? product.price
        : null,
    purchase_location: product.purchaseLocation?.trim() || null,
    unopened_expiry_date: product.unopenedExpiryDate || null,
    pao_months:
      typeof product.paoMonths === 'number' && product.paoMonths > 0
        ? Math.floor(product.paoMonths)
        : null,
    opened_date: product.openedDate || null,
  };
}

function rowToProduct(row: ProductRow, image = ''): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    brand: row.brand ?? '',
    quantity: Math.max(0, Math.floor(Number(row.quantity) || 0)),
    category: String(row.category),
    image,
    imagePath: row.image_path ?? '',
    price:
      row.price === null || row.price === undefined
        ? undefined
        : Number(row.price),
    purchaseLocation: row.purchase_location ?? '',
    unopenedExpiryDate: row.unopened_expiry_date ?? '',
    paoMonths:
      row.pao_months === null || row.pao_months === undefined
        ? undefined
        : Math.floor(Number(row.pao_months)),
    openedDate: row.opened_date ?? '',
  };
}

function cacheProducts(products: Product[]): SaveResult {
  try {
    const cacheValue = products.map(({ image: _image, ...product }) => product);
    const serialized = JSON.stringify(cacheValue);
    localStorage.setItem(STORAGE_KEY, serialized);
    if (localStorage.getItem(STORAGE_KEY) !== serialized) {
      throw new Error('Storage write could not be verified');
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getStorageErrorMessage(error) };
  }
}

function readMigrationMarker(userId: string): MigrationMarker | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`${MIGRATION_MARKER_PREFIX}${userId}`) || 'null',
    );
    if (!value || typeof value !== 'object') return null;
    const marker = value as Partial<MigrationMarker>;
    if (
      (marker.status !== 'pending' && marker.status !== 'complete') ||
      !Array.isArray(marker.productIds) ||
      !Array.isArray(marker.completedIds)
    ) {
      return null;
    }
    return {
      status: marker.status,
      productIds: marker.productIds.filter(
        (item): item is string => typeof item === 'string',
      ),
      completedIds: marker.completedIds.filter(
        (item): item is string => typeof item === 'string',
      ),
      updatedAt:
        typeof marker.updatedAt === 'string'
          ? marker.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function writeMigrationMarker(userId: string, marker: MigrationMarker) {
  localStorage.setItem(
    `${MIGRATION_MARKER_PREFIX}${userId}`,
    JSON.stringify(marker),
  );
}

function readMigrationClaim(): MigrationClaim | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(MIGRATION_CLAIM_KEY) || 'null',
    );
    if (!value || typeof value !== 'object') return null;
    const claim = value as Partial<MigrationClaim>;
    if (typeof claim.userId !== 'string' || !Array.isArray(claim.productIds)) {
      return null;
    }
    return {
      userId: claim.userId,
      productIds: claim.productIds.filter(
        (item): item is string => typeof item === 'string',
      ),
      claimedAt:
        typeof claim.claimedAt === 'string'
          ? claim.claimedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function claimLocalProducts(userId: string, products: Product[]) {
  const currentClaim = readMigrationClaim();
  if (currentClaim && currentClaim.userId !== userId) return false;

  const backupKey = localBackupKey(userId);
  if (!localStorage.getItem(backupKey)) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localStorage.setItem(backupKey, raw);
  }

  const claim: MigrationClaim = {
    userId,
    productIds: products.map((product) => product.id),
    claimedAt: currentClaim?.claimedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(MIGRATION_CLAIM_KEY, JSON.stringify(claim));
  return true;
}

function dataUrlExtension(dataUrl: string) {
  return dataUrl.startsWith('data:image/webp') ? 'webp' : 'jpg';
}

async function dataUrlToBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    if (message.includes('row-level security')) {
      return 'Supabase 權限設定未允許呢次操作，請檢查 products 同 Storage 嘅 RLS policy。';
    }
    if (message.includes('Failed to fetch')) {
      return '暫時連唔到雲端，請檢查網絡後再試。';
    }
  }
  return fallback;
}

async function fetchProductRows(userId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id,user_id,name,brand,quantity,category,image_path,price,purchase_location,unopened_expiry_date,pao_months,opened_date',
    )
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

async function downloadPrivateImage(imagePath: string) {
  const { data, error } = await supabase.storage
    .from(PRODUCT_THUMBNAILS_BUCKET)
    .download(imagePath);
  if (error) throw error;
  return data;
}

async function uploadProductImage(
  userId: string,
  productId: string,
  imageData: string,
) {
  const extension = dataUrlExtension(imageData);
  const imagePath = `${userId}/${productId}/${crypto.randomUUID()}.${extension}`;
  const blob = await dataUrlToBlob(imageData);
  const { error } = await supabase.storage
    .from(PRODUCT_THUMBNAILS_BUCKET)
    .upload(imagePath, blob, {
      cacheControl: '3600',
      contentType: blob.type || `image/${extension}`,
      upsert: true,
    });
  if (error) throw error;
  return imagePath;
}

async function removeProductImage(imagePath: string) {
  if (!imagePath) return;
  const { error } = await supabase.storage
    .from(PRODUCT_THUMBNAILS_BUCKET)
    .remove([imagePath]);
  if (error) throw error;
}

async function migrateLocalProducts(
  user: User,
  sourceProducts: Product[],
  onProgress: (message: string) => void,
) {
  if (!sourceProducts.length) {
    return { migrated: false, message: '' };
  }

  const existingClaim = readMigrationClaim();
  if (existingClaim && existingClaim.userId !== user.id) {
    return {
      migrated: false,
      message: '呢部瀏覽器嘅舊本機資料已由另一個帳戶認領，今次唔會重複匯入。',
    };
  }

  if (!claimLocalProducts(user.id, sourceProducts)) {
    throw new Error('本機資料已由另一個帳戶認領。');
  }

  const existingMarker = readMigrationMarker(user.id);
  if (existingMarker?.status === 'complete') {
    return { migrated: false, message: '' };
  }

  const productIds =
    existingMarker?.productIds.length
      ? existingMarker.productIds
      : sourceProducts.map((product) => product.id);
  const completedIds = new Set(existingMarker?.completedIds ?? []);
  const sourceById = new Map(
    sourceProducts.map((product) => [product.id, product]),
  );

  const writePendingMarker = () =>
    writeMigrationMarker(user.id, {
      status: 'pending',
      productIds,
      completedIds: [...completedIds],
      updatedAt: new Date().toISOString(),
    });

  writePendingMarker();

  for (let index = 0; index < productIds.length; index += 1) {
    const productId = productIds[index];
    if (completedIds.has(productId)) continue;

    const product = sourceById.get(productId);
    if (!product) {
      throw new Error(`搵唔到待搬移商品 ${productId} 嘅原始本機資料。`);
    }

    onProgress(`正在搬移舊商品 ${index + 1} / ${productIds.length}…`);
    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select(
        'id,user_id,name,brand,quantity,category,image_path,price,purchase_location,unopened_expiry_date,pao_months,opened_date',
      )
      .eq('user_id', user.id)
      .eq('id', product.id)
      .maybeSingle();

    if (existingError) throw existingError;

    let confirmedRow = existing as ProductRow | null;
    let imagePath = confirmedRow?.image_path ?? '';
    const localImage =
      product.image?.startsWith('data:image/') ? product.image : '';
    let uploadedPath = '';

    if (confirmedRow && imagePath) {
      try {
        await downloadPrivateImage(imagePath);
      } catch {
        if (!localImage) throw new Error(`商品「${product.name}」嘅雲端縮圖遺失。`);
        imagePath = await uploadProductImage(user.id, product.id, localImage);
        uploadedPath = imagePath;
        const { data, error } = await supabase
          .from('products')
          .update({ image_path: imagePath })
          .eq('user_id', user.id)
          .eq('id', product.id)
          .select(
            'id,user_id,name,brand,quantity,category,image_path,price,purchase_location,unopened_expiry_date,pao_months,opened_date',
          )
          .single();
        if (error) {
          await supabase.storage
            .from(PRODUCT_THUMBNAILS_BUCKET)
            .remove([uploadedPath]);
          throw error;
        }
        confirmedRow = data as ProductRow;
      }
    } else if (localImage) {
      imagePath = await uploadProductImage(user.id, product.id, localImage);
      uploadedPath = imagePath;
    }

    if (!confirmedRow) {
      const { data, error } = await supabase
        .from('products')
        .upsert(productToRow(product, user.id, imagePath), {
          onConflict: 'user_id,id',
        })
        .select(
          'id,user_id,name,brand,quantity,category,image_path,price,purchase_location,unopened_expiry_date,pao_months,opened_date',
        )
        .single();
      if (error) {
        if (uploadedPath) {
          await supabase.storage
            .from(PRODUCT_THUMBNAILS_BUCKET)
            .remove([uploadedPath]);
        }
        throw error;
      }
      confirmedRow = data as ProductRow;
    } else if (!confirmedRow.image_path && imagePath) {
      const { data, error } = await supabase
        .from('products')
        .update({ image_path: imagePath })
        .eq('user_id', user.id)
        .eq('id', product.id)
        .select(
          'id,user_id,name,brand,quantity,category,image_path,price,purchase_location,unopened_expiry_date,pao_months,opened_date',
        )
        .single();
      if (error) {
        await supabase.storage
          .from(PRODUCT_THUMBNAILS_BUCKET)
          .remove([uploadedPath]);
        throw error;
      }
      confirmedRow = data as ProductRow;
    }

    if (!confirmedRow || confirmedRow.user_id !== user.id) {
      throw new Error(`商品「${product.name}」未能確認已保存到雲端。`);
    }
    if (localImage) {
      if (!confirmedRow.image_path) {
        throw new Error(`商品「${product.name}」未能確認雲端縮圖路徑。`);
      }
      await downloadPrivateImage(confirmedRow.image_path);
    }

    completedIds.add(product.id);
    writePendingMarker();
  }

  writeMigrationMarker(user.id, {
    status: 'complete',
    productIds,
    completedIds: productIds,
    updatedAt: new Date().toISOString(),
  });

  return {
    migrated: true,
    message: `已安全搬移 ${productIds.length} 件舊本機商品，原有備份仍然保留。`,
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
  onSave: (product: Product) => Promise<SaveResult>;
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
      const result = await onSave({
        id: product?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        brand: brand.trim(),
        quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
        category,
        image: savedImage,
        imagePath: product?.imagePath ?? '',
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

function FullScreenLoading({ message }: { message: string }) {
  return (
    <div className="organized-beauty-root drawer-noise flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--drawer-paper))] px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--drawer-ink))] text-[hsl(var(--drawer-lime))]">
          <LoaderCircle size={25} className="animate-spin" />
        </div>
        <p className="mt-4 text-sm font-extrabold text-[hsl(var(--drawer-ink))]">
          {message}
        </p>
        <p className="mt-1 text-xs text-[hsl(var(--drawer-muted))]">
          請唔好關閉頁面
        </p>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError('請輸入有效電郵，同埋最少 6 個字元嘅密碼。');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('註冊成功。請到電郵完成確認，再返嚟登入。');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (authError) {
      const raw =
        authError && typeof authError === 'object' && 'message' in authError
          ? String(authError.message)
          : '';
      setError(
        raw.toLowerCase().includes('invalid login')
          ? '電郵或密碼唔正確，請再試一次。'
          : raw.toLowerCase().includes('already registered')
            ? '呢個電郵已經註冊，請直接登入。'
            : '暫時未能完成登入，請檢查資料同網絡後再試。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="organized-beauty-root drawer-noise min-h-[100dvh] bg-[hsl(var(--drawer-paper))] px-4 py-8 sm:py-14">
      <main className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--drawer-ink))] text-[hsl(var(--drawer-lime))]">
            <Box size={21} />
          </div>
          <div>
            <p className="text-base font-black">我的美妝抽屜</p>
            <p className="text-[9px] font-bold tracking-[.22em] text-[hsl(var(--drawer-muted))]">
              BEAUTY DRAWER
            </p>
          </div>
        </div>

        <section className="rounded-[28px] border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-panel))] p-5 shadow-[0_22px_55px_hsl(222_35%_17%/.09)] sm:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--drawer-aqua)/.48)] text-[hsl(var(--drawer-ink))]">
            <Cloud size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-black">
            {mode === 'sign-in' ? '登入你嘅抽屜' : '建立私人抽屜'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--drawer-muted))]">
            商品同縮圖會安全同步到你自己嘅私人雲端空間。
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <FieldLabel htmlFor="auth-email">電郵</FieldLabel>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--drawer-muted))]"
                />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] pl-10 pr-3 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="auth-password">密碼</FieldLabel>
              <input
                id="auth-password"
                type="password"
                minLength={6}
                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-[hsl(var(--drawer-line))] bg-[hsl(var(--drawer-paper))] px-3.5 text-sm outline-none focus:border-[hsl(var(--drawer-coral))]"
                placeholder="最少 6 個字元"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-[hsl(7_78%_59%/.12)] px-3 py-2.5 text-xs font-bold leading-5 text-[hsl(var(--drawer-coral-dark))]"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="rounded-xl bg-[hsl(77_62%_58%/.24)] px-3 py-2.5 text-xs font-bold leading-5"
              >
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--drawer-coral))] text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <LogIn size={17} />
              )}
              {mode === 'sign-in' ? '登入' : '註冊'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((current) =>
                current === 'sign-in' ? 'sign-up' : 'sign-in',
              );
              setError('');
              setMessage('');
            }}
            className="mt-4 w-full text-center text-xs font-bold text-[hsl(var(--drawer-coral-dark))]"
          >
            {mode === 'sign-in'
              ? '未有帳戶？立即註冊'
              : '已經有帳戶？返去登入'}
          </button>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const productsRef = useRef(products);
  const activeUserIdRef = useRef<string | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const loadRunRef = useRef(0);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [sheetProduct, setSheetProduct] = useState<Product | null | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [storageError, setStorageError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState('');
  const [mutationBusy, setMutationBusy] = useState(false);

  const clearObjectUrls = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  };

  const applyRows = async (
    rows: ProductRow[],
    ownerUserId: string,
    expectedRun?: number,
  ) => {
    if (activeUserIdRef.current !== ownerUserId) return false;

    let imageFailures = 0;
    const createdUrls: string[] = [];
    const hydrated = await Promise.all(
      rows.map(async (row) => {
        let image = '';
        if (row.image_path) {
          try {
            const blob = await downloadPrivateImage(row.image_path);
            image = URL.createObjectURL(blob);
            createdUrls.push(image);
          } catch {
            imageFailures += 1;
          }
        }
        return rowToProduct(row, image);
      }),
    );

    if (
      activeUserIdRef.current !== ownerUserId ||
      (expectedRun !== undefined && loadRunRef.current !== expectedRun)
    ) {
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      return false;
    }

    clearObjectUrls();
    createdUrls.forEach((url) => objectUrlsRef.current.add(url));
    productsRef.current = hydrated;
    setProducts(hydrated);
    setLoadedUserId(ownerUserId);

    const cacheResult = cacheProducts(hydrated);
    setStorageError(cacheResult.ok ? '' : cacheResult.message);
    if (imageFailures) {
      setSyncMessage(
        `${imageFailures} 張私人縮圖暫時未能載入；商品資料仍然已由雲端同步。`,
      );
    }
    return true;
  };

  const refreshCloudProducts = async (userId: string) => {
    const rows = await fetchProductRows(userId);
    await applyRows(rows, userId);
  };

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setSyncMessage('暫時未能確認登入狀態，請重新整理再試。');
      activeUserIdRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserIdRef.current !== nextUserId) {
        loadRunRef.current += 1;
        clearObjectUrls();
        productsRef.current = [];
        setProducts([]);
        setLoadedUserId(null);
        setDataLoading(Boolean(nextUserId));
      }
      activeUserIdRef.current = nextUserId;
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      clearObjectUrls();
    };
  }, []);

  useEffect(() => {
    const user = session?.user;
    const run = ++loadRunRef.current;

    setSheetProduct(undefined);
    setDeleteTarget(null);
    setQuery('');
    setCategory('全部');

    if (!user) {
      clearObjectUrls();
      productsRef.current = [];
      setProducts([]);
      setLoadedUserId(null);
      setDataLoading(false);
      setMigrationProgress('');
      return;
    }

    const load = async () => {
      setDataLoading(true);
      setStorageError('');
      setSyncMessage('');
      const cachedProducts = readLocalProducts();
      const claim = readMigrationClaim();
      const marker = readMigrationMarker(user.id);
      const localBelongsToUser = !claim || claim.userId === user.id;
      const backedUpProducts =
        claim?.userId === user.id && marker?.status !== 'complete'
          ? readMigrationSource(user.id)
          : [];
      const sourceProducts = backedUpProducts.length
        ? backedUpProducts
        : cachedProducts;

      try {
        if (
          sourceProducts.length &&
          localBelongsToUser &&
          marker?.status !== 'complete'
        ) {
          const outcome = await migrateLocalProducts(
            user,
            sourceProducts,
            setMigrationProgress,
          );
          if (outcome.message) setSyncMessage(outcome.message);
        }

        const rows = await fetchProductRows(user.id);
        if (loadRunRef.current !== run) return;
        await applyRows(rows, user.id, run);
      } catch (loadError) {
        if (loadRunRef.current !== run) return;

        const latestMarker = readMigrationMarker(user.id);
        if (
          sourceProducts.length &&
          localBelongsToUser &&
          latestMarker?.status !== 'complete'
        ) {
          clearObjectUrls();
          productsRef.current = sourceProducts;
          setProducts(sourceProducts);
          setLoadedUserId(user.id);
        }
        setSyncMessage(
          errorMessage(
            loadError,
            '雲端同步未完成，舊本機資料仍然保留。請檢查網絡或 Supabase 權限後重試。',
          ),
        );
      } finally {
        if (loadRunRef.current === run) {
          setMigrationProgress('');
          setDataLoading(false);
        }
      }
    };

    void load();
  }, [session?.user.id]);

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

  const updateQuantity = async (id: string, amount: number) => {
    const user = session?.user;
    const product = productsRef.current.find((item) => item.id === id);
    if (!user || !product || mutationBusy) return;

    setMutationBusy(true);
    setSyncMessage('');
    try {
      const quantity = Math.max(0, product.quantity + amount);
      const { error } = await supabase
        .from('products')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('id', id);
      if (error) throw error;
      await refreshCloudProducts(user.id);
    } catch (quantityError) {
      setSyncMessage(
        errorMessage(
          quantityError,
          '數量未能保存到雲端，畫面未有改動。請稍後再試。',
        ),
      );
    } finally {
      setMutationBusy(false);
    }
  };

  const saveProduct = async (product: Product): Promise<SaveResult> => {
    const user = session?.user;
    if (!user) {
      return { ok: false, message: '登入狀態已失效，請重新登入後再保存。' };
    }

    setMutationBusy(true);
    setSyncMessage('');
    const existing = productsRef.current.find((item) => item.id === product.id);
    const oldImagePath = existing?.imagePath ?? '';
    let nextImagePath = product.imagePath ?? oldImagePath;
    let uploadedPath = '';

    try {
      if (product.image?.startsWith('data:image/')) {
        nextImagePath = await uploadProductImage(
          user.id,
          product.id,
          product.image,
        );
        uploadedPath = nextImagePath;
      } else if (!product.image && oldImagePath) {
        nextImagePath = '';
      }

      const { error } = await supabase
        .from('products')
        .upsert(productToRow(product, user.id, nextImagePath), {
          onConflict: 'user_id,id',
        });
      if (error) {
        if (uploadedPath && uploadedPath !== oldImagePath) {
          await supabase.storage
            .from(PRODUCT_THUMBNAILS_BUCKET)
            .remove([uploadedPath]);
        }
        throw error;
      }

      let cleanupWarning = '';
      if (oldImagePath && oldImagePath !== nextImagePath) {
        try {
          await removeProductImage(oldImagePath);
        } catch {
          cleanupWarning =
            '商品已保存，但舊縮圖未能清理；請稍後重新登入再檢查。';
        }
      }

      await refreshCloudProducts(user.id);
      if (cleanupWarning) setSyncMessage(cleanupWarning);
      return { ok: true };
    } catch (saveError) {
      return {
        ok: false,
        message: errorMessage(
          saveError,
          '商品未能保存到雲端，表單內容已保留。請檢查網絡後再試。',
        ),
      };
    } finally {
      setMutationBusy(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const user = session?.user;
    if (!user || mutationBusy) return;

    setMutationBusy(true);
    setSyncMessage('');
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('user_id', user.id)
        .eq('id', product.id);
      if (error) throw error;

      let cleanupWarning = '';
      if (product.imagePath) {
        try {
          await removeProductImage(product.imagePath);
        } catch {
          cleanupWarning =
            '商品已刪除，但私人縮圖未能清理；請檢查 Storage policy。';
        }
      }

      await refreshCloudProducts(user.id);
      setDeleteTarget(null);
      if (cleanupWarning) setSyncMessage(cleanupWarning);
    } catch (deleteError) {
      setSyncMessage(
        errorMessage(
          deleteError,
          '商品未能由雲端刪除，畫面未有改動。請稍後再試。',
        ),
      );
    } finally {
      setMutationBusy(false);
    }
  };

  const openNewProduct = () => setSheetProduct(null);

  const signOut = async () => {
    if (mutationBusy) return;
    setMutationBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSyncMessage('暫時未能登出，請檢查網絡後再試。');
      setMutationBusy(false);
    }
  };

  if (!authReady) {
    return <FullScreenLoading message="正在確認登入狀態…" />;
  }

  if (!session) return <AuthScreen />;

  if (dataLoading || loadedUserId !== session.user.id) {
    return (
      <FullScreenLoading
        message={migrationProgress || '正在由私人雲端載入抽屜…'}
      />
    );
  }

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
            <div className="flex items-center gap-2">
              <span className="hidden max-w-48 truncate text-xs font-bold text-[hsl(var(--drawer-muted))] sm:block">
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={mutationBusy}
                aria-label="登出"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--drawer-panel))] text-[hsl(var(--drawer-muted))] disabled:opacity-50"
              >
                <LogOut size={18} />
              </button>
              <button
                type="button"
                onClick={openNewProduct}
                disabled={mutationBusy}
                className="flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--drawer-coral))] px-3.5 text-sm font-extrabold text-white disabled:opacity-60 sm:px-4"
              >
                <Plus size={18} />
                新增
              </button>
            </div>
          </header>
          {storageError && (
            <p
              role="alert"
              className="organize-in mt-4 rounded-xl bg-[hsl(7_78%_59%/.12)] px-3 py-2.5 text-xs font-bold leading-5 text-[hsl(var(--drawer-coral-dark))]"
            >
              {storageError}
            </p>
          )}
          {syncMessage && (
            <p
              role="status"
              className="organize-in mt-4 flex items-start gap-2 rounded-xl bg-[hsl(var(--drawer-aqua)/.35)] px-3 py-2.5 text-xs font-bold leading-5 text-[hsl(var(--drawer-ink))]"
            >
              <Cloud size={15} className="mt-0.5 shrink-0" />
              {syncMessage}
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
                  onChange={(amount) =>
                    void updateQuantity(product.id, amount)
                  }
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
            void deleteProduct(deleteTarget);
          }}
        />
      )}
    </div>
  );
}