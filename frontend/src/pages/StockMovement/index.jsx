
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  message,
} from 'antd';

import request from '@/request/request';

const getRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.result?.items)) return response.result.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getId = (item) => item?._id || item?.id;

export default function StockMovement() {
  const [form] = Form.useForm();

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const movementType = Form.useWatch('type', form);

  const loadData = async () => {
    setLoading(true);

    try {
      const [productResponse, warehouseResponse, ledgerResponse] =
        await Promise.all([
          request.listAll({ entity: 'product' }),
          request.listAll({ entity: 'warehouse' }),
          request.listAll({ entity: 'stockledger' }),
        ]);

      setProducts(getRows(productResponse));
      setWarehouses(getRows(warehouseResponse));

      const ledgerRows = getRows(ledgerResponse);
      ledgerRows.sort(
        (a, b) => new Date(b.created || 0) - new Date(a.created || 0)
      );
      setHistory(ledgerRows);
    } catch (error) {
      message.error('Gagal mengambil data stok dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (values) => {
    if (values.type === 'TRANSFER') {
      message.warning(
        'Fitur penyimpanan transfer menunggu endpoint transfer dari backend.'
      );
      return;
    }

    setSaving(true);

    try {
      const response = await request.post({
        entity: 'stock/movement',
        jsonData: {
          product: values.product,
          warehouse: values.warehouse,
          type: values.type,
          qty: values.qty,
          referenceType: 'MANUAL',
          referenceNumber: values.referenceNumber || undefined,
          notes: values.notes || '',
        },
      });

      if (response?.success === false || response?.error) {
        message.error(
          response?.message || 'Mutasi stok gagal disimpan.'
        );
        return;
      }

      message.success(
        response?.message || 'Mutasi stok berhasil dicatat.'
      );

      form.resetFields();
      await loadData();
    } catch (error) {
      message.error('Terjadi kesalahan saat menyimpan mutasi.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'created',
      key: 'created',
      render: (value) =>
        value ? new Date(value).toLocaleString('id-ID') : '-',
    },
    {
      title: 'Produk',
      dataIndex: 'product',
      key: 'product',
      render: (value) =>
        typeof value === 'object'
          ? `${value?.sku || ''} ${value?.name || ''}`
          : value || '-',
    },
    {
      title: 'Gudang',
      dataIndex: 'warehouse',
      key: 'warehouse',
      render: (value) =>
        typeof value === 'object'
          ? value?.name || value?.city || '-'
          : value || '-',
    },
    {
      title: 'Jenis',
      dataIndex: 'type',
      key: 'type',
      render: (value) => {
        const color =
          value === 'IN' || value === 'RETURN'
            ? 'green'
            : value === 'OUT'
              ? 'red'
              : 'blue';

        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: 'Perubahan Stok',
      dataIndex: 'qtyChange',
      key: 'qtyChange',
      render: (value) => (
        <span style={{ color: value < 0 ? '#cf1322' : '#389e0d' }}>
          {value > 0 ? '+' : ''}
          {value ?? 0}
        </span>
      ),
    },
    {
      title: 'Saldo Setelah Mutasi',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
    },
    {
      title: 'Nomor Referensi',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      render: (value) => value || '-',
    },
    {
      title: 'Catatan',
      dataIndex: 'notes',
      key: 'notes',
      render: (value) => value || '-',
    },
  ];

  const movementOptions = [
    { label: 'Barang Masuk (IN)', value: 'IN' },
    { label: 'Barang Keluar (OUT)', value: 'OUT' },
    { label: 'Transfer Gudang', value: 'TRANSFER' },
  ];

  const tabItems = [
    {
      key: 'form',
      label: 'Form Mutasi Stok',
      children: (
        <Card title="Pencatatan Mutasi Stok" bordered={false}>
          <Alert
            message="Petunjuk Mutasi"
            description="Pilih IN untuk menambah stok dan OUT untuk mengurangi stok. Transfer antargudang belum dapat disimpan sampai endpoint khusus tersedia dari backend."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ type: 'IN', qty: 1 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Jenis Mutasi"
                  name="type"
                  rules={[{ required: true, message: 'Pilih jenis mutasi' }]}
                >
                  <Select options={movementOptions} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Produk"
                  name="product"
                  rules={[{ required: true, message: 'Pilih produk' }]}
                >
                  <Select
                    showSearch
                    placeholder="Pilih produk"
                    optionFilterProp="label"
                    options={products.map((item) => ({
                      value: getId(item),
                      label: `${item.sku || ''} - ${item.name || ''}`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Gudang Asal / Gudang Mutasi"
                  name="warehouse"
                  rules={[{ required: true, message: 'Pilih gudang' }]}
                >
                  <Select
                    showSearch
                    placeholder="Pilih gudang"
                    optionFilterProp="label"
                    options={warehouses.map((item) => ({
                      value: getId(item),
                      label: `${item.name || ''} - ${item.city || ''}`,
                    }))}
                  />
                </Form.Item>
              </Col>

              {movementType === 'TRANSFER' && (
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Gudang Tujuan"
                    name="destinationWarehouse"
                    rules={[
                      { required: true, message: 'Pilih gudang tujuan' },
                    ]}
                  >
                    <Select
                      placeholder="Pilih gudang tujuan"
                      options={warehouses
                        .filter(
                          (item) =>
                            getId(item) !== form.getFieldValue('warehouse')
                        )
                        .map((item) => ({
                          value: getId(item),
                          label: `${item.name || ''} - ${item.city || ''}`,
                        }))}
                    />
                  </Form.Item>
                </Col>
              )}

              <Col xs={24} md={12}>
                <Form.Item
                  label="Jumlah"
                  name="qty"
                  rules={[
                    { required: true, message: 'Masukkan jumlah stok' },
                    {
                      type: 'number',
                      min: 1,
                      message: 'Jumlah minimal 1',
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    placeholder="Masukkan jumlah"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Nomor Referensi"
                  name="referenceNumber"
                >
                  <Input placeholder="Contoh: MUT-001" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Catatan" name="notes">
                  <Input.TextArea
                    rows={3}
                    placeholder="Masukkan keterangan mutasi stok"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                disabled={movementType === 'TRANSFER'}
              >
                Simpan Mutasi
              </Button>

              <Button onClick={() => form.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form>
        </Card>
      ),
    },
    {
      key: 'history',
      label: 'Riwayat Mutasi',
      children: (
        <Card title="Riwayat Mutasi Stok" bordered={false}>
          <div style={{ marginBottom: 16 }}>
            <Button onClick={loadData} loading={loading}>
              Refresh Data
            </Button>
          </div>

          <Table
            rowKey={(record) => getId(record)}
            columns={columns}
            dataSource={history}
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Belum ada riwayat mutasi stok' }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <h2>Manajemen Mutasi Stok</h2>
      <p>Kelola barang masuk, barang keluar, dan transfer antargudang.</p>

      <Tabs items={tabItems} />
    </div>
  );
}
