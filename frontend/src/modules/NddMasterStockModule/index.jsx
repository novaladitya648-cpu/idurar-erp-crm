import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Space, Spin, Tabs, Tag, Typography } from 'antd';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import nddMasterStockService, {
  normalizeStockBalances,
} from '@/services/nddMasterStock.service';
import WarehouseStockView from './components/WarehouseStockView';
import ProductSupplierView from './components/ProductSupplierView';

const { Title, Text } = Typography;

export default function NddMasterStockModule({ defaultTab = 'warehouse-stock' }) {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [errorDetails, setErrorDetails] = useState([]);

  const loadMasterAndStockData = useCallback(async () => {
    setLoading(true);
    setErrorDetails([]);

    const [whRes, prdRes, supRes, sbRes] = await Promise.all([
      nddMasterStockService.getWarehouses(),
      nddMasterStockService.getProducts(),
      nddMasterStockService.getSuppliers(),
      nddMasterStockService.getStockBalances(),
    ]);

    const whList = whRes.items || [];
    const prdList = prdRes.items || [];
    const supList = supRes.items || [];
    const normalizedBalances = normalizeStockBalances(
      sbRes.items || [],
      whList,
      prdList
    );

    setWarehouses(whList);
    setProducts(prdList);
    setSuppliers(supList);
    setStockBalances(normalizedBalances);

    const anyFallback =
      whRes.isFallback || prdRes.isFallback || supRes.isFallback || sbRes.isFallback;
    setIsFallbackMode(anyFallback);

    const errors = [
      whRes.error && `Gudang: ${whRes.error}`,
      prdRes.error && `Produk: ${prdRes.error}`,
      supRes.error && `Pemasok: ${supRes.error}`,
      sbRes.error && `Saldo Stok: ${sbRes.error}`,
    ].filter(Boolean);
    setErrorDetails(errors);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadMasterAndStockData();
  }, [loadMasterAndStockData]);

  const items = [
    {
      key: 'warehouse-stock',
      label: (
        <span>
          <DatabaseOutlined /> Daftar Gudang & Saldo Stok
        </span>
      ),
      children: (
        <WarehouseStockView
          warehouses={warehouses}
          stockBalances={stockBalances}
          loading={loading}
        />
      ),
    },
    {
      key: 'product-supplier',
      label: (
        <span>
          <AppstoreOutlined /> Master Produk & Pemasok
        </span>
      ),
      children: (
        <ProductSupplierView
          products={products}
          suppliers={suppliers}
          loading={loading}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>
              Master Data, Gudang & Saldo Stok — PT NDD
            </Title>
            <Tag color={isFallbackMode ? 'orange' : 'green'}>
              {isFallbackMode ? 'Mode Simulasi Lokal' : 'Terhubung ke API'}
            </Tag>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            Monitoring 3 gudang utama (Surabaya, Jakarta, Semarang), saldo stok per gudang,
            master produk jaringan, dan data pemasok.
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={loadMasterAndStockData}
          loading={loading}
        >
          Muat Ulang Data
        </Button>
      </div>

      {isFallbackMode && (
        <Alert
          type="warning"
          showIcon
          message="Menampilkan Data Simulasi Lokal (Fallback)"
          description={
            errorDetails.length > 0
              ? `Sebagian endpoint API belum merespons (${errorDetails.join(' | ')}). Tampilan menggunakan data contoh PT NDD agar demo tetap berjalan.`
              : 'Endpoint API belum aktif, tampilan menggunakan data contoh PT NDD.'
          }
        />
      )}

      {loading && warehouses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" tip="Memuat data gudang, produk, pemasok, dan saldo stok..." />
        </div>
      ) : (
        <Tabs defaultActiveKey={defaultTab} items={items} />
      )}
    </Space>
  );
}
