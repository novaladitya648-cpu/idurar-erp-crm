import { Component } from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import CreateQuoteModule from '@/modules/QuoteModule/CreateQuoteModule';

const { Title, Text } = Typography;

class Boundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, message: error?.message || 'Gagal membuka form Quote' };
    }
    render() {
        if (this.state.hasError) {
            const BackWrap = this.props.fallback;
            return <BackWrap message={this.state.message} />;
        }
        return this.props.children;
    }
}

function Fallback({ message }) {
    const navigate = useNavigate();
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quote')}>
                Kembali ke Quotes
            </Button>
            <Card>
                <Title level={4}>Buat Quote Baru</Title>
                <Text type="secondary">Form pembuatan Quote untuk PT Nusantara Distribusi Digital.</Text>
                <Alert
                    style={{ marginTop: 16 }}
                    type="info"
                    showIcon
                    message="Modul Form Quote Belum Aktif Penuh"
                    description={message}
                />
            </Card>
        </Space>
    );
}

export default function QuoteCreate() {
    return (
        <Boundary fallback={Fallback}>
            <CreateQuoteModule />
        </Boundary>
    );
}