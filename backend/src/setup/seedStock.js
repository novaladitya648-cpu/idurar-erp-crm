require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('module-alias/register');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const Warehouse = require('@/models/appModels/Warehouse');
const Product = require('@/models/appModels/Product');
const StockBalance = require('@/models/appModels/StockBalance');
const StockLedger = require('@/models/appModels/StockLedger');

const warehouses = [
    { code: 'SBY', name: 'Gudang Surabaya', city: 'Surabaya' },
    { code: 'JKT', name: 'Gudang Jakarta', city: 'Jakarta' },
    { code: 'SMG', name: 'Gudang Semarang', city: 'Semarang' },
];

const products = [
    { sku: 'NET-RTR-01', name: 'Router Dual-Band AX1800', costPrice: 650000, sellingPrice: 850000, stock: { SBY: 60, JKT: 120, SMG: 30 } },
    { sku: 'NET-SWT-24', name: 'Switch 24-Port Gigabit', costPrice: 1800000, sellingPrice: 2400000, stock: { SBY: 80, JKT: 50, SMG: 40 } },
    { sku: 'NET-AP-01', name: 'Access Point Ceiling', costPrice: 900000, sellingPrice: 1200000, stock: { SBY: 25, JKT: 70, SMG: 20 } },
    { sku: 'NET-FW-01', name: 'Firewall Appliance SMB', costPrice: 4500000, sellingPrice: 6000000, stock: { SBY: 10, JKT: 15, SMG: 5 } },
    { sku: 'NET-CBL-305', name: 'Kabel UTP Cat6 305m', costPrice: 1100000, sellingPrice: 1450000, stock: { SBY: 40, JKT: 40, SMG: 40 } },
];

(async () => {
    try {
        await mongoose.connect(process.env.DATABASE);

        const whMap = {};
        for (const w of warehouses) {
            let doc = await Warehouse.findOne({ code: w.code });
            if (!doc) doc = await Warehouse.create(w);
            whMap[w.code] = doc;
        }

        for (const { stock, ...data } of products) {
            let prod = await Product.findOne({ sku: data.sku });
            if (!prod) prod = await Product.create(data);

            for (const [code, qty] of Object.entries(stock)) {
                const wh = whMap[code];
                const exists = await StockBalance.findOne({ product: prod._id, warehouse: wh._id });
                if (exists) continue;

                await StockBalance.create({
                    product: prod._id,
                    warehouse: wh._id,
                    physicalQty: qty,
                    reservedQty: 0,
                    availableQty: qty,
                });
                await StockLedger.create({
                    product: prod._id,
                    warehouse: wh._id,
                    type: 'IN',
                    qtyChange: qty,
                    balanceAfter: qty,
                    referenceType: 'SEED',
                    referenceNumber: `SEED-${data.sku}-${code}`,
                    notes: 'Stok awal (data uji)',
                });
            }
        }

        console.log('Seed selesai: 3 gudang, 5 produk, saldo stok awal.');
    } catch (err) {
        console.error('Seed gagal:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
})();
