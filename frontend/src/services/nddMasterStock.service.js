import axios from 'axios';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';

/**
 * Service Frontend Orang 1: Master Data, Gudang & Saldo Stok
 * PT Nusantara Distribusi Digital (NDD) - Batch 1
 *
 * Hanya menangani operasi GET (read/list) untuk:
 * - warehouse (3 gudang: Surabaya, Jakarta, Semarang)
 * - product (master produk jaringan)
 * - supplier (master pemasok)
 * - stockbalance (saldo stok per gudang & produk)
 */

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const auth = storePersist.get('auth');
  if (auth?.current?.token) {
    config.headers.Authorization = `Bearer ${auth.current.token}`;
  }
  return config;
});

// Fallback dummy data sementara jika endpoint backend belum siap / offline
export const DUMMY_WAREHOUSES = [
  {
    _id: 'wh-sby-001',
    code: 'WH-SBY',
    name: 'Gudang Surabaya',
    city: 'Surabaya',
    address: 'Jl. Rungkut Industri III No. 45, Surabaya',
    picName: 'Budi Santoso',
    phone: '+62318472910',
    enabled: true,
  },
  {
    _id: 'wh-jkt-002',
    code: 'WH-JKT',
    name: 'Gudang Jakarta',
    city: 'Jakarta',
    address: 'Jl. Mangga Dua Raya No. 12, Jakarta',
    picName: 'Andi Wijaya',
    phone: '+62216230451',
    enabled: true,
  },
  {
    _id: 'wh-smg-003',
    code: 'WH-SMG',
    name: 'Gudang Semarang',
    city: 'Semarang',
    address: 'Jl. Pemuda No. 88, Semarang',
    picName: 'Rina Kusuma',
    phone: '+62243519820',
    enabled: true,
  },
];

export const DUMMY_PRODUCTS = [
  {
    _id: 'prd-001',
    sku: 'NDD-RTR-001',
    name: 'MikroTik RB4011iGS+RM Enterprise Router',
    category: 'Networking',
    unit: 'Unit',
    costPrice: 3100000,
    sellingPrice: 3650000,
    minStock: 5,
    description: '10-Port Gigabit Ethernet + SFP+ 10Gbps Rackmount Router',
    enabled: true,
  },
  {
    _id: 'prd-002',
    sku: 'NDD-SWC-002',
    name: 'Cisco Catalyst 1000-24T-4G-L Managed Switch',
    category: 'Networking',
    unit: 'Unit',
    costPrice: 6800000,
    sellingPrice: 7750000,
    minStock: 4,
    description: '24-Port Gigabit Ethernet + 4x 1G SFP Uplinks',
    enabled: true,
  },
  {
    _id: 'prd-003',
    sku: 'NDD-AP-003',
    name: 'Ubiquiti UniFi U6 Pro Wi-Fi 6 Access Point',
    category: 'Wireless',
    unit: 'Unit',
    costPrice: 2350000,
    sellingPrice: 2790000,
    minStock: 10,
    description: 'Dual-Band Wi-Fi 6 Indoor/Outdoor Enterprise AP',
    enabled: true,
  },
  {
    _id: 'prd-004',
    sku: 'NDD-CBL-004',
    name: 'Belden UTP Cat6 305m Roll (Original)',
    category: 'Cabling',
    unit: 'Box',
    costPrice: 1650000,
    sellingPrice: 1950000,
    minStock: 8,
    description: 'Kabel LAN UTP Category 6 1000ft Pull Box',
    enabled: true,
  },
];

export const DUMMY_SUPPLIERS = [
  {
    _id: 'sup-001',
    code: 'SUP-001',
    name: 'PT Distributor Jaringan Utama',
    contactPerson: 'Hendra Gunawan',
    phone: '+62215550192',
    email: 'sales@dju-network.co.id',
    address: 'Jakarta Pusat',
    leadTimeDays: 3,
    enabled: true,
  },
  {
    _id: 'sup-002',
    code: 'SUP-002',
    name: 'CV Surya Solusi Infrastruktur',
    contactPerson: 'Dewi Lestari',
    phone: '+62317782910',
    email: 'order@suryasolusi.id',
    address: 'Surabaya',
    leadTimeDays: 2,
    enabled: true,
  },
  {
    _id: 'sup-003',
    code: 'SUP-003',
    name: 'PT Nusantara Kabel & Perangkat',
    contactPerson: 'Fajar Pratama',
    phone: '+62248810293',
    email: 'supply@nkp-tech.co.id',
    address: 'Semarang',
    leadTimeDays: 4,
    enabled: true,
  },
];

