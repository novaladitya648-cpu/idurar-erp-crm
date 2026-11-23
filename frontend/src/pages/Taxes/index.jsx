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
import TaxForm from '@/forms/TaxForm';

const { Title, Text } = Typography;

const FALLBACK_TAXES = [
    {
        _id: 'tax-1',
        taxName: 'PPN 11%',
        taxValue: 11,
        enabled: true,
        isDefault: true,
    },
    {
        _id: 'tax-2',
        taxName: 'PPh 22 (1.5%)',
        taxValue: 1.5,
        enabled: true,
        isDefault: false,
    },
    {
        _id: 'tax-3',
        taxName: 'Bebas Pajak / 0%',
        taxValue: 0,
        enabled: true,
        isDefault: false,
    },
];

function getTaxHeaders() {
    const auth = storePersist.get('auth');
    const headers = {};
    if (auth?.current?.token) {
        headers.Authorization = `Bearer ${auth.current.token}`;
    }
    return headers;
}

export default function TaxesPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFallback, setIsFallback] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const fetchTaxes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}taxes/list?page=1&items=50`, {
                withCredentials: true,
                headers: getTaxHeaders(),
            });
            if (response?.data?.success && Array.isArray(response.data.result)) {
                setItems(response.data.result);
                setIsFallback(false);
            } else {
                setItems(FALLBACK_TAXES);
                setIsFallback(true);
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                setItems(FALLBACK_TAXES);
                setIsFallback(true);
            } else {
                errorHandler(error);
                setItems(FALLBACK_TAXES);
                setIsFallback(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTaxes();
    }, [fetchTaxes]);

    const openCreateModal = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({
            taxName: '',
            taxValue: 11,
            enabled: true,
            isDefault: false,
        });
        setModalOpen(true);
    };

    const openEditModal = (record) => {
        setEditingItem(record);
        form.setFieldsValue({
            taxName: record.taxName,
            taxValue: record.taxValue,
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
                    message.success('Tarif pajak diperbarui (mode simulasi)');
                } else {
                    setItems((prev) => [
                        { _id: `tax-${Date.now()}`, ...values },
                        ...prev,
                    ]);
                    message.success('Tarif pajak ditambahkan (mode simulasi)');
                }
                setModalOpen(false);
                return;
            }

            if (editingItem?._id) {
                const res = await axios.patch(
                    `${API_BASE_URL}taxes/update/${editingItem._id}`,
                    values,
                    {
                        withCredentials: true,
                        headers: getTaxHeaders(),
                    }
                );
                if (res?.data?.success) {
                    message.success('Tarif pajak berhasil diperbarui');
                    setModalOpen(false);
                    fetchTaxes();
                }
            } else {
                const res = await axios.post(`${API_BASE_URL}taxes/create`, values, {
                    withCredentials: true,
                    headers: getTaxHeaders(),
                });
                if (res?.data?.success) {
                    message.success('Tarif pajak berhasil ditambahkan');
                    setModalOpen(false);
                    fetchTaxes();
                }
            }
        } catch (error) {
            if (error?.errorFields) return;
            if (error?.response?.status === 404) {
                setIsFallback(true);
                message.warning('Endpoint /api/taxes belum tersedia, beralih ke mode simulasi lokal');
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
            message.success('Tarif pajak dihapus (mode simulasi)');
            return;
        }

        try {
            const res = await axios.delete(`${API_BASE_URL}taxes/delete/${record._id}`, {
                withCredentials: true,
                headers: getTaxHeaders(),
            });
            if (res?.data?.success) {
                message.success('Tarif pajak berhasil dihapus');
                fetchTaxes();
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                setItems((prev) => prev.filter((item) => item._id !== record._id));
                setIsFallback(true);
                message.success('Tarif pajak dihapus (mode simulasi)');
            } else {
                errorHandler(error);
            }
        }
    };

    const columns = [
        {
            title: 'Tax Name',
            dataIndex: 'taxName',
            key: 'taxName',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Tax Value (%)',
            dataIndex: 'taxValue',
            key: 'taxValue',
            render: (val) => `${val ?? 0}%`,
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
                        title="Hapus tarif pajak ini?"
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
                            Taxes
                        </Title>
                        <Tag color={isFallback ? 'orange' : 'green'}>
                            {isFallback ? 'Mode Simulasi Lokal' : 'Terhubung ke API'}
                        </Tag>
                    </Space>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Pengaturan tarif pajak (PPN / potongan pajak) pada transaksi PT NDD.
                    </Text>
                </div>

                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchTaxes} loading={loading}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        Add Tax
                    </Button>
                </Space>
            </div>

            {isFallback && (
                <Alert
                    type="warning"
                    showIcon
                    message="Menampilkan Data Simulasi Lokal"
                    description="Endpoint /api/taxes belum tersedia di backend, sehingga ditampilkan tarif pajak contoh agar modul tetap bisa digunakan."
                />
            )}

            <Card>
                <Table
                    rowKey={(record) => record._id || record.taxName}
                    columns={columns}
                    dataSource={items}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingItem ? 'Edit Tax' : 'Tambah Tax'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                confirmLoading={submitting}
                okText="Simpan"
                cancelText="Batal"
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <TaxForm isUpdateForm={Boolean(editingItem)} />
                </Form>
            </Modal>
        </Space>
    );
}