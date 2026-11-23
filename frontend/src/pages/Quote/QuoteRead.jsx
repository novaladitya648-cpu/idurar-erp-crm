import { Component } from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import ReadQuoteModule from '@/modules/QuoteModule/ReadQuoteModule';

const { Title } = Typography;

class Boundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, message: error?.message || 'Gagal memuat detail Quote' };
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
    const { id } = useParams();
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quote')}>
                Kembali ke Quotes
            </Button>
            <Card>
                <Title level={4}>Detail Quote {id ? `#${id}` : ''}</Title>
                <Alert type="warning" showIcon message={message} />
            </Card>
        </Space>
    );
}

export default function QuoteRead() {
    return (
        <Boundary fallback={Fallback}>
            <ReadQuoteModule />
        </Boundary>
    );
}