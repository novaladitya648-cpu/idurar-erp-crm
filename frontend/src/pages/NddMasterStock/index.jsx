import NddMasterStockModule from '@/modules/NddMasterStockModule';

export default function NddMasterStockPage({ defaultTab = 'warehouse-stock' }) {
  return <NddMasterStockModule defaultTab={defaultTab} />;
}
