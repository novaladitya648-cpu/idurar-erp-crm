const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.DATABASE);

const Product = require('../models/appModels/Product');
const Warehouse = require('../models/appModels/Warehouse');
const Supplier = require('../models/appModels/Supplier');
const StockBalance = require('../models/appModels/StockBalance');
const StockLedger = require('../models/appModels/StockLedger');

async function seedBatch1() {
    try {
        console.log('Memulai seed Batch 1 PT NDD...');

        const warehousesData = [
            { code: 'WH-SBY', name: 'Gudang Utama Surabaya', city: 'Surabaya', address: 'Jl. Rungkut Industri III No. 45, Surabaya', picName: 'Budi Santoso', phone: '031-8472910' },
            { code: 'WH-JKT', name: 'Gudang Cabang Jakarta', city: 'Jakarta', address: 'Jl. Mangga Dua Raya No. 12, Jakarta', picName: 'Andi Wijaya', phone: '021-6230451' },
            { code: 'WH-SMG', name: 'Gudang Cabang Semarang', city: 'Semarang', address: 'Jl. Pemuda No. 88, Semarang', picName: 'Dedi Kurniawan', phone: '024-3519820' },
        ];

        const warehouses = {};
        for (const w of warehousesData) {
            const doc = await Warehouse.findOneAndUpdate({ code: w.code }, w, { upsert: true, new: true });
            warehouses[w.code] = doc;
        }

        const suppliersData = [
            { code: 'SUP-01', name: 'PT Distribusi Jaringan Indonesia', contactPerson: 'Hendra', phone: '021-5551234', email: 'sales@dji-net.co.id', address: 'Jakarta Pusat', leadTimeDays: 2 },
            { code: 'SUP-02', name: 'CV Mitra Infrastruktur Global', contactPerson: 'Rina', phone: '031-7778899', email: 'order@mig-tech.id', address: 'Surabaya Barat', leadTimeDays: 3 },
        ];

        for (const s of suppliersData) {
            await Supplier.findOneAndUpdate({ code: s.code }, s, { upsert: true, new: true });
        }

        const productsData = [
            { sku: 'NET-MTK-RB4011', name: 'MikroTik RouterBOARD RB4011iGS+RM', category: 'Router', unit: 'Unit', costPrice: 2800000, sellingPrice: 3450000, minStock: 10 },
            { sku: 'NET-UBQ-U6PRO', name: 'Ubiquiti UniFi U6 Pro Access Point', category: 'Access Point', unit: 'Unit', costPrice: 2100000, sellingPrice: 2650000, minStock: 15 },
            { sku: 'NET-CSC-CBS250', name: 'Cisco Business CBS250-24P-4G PoE Switch', category: 'Switch', unit: 'Unit', costPrice: 6500000, sellingPrice: 7900000, minStock: 5 },
            { sku: 'NET-BLD-CAT6', name: 'Belden Kabel UTP Cat6 305m (1 Box)', category: 'Cabling', unit: 'Box', costPrice: 1650000, sellingPrice: 2100000, minStock: 20 },
            { sku: 'NET-TPL-ER605', name: 'TP-Link Omada ER605 Gigabit VPN Router', category: 'Router', unit: 'Unit', costPrice: 750000, sellingPrice: 980000, minStock: 15 },
        ];

        const products = [];
        for (const p of productsData) {
            const doc = await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
            products.push(doc);
        }

        for (const prod of products) {
            const initialStocks = [
                { wh: warehouses['WH-SBY'], qty: 40 },
                { wh: warehouses['WH-JKT'], qty: 25 },
                { wh: warehouses['WH-SMG'], qty: 10 },
            ];

            for (const st of initialStocks) {
                const existing = await StockBalance.findOne({ product: prod._id, warehouse: st.wh._id });
                if (!existing) {
                    await StockBalance.create({
                        product: prod._id,
                        warehouse: st.wh._id,
                        physicalQty: st.qty,
                        reservedQty: 0,
                        availableQty: st.qty,
                    });
                    await StockLedger.create({
                        product: prod._id,
                        warehouse: st.wh._id,
                        type: 'IN',
                        qtyChange: st.qty,
                        balanceAfter: st.qty,
                        referenceType: 'INITIAL_SEED',
                        referenceNumber: `INIT-${prod.sku}-${st.wh.code}`,
                        notes: 'Stok awal operasional PT NDD',
                    });
                }
            }
        }

        console.log('✅ Seed Batch 1 selesai! 3 Gudang, 2 Pemasok, 5 Produk, dan Saldo Stok siap.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal seed:', err);
        process.exit(1);
    }
}

seedBatch1();