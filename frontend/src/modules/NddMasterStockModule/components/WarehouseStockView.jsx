import { useMemo, useState } from 'react';
import {
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  EnvironmentOutlined,
  SearchOutlined,
  ShopOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

export default function WarehouseStockView({
  warehouses = [],
  stockBalances = [],
  loading = false,
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Ringkasan stok per gudang
  const warehouseSummaries = useMemo(() => {
    return warehouses.map((wh) => {
      const rows = stockBalances.filter(
        (sb) => String(sb.warehouse?._id) === String(wh._id)
      );
      const totalSku = rows.length;
      const totalPhysical = rows.reduce((sum, r) => sum + Number(r.physicalQty || 0), 0);
      const totalAvailable = rows.reduce((sum, r) => sum + Number(r.availableQty || 0), 0);

      return {
        ...wh,
        totalSku,
        totalPhysical,
        totalAvailable,
      };
    });
  }, [warehouses, stockBalances]);

  // Filter tabel saldo stok berdasarkan gudang & keyword produk/SKU
  const filteredStockBalances = useMemo(() => {
    return stockBalances.filter((item) => {
      const matchWarehouse =
        selectedWarehouseId === 'ALL' ||
        String(item.warehouse?._id) === String(selectedWarehouseId);

      const kw = searchKeyword.trim().toLowerCase();
      const matchSearch =
        !kw ||
        (item.product?.sku || '').toLowerCase().includes(kw) ||
        (item.product?.name || '').toLowerCase().includes(kw) ||
        (item.warehouse?.name || '').toLowerCase().includes(kw);

      return matchWarehouse && matchSearch;
    });
  }, [stockBalances, selectedWarehouseId, searchKeyword]);

  const columns = [
    {
      title: 'Gudang',
      key: 'warehouse',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.warehouse?.name || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.warehouse?.code ? `${record.warehouse.code} • ` : ''}
            {record.warehouse?.city || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'SKU Produk',
      key: 'sku',
      render: (_, record) => <Tag color="blue">{record.product?.sku || '-'}</Tag>,
    },
    {
      title: 'Nama Produk',
      key: 'productName',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.product?.name || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Satuan: {record.product?.unit || 'Unit'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Stok Fisik',
      dataIndex: 'physicalQty',
      key: 'physicalQty',
      align: 'right',
      render: (val) => <Text strong>{Number(val || 0).toLocaleString('id-ID')}</Text>,
    },
    {
      title: 'Tereservasi',
      dataIndex: 'reservedQty',
      key: 'reservedQty',
      align: 'right',
      render: (val) => (
        <Text type="secondary">{Number(val || 0).toLocaleString('id-ID')}</Text>
      ),
    },
    {
      title: 'Stok Tersedia',
      dataIndex: 'availableQty',
      key: 'availableQty',
      align: 'right',
      render: (val, record) => {
        const available = Number(val || 0);
        const minStock = Number(record.product?.minStock ?? 5);
        const isLow = available <= minStock;

        return (
          <Space>
            <Tag color={isLow ? 'red' : 'green'}>
              {available.toLocaleString('id-ID')} {record.product?.unit || 'Unit'}
            </Tag>
            {isLow && <WarningOutlined style={{ color: '#cf1322' }} title="Stok menipis" />}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Kartu Daftar 3 Gudang Utama PT NDD */}
      <div>
        <Title level={5} style={{ marginBottom: 12 }}>
          Daftar Gudang PT Nusantara Distribusi Digital ({warehouses.length} Lokasi)
        </Title>
        {warehouses.length === 0 && !loading ? (
          <Card>
            <Empty description="Data gudang belum tersedia" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {warehouseSummaries.map((wh) => {
              const isSelected = String(selectedWarehouseId) === String(wh._id);
              return (
                <Col xs={24} md={8} key={wh._id}>
                  <Card
                    hoverable
                    loading={loading}
                    onClick={() =>
                      setSelectedWarehouseId(isSelected ? 'ALL' : String(wh._id))
                    }
                    style={{
                      borderColor: isSelected ? '#1677ff' : undefined,
                      background: isSelected ? '#f0f7ff' : undefined,
                    }}
                  >
                    <Space
                      style={{ width: '100%', justifyContent: 'space-between' }}
                      align="start"
                    >
                      <Space direction="vertical" size={2}>
                        <Space>
                          <ShopOutlined style={{ color: '#1677ff' }} />
                          <Text strong>{wh.name}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <EnvironmentOutlined /> {wh.city} ({wh.code})
                        </Text>
                      </Space>
                      <Tag color={wh.enabled !== false ? 'green' : 'default'}>
                        {wh.enabled !== false ? 'Aktif' : 'Nonaktif'}
                      </Tag>
                    </Space>

                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {wh.address || 'Alamat belum diatur'}
                      </Text>
                      {wh.picName && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          PIC: {wh.picName} {wh.phone ? `(${wh.phone})` : ''}
                        </Text>
                      )}
                    </div>

                    <Row gutter={12} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <Statistic
                          title="Jumlah SKU"
                          value={wh.totalSku}
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Stok Tersedia"
                          value={wh.totalAvailable}
                          valueStyle={{ fontSize: 18, color: '#389e0d' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Tabel Saldo Stok per Gudang & Produk */}
      <Card
        title="Saldo Stok Produk per Gudang"
        extra={
          <Space wrap>
            <Select
              style={{ width: 210 }}
              value={selectedWarehouseId}
              onChange={setSelectedWarehouseId}
              options={[
                { label: 'Semua Gudang (3 Lokasi)', value: 'ALL' },
                ...warehouses.map((w) => ({
                  label: `${w.name} (${w.city})`,
                  value: String(w._id),
                })),
              ]}
            />
            <Input
              allowClear
              placeholder="Cari SKU atau nama produk..."
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Space>
        }
      >
        <Table
          rowKey={(record) =>
            record._id || `${record.warehouse?._id}-${record.product?._id}`
          }
          columns={columns}
          dataSource={filteredStockBalances}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty description="Belum ada data saldo stok yang sesuai filter" />
            ),
          }}
        />
      </Card>
    </Space>
  );
}
