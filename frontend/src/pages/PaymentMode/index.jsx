import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
    Alert,
    Button,
    Card,
    Form,
    Modal,
    Popconfirm,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';

import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import errorHandler from '@/request/errorHandler';
import PaymentModeForm from '@/forms/PaymentModeForm';

const { Title, Text } = Typography;

const FALLBACK_PAYMENT_MODES = [
    {
        _id: 'pm-1',
        name: 'Transfer Bank (BCA / Mandiri)',
        description: 'Pembayaran transfer antarbank PT Nusantara Distribusi Digital',
        enabled: true,
        isDefault: true,
    },
    {
        _id: 'pm-2',
        name: 'Virtual Account',
        description: 'Pembayaran otomatis via Virtual Account B2B',
        enabled: true,
        isDefault: false,
    },
    {
        _id: 'pm-3',
        name: 'Tunai / Cash on Delivery',
        description: 'Pembayaran tunai saat barang diterima di gudang/lokasi',
        enabled: true,
        isDefault: false,
    },
];

function getPaymentModeHeaders() {
    const auth = storePersist.get('auth');
    const headers = {};
    if (auth?.current?.token) {
        headers.Authorization = `Bearer ${auth.current.token}`;
    }
    return headers;
}

export default function PaymentModePage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFallback, setIsFallback] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const fetchPaymentModes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}paymentMode/list?page=1&items=50`, {
                withCredentials: true,
                headers: getPaymentModeHeaders(),
            });
            if (response?.data?.success && Array.isArray(response.data.result)) {
                setItems(response.data.result);
                setIsFallback(false);
            } else {
                setItems(FALLBACK_PAYMENT_MODES);
                setIsFallback(true);
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                setItems(FALLBACK_PAYMENT_MODES);
                setIsFallback(true);
            } else {
                errorHandler(error);
                setItems(FALLBACK_PAYMENT_MODES);
                setIsFallback(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPaymentModes();
    }, [fetchPaymentModes]);

    const openCreateModal = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ enabled: true, isDefault: false });
        setModalOpen(true);
    };

    const openEditModal = (record) => {
        setEditingItem(record);
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            enabled: record.enabled ?? true,
            isDefault: record.isDefault ?? false,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            if (isFallback) {
                if (editingItem) {
                    setItems((prev) =>
                        prev.map((item) =>
                            item._id === editingItem._id ? { ...item, ...values } : item
                        )
                    );
                    message.success('Metode pembayaran diperbarui (mode simulasi)');
                } else {
                    setItems((prev) => [
                        { _id: `pm-${Date.now()}`, ...values },
                        ...prev,
                    ]);
                    message.success('Metode pembayaran ditambahkan (mode simulasi)');
                }
                setModalOpen(false);
                return;
            }

            if (editingItem?._id) {
                const res = await axios.patch(
                    `${API_BASE_URL}paymentMode/update/${editingItem._id}`,
                    values,
                    {
                        withCredentials: true,
                        headers: getPaymentModeHeaders(),
                    }
                );
                if (res?.data?.success) {
                    message.success('Metode pembayaran berhasil diperbarui');
                    setModalOpen(false);
                    fetchPaymentModes();
                }
            } else {
                const res = await axios.post(`${API_BASE_URL}paymentMode/create`, values, {
                    withCredentials: true,
                    headers: getPaymentModeHeaders(),
                });
                if (res?.data?.success) {
                    message.success('Metode pembayaran berhasil ditambahkan');
                    setModalOpen(false);
                    fetchPaymentModes();
                }
            }
        } catch (error) {
            if (error?.errorFields) return;
            if (error?.response?.status === 404) {
                setIsFallback(true);
                message.warning('Endpoint /api/paymentMode belum tersedia, beralih ke mode simulasi lokal');
            } else {
                errorHandler(error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (record) => {
        if (isFallback) {
            setItems((prev) => prev.filter((item) => item._id !== record._id));
            message.success('Metode pembayaran dihapus (mode simulasi)');
            return;
        }

        try {
            const res = await axios.delete(`${API_BASE_URL}paymentMode/delete/${record._id}`, {
                withCredentials: true,
                headers: getPaymentModeHeaders(),
            });
            if (res?.data?.success) {
                message.success('Metode pembayaran berhasil dihapus');
                fetchPaymentModes();
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                setItems((prev) => prev.filter((item) => item._id !== record._id));
                setIsFallback(true);
                message.success('Metode pembayaran dihapus (mode simulasi)');
            } else {
                errorHandler(error);
            }
        }
    };

    const columns = [
        {
            title: 'Payment Mode',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Status',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled) => (
                <Tag color={enabled ? 'green' : 'default'}>
                    {enabled ? 'Enabled' : 'Disabled'}
                </Tag>
            ),
        },
        {
            title: 'Default',
            dataIndex: 'isDefault',
            key: 'isDefault',
            render: (isDefault) =>
                isDefault ? <Tag color="blue">Default</Tag> : <Tag>-</Tag>,
        },
        {
            title: 'Aksi',
            key: 'action',
            width: 140,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />
                    <Popconfirm
                        title="Hapus metode pembayaran ini?"
                        onConfirm={() => handleDelete(record)}
                        okText="Ya"
                        cancelText="Batal"
                    >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
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
                            Payments Mode
                        </Title>
                        <Tag color={isFallback ? 'orange' : 'green'}>
                            {isFallback ? 'Mode Simulasi Lokal' : 'Terhubung ke API'}
                        </Tag>
                    </Space>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Pengelolaan metode pembayaran pelanggan dan transaksi PT NDD.
                    </Text>
                </div>

                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchPaymentModes} loading={loading}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        Add Payment Mode
                    </Button>
                </Space>
            </div>

            {isFallback && (
                <Alert
                    type="warning"
                    showIcon
                    message="Menampilkan Data Simulasi Lokal"
                    description="Endpoint /api/paymentMode belum mengembalikan data, sehingga ditampilkan daftar contoh agar modul tetap bisa digunakan."
                />
            )}

            <Card>
                <Table
                    rowKey={(record) => record._id || record.name}
                    columns={columns}
                    dataSource={items}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingItem ? 'Edit Payment Mode' : 'Tambah Payment Mode'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                confirmLoading={submitting}
                okText="Simpan"
                cancelText="Batal"
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <PaymentModeForm isUpdateForm={Boolean(editingItem)} />
                </Form>
            </Modal>
        </Space>
    );
}