export const DUMMY_STOCK_BALANCES = [
  {
    _id: 'sb-001',
    warehouse: DUMMY_WAREHOUSES[0],
    product: DUMMY_PRODUCTS[0],
    physicalQty: 25,
    reservedQty: 3,
    availableQty: 22,
    updated: '2026-11-23T10:00:00.000Z',
  },
  {
    _id: 'sb-002',
    warehouse: DUMMY_WAREHOUSES[0],
    product: DUMMY_PRODUCTS[1],
    physicalQty: 12,
    reservedQty: 2,
    availableQty: 10,
    updated: '2026-11-23T10:00:00.000Z',
  },
  {
    _id: 'sb-003',
    warehouse: DUMMY_WAREHOUSES[1],
    product: DUMMY_PRODUCTS[0],
    physicalQty: 30,
    reservedQty: 5,
    availableQty: 25,
    updated: '2026-11-23T10:00:00.000Z',
  },
  {
    _id: 'sb-004',
    warehouse: DUMMY_WAREHOUSES[1],
    product: DUMMY_PRODUCTS[2],
    physicalQty: 40,
    reservedQty: 0,
    availableQty: 40,
    updated: '2026-11-23T10:00:00.000Z',
  },
  {
    _id: 'sb-005',
    warehouse: DUMMY_WAREHOUSES[2],
    product: DUMMY_PRODUCTS[3],
    physicalQty: 18,
    reservedQty: 4,
    availableQty: 14,
    updated: '2026-11-23T10:00:00.000Z',
  },
];

/**
 * Normalizer response list / listAll sesuai kontrak Batch 1:
 * - Koleksi kosong mengembalikan status HTTP 203 (di list success: true, di listAll success: false)
 * - Cek Array.isArray(data?.result), perlakukan kosong sebagai [] bukan error
 * - Konversi pagination.page ke Number
 */
function normalizeListResponse(response) {
  const payload = response?.data || {};
  const items = Array.isArray(payload.result) ? payload.result : [];
  const pagination = payload.pagination
    ? {
        page: Number(payload.pagination.page) || 1,
        pages: Number(payload.pagination.pages) || 0,
        count: Number(payload.pagination.count) || items.length,
      }
    : {
        page: 1,
        pages: items.length > 0 ? 1 : 0,
        count: items.length,
      };

  return {
    items,
    pagination,
    message: payload.message || '',
  };
}

/**
 * Normalizer relasi product & warehouse pada StockBalance
 * Mendukung bentuk objek ter-populate maupun string ID mentah
 */
export function normalizeStockBalances(rawBalances = [], warehouses = [], products = []) {
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w]));
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  return rawBalances.map((item) => {
    const whObj =
      item.warehouse && typeof item.warehouse === 'object'
        ? item.warehouse
        : warehouseMap.get(String(item.warehouse || item.warehouseId)) || {
            _id: item.warehouse || item.warehouseId || '-',
            code: '-',
            name: 'Gudang Tidak Diketahui',
            city: '-',
          };

    const prdObj =
      item.product && typeof item.product === 'object'
        ? item.product
        : productMap.get(String(item.product || item.productId)) || {
            _id: item.product || item.productId || '-',
            sku: '-',
            name: 'Produk Tidak Diketahui',
            unit: 'Unit',
            minStock: 0,
          };

    const physicalQty = Number(item.physicalQty ?? item.qty ?? 0);
    const reservedQty = Number(item.reservedQty ?? 0);
    const availableQty =
      item.availableQty !== undefined ? Number(item.availableQty) : physicalQty - reservedQty;

    return {
      ...item,
      warehouse: whObj,
      product: prdObj,
      physicalQty,
      reservedQty,
      availableQty,
    };
  });
}

async function fetchEntityWithFallback(endpoint, params, fallbackItems) {
  try {
    const response = await apiClient.get(endpoint, {
      params,
      validateStatus: (status) => (status >= 200 && status < 300) || status === 203,
    });

    const normalized = normalizeListResponse(response);
    return {
      ...normalized,
      isFallback: false,
      error: null,
    };
  } catch (err) {
    const errorMsg =
      err?.response?.data?.message ||
      err?.message ||
      'Gagal terhubung ke server API backend.';

    return {
      items: fallbackItems,
      pagination: {
        page: 1,
        pages: fallbackItems.length > 0 ? 1 : 0,
        count: fallbackItems.length,
      },
      message: 'Menampilkan data simulasi lokal (Fallback)',
      isFallback: true,
      error: errorMsg,
    };
  }
}

const nddMasterStockService = {
  getWarehouses: async (params = {}) => {
    return fetchEntityWithFallback('warehouse/listAll', params, DUMMY_WAREHOUSES);
  },

  getProducts: async (params = {}) => {
    return fetchEntityWithFallback('product/listAll', params, DUMMY_PRODUCTS);
  },

  getSuppliers: async (params = {}) => {
    return fetchEntityWithFallback('supplier/listAll', params, DUMMY_SUPPLIERS);
  },

  getStockBalances: async (params = {}) => {
    // Kontrak Batch 1: StockBalance tidak punya field enabled, gunakan sortBy=updated
    const queryParams = {
      sortBy: 'updated',
      sortValue: -1,
      items: 100,
      ...params,
    };
    return fetchEntityWithFallback('stockbalance/list', queryParams, DUMMY_STOCK_BALANCES);
  },
};

export default nddMasterStockService;
