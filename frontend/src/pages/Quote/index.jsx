import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
    Alert,
    Button,
    Card,
    Popconfirm,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import errorHandler from '@/request/errorHandler';
import { useMoney } from '@/settings';

const { Title, Text } = Typography;

const FALLBACK_QUOTES = [
    {
        _id: 'q-101',
        number: 'QT-NDD-001',
        client: { company: 'PT Mitra Solusi Jaringan' },
        date: '2026-11-10',
        expiredDate: '2026-11-24',
        total: 45000000,
        status: 'Sent',
    },
    {
        _id: 'q-102',
        number: 'QT-NDD-002',
        client: { company: 'CV Karya Mandiri Sentosa' },
        date: '2026-11-14',
        expiredDate: '2026-11-30',
        total: 18500000,
        status: 'Accepted',
    },
];

function getQuoteHeaders() {
    const auth = storePersist.get('auth');
    const headers = {};
    if (auth?.current?.token) {
        headers.Authorization = `Bearer ${auth.current.token}`;
    }
    return headers;
}

export default function QuotePage() {
    const navigate = useNavigate();
    const { moneyFormatter } = useMoney();

    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFallback, setIsFallback] = useState(false);

    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}quote/list?page=1&items=50`, {
                withCredentials: true,
                headers: getQuoteHeaders(),
            });
            if (response?.data?.success && Array.isArray(response.data.result)) {
                setQuotes(response.data.result);
                setIsFallback(false);
            } else {
                setQuotes(FALLBACK_QUOTES);
                setIsFallback(true);
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                setQuotes(FALLBACK_QUOTES);
                setIsFallback(true);
            } else {
                errorHandler(error);
                setQuotes(FALLBACK_QUOTES);
                setIsFallback(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    const handleDelete = async (record) => {
        if (isFallback) {
            setQuotes((prev) => prev.filter((item) => item._id !== record._id));
            message.success('Quote dihapus (mode simulasi)');
            return;
        }

        try {
            const res = await axios.delete(`${API_BASE_URL}quote/delete/${record._id}`, {
                withCredentials: true,
                headers: getQuoteHeaders(),
            });
            if (res?.data?.success) {
                message.success('Quote berhasil dihapus');
                fetchQuotes();
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                setQuotes((prev) => prev.filter((item) => item._id !== record._id));
                setIsFallback(true);
                message.success('Quote dihapus (mode simulasi)');
            } else {
                errorHandler(error);
            }
        }
    };

    const columns = [
        {
            title: 'Quote Number',
            dataIndex: 'number',
            key: 'number',
            render: (val) => <strong>{val}</strong>,
        },
        {
            title: 'Client',
            key: 'client',
            render: (_, row) => row.client?.company || row.client?.name || '-',
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (val) => (val ? String(val).slice(0, 10) : '-'),
        },
        {
            title: 'Expired Date',
            dataIndex: 'expiredDate',
            key: 'expiredDate',
            render: (val) => (val ? String(val).slice(0, 10) : '-'),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            align: 'right',
            render: (val) => moneyFormatter({ amount: val || 0 }),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (val) => <Tag color="blue">{val || 'Draft'}</Tag>,
        },
        {
            title: 'Aksi',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Popconfirm
                    title="Hapus quote ini?"
                    onConfirm={() => handleDelete(record)}
                    okText="Ya"
                    cancelText="Batal"
                >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
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
                            Quotes
                        </Title>
                        <Tag color={isFallback ? 'orange' : 'green'}>
                            {isFallback ? 'Mode Simulasi Lokal' : 'Terhubung ke API'}
                        </Tag>
                    </Space>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Daftar penawaran harga (Quote) PT Nusantara Distribusi Digital.
                    </Text>
                </div>

                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchQuotes} loading={loading}>
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/quote/create')}
                    >
                        Add New Quote
                    </Button>
                </Space>
            </div>

            {isFallback && (
                <Alert
                    type="warning"
                    showIcon
                    message="Menampilkan Data Simulasi Lokal"
                    description="Endpoint /api/quote belum mengembalikan data, sehingga ditampilkan daftar contoh agar navigasi Quote tetap berjalan lancar."
                />
            )}

            <Card>
                <Table
                    rowKey={(row) => row._id || row.number}
                    columns={columns}
                    dataSource={quotes}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </Space>
    );
}