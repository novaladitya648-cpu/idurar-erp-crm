import { useMemo, useState } from 'react';
import { Card, Empty, Input, Space, Table, Tabs, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ProductSupplierView({
  products = [],
  suppliers = [],
  loading = false,
}) {
  const [productQuery, setProductQuery] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const kw = productQuery.trim().toLowerCase();
    if (!kw) return products;
    return products.filter(
      (p) =>
        (p.sku || '').toLowerCase().includes(kw) ||
        (p.name || '').toLowerCase().includes(kw) ||
        (p.category || '').toLowerCase().includes(kw)
    );
  }, [products, productQuery]);

  const filteredSuppliers = useMemo(() => {
    const kw = supplierQuery.trim().toLowerCase();
    if (!kw) return suppliers;
    return suppliers.filter(
      (s) =>
        (s.code || '').toLowerCase().includes(kw) ||
        (s.name || '').toLowerCase().includes(kw) ||
        (s.contactPerson || '').toLowerCase().includes(kw) ||
        (s.address || '').toLowerCase().includes(kw)
    );
  }, [suppliers, supplierQuery]);

  const productColumns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku) => <Tag color="geekblue">{sku || '-'}</Tag>,
    },
    {
      title: 'Nama Produk',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name || '-'}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag>{cat || 'Networking'}</Tag>,
    },
    {
      title: 'Satuan',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit) => unit || 'Unit',
    },
    {
      title: 'Harga Pokok',
      dataIndex: 'costPrice',
      key: 'costPrice',
      align: 'right',
      render: (val) => formatRupiah(val),
    },
    {
      title: 'Harga Jual',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      align: 'right',
      render: (val) => <Text strong>{formatRupiah(val)}</Text>,
    },
    {
      title: 'Min. Stok',
      dataIndex: 'minStock',
      key: 'minStock',
      align: 'right',
      render: (val) => Number(val ?? 5),
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (
        <Tag color={enabled !== false ? 'green' : 'default'}>
          {enabled !== false ? 'Aktif' : 'Nonaktif'}
        </Tag>
      ),
    },
  ];

  const supplierColumns = [
    {
      title: 'Kode',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color="purple">{code || '-'}</Tag>,
    },
    {
      title: 'Nama Pemasok',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Text strong>{name || '-'}</Text>,
    },
    {
      title: 'PIC / Kontak',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.contactPerson || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.phone || '-'} {record.email ? `• ${record.email}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Alamat / Kota',
      dataIndex: 'address',
      key: 'address',
      render: (addr) => addr || '-',
    },
    {
      title: 'Lead Time',
      dataIndex: 'leadTimeDays',
      key: 'leadTimeDays',
      align: 'right',
      render: (days) => `${Number(days ?? 3)} hari`,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (
        <Tag color={enabled !== false ? 'green' : 'default'}>
          {enabled !== false ? 'Aktif' : 'Nonaktif'}
        </Tag>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'products',
      label: `Daftar Produk Jaringan (${products.length})`,
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Cari SKU, nama produk, atau kategori..."
            style={{ maxWidth: 320 }}
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
          <Table
            rowKey={(r) => r._id || r.sku}
            columns={productColumns}
            dataSource={filteredProducts}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{
              emptyText: <Empty description="Belum ada data master produk" />,
            }}
          />
        </Space>
      ),
    },
    {
      key: 'suppliers',
      label: `Daftar Pemasok / Supplier (${suppliers.length})`,
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Cari kode, nama pemasok, PIC, atau kota..."
            style={{ maxWidth: 320 }}
            value={supplierQuery}
            onChange={(e) => setSupplierQuery(e.target.value)}
          />
          <Table
            rowKey={(r) => r._id || r.code}
            columns={supplierColumns}
            dataSource={filteredSuppliers}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{
              emptyText: <Empty description="Belum ada data master pemasok" />,
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Tabs defaultActiveKey="products" items={tabItems} />
    </Card>
  );
}
