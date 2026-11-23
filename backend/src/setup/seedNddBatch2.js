const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const candidateEnvPaths = [
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(process.cwd(), 'backend', '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
];

for (const envPath of candidateEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

const Product = require('../models/appModels/Product');
const Warehouse = require('../models/appModels/Warehouse');
const StockBalance = require('../models/appModels/StockBalance');
const StockLedger = require('../models/appModels/StockLedger');

const calcAvailable = (physicalQty, reservedQty) =>
    Math.max(0, Number(physicalQty || 0) - Number(reservedQty || 0));

async function upsertLedgerOnce(payload) {
    const existing = await StockLedger.findOne({
        referenceNumber: payload.referenceNumber,
        type: payload.type,
        warehouse: payload.warehouse,
    });
    if (existing) return existing;
    return StockLedger.create(payload);
}

async function applyDemoMovement({
    product,
    warehouse,
    type,
    signedQty,
    referenceType,
    referenceNumber,
    notes,
}) {
    const existingLedger = await StockLedger.findOne({
        referenceNumber,
        type,
        warehouse: warehouse._id,
    });
    if (existingLedger) {
        return existingLedger;
    }

    let balance = await StockBalance.findOne({
        product: product._id,
        warehouse: warehouse._id,
        removed: false,
    });

    if (!balance) {
        balance = await StockBalance.create({
            product: product._id,
            warehouse: warehouse._id,
            physicalQty: 0,
            reservedQty: 0,
            availableQty: 0,
        });
    }

    const nextPhysical = Number(balance.physicalQty || 0) + Number(signedQty);
    if (nextPhysical < 0) {
        throw new Error(
            `Stok tidak cukup pada ${warehouse.code} untuk ${product.sku} (saldo ${balance.physicalQty}, butuh ${Math.abs(signedQty)})`
        );
    }

    balance.physicalQty = nextPhysical;
    balance.availableQty = calcAvailable(nextPhysical, balance.reservedQty);
    balance.updated = new Date();
    await balance.save();

    return upsertLedgerOnce({
        product: product._id,
        warehouse: warehouse._id,
        type,
        qtyChange: Number(signedQty),
        balanceAfter: nextPhysical,
        referenceType,
        referenceNumber,
        notes,
    });
}

async function seedBatch2() {
    try {
        console.log('Memulai seed Batch 2 PT NDD...');
        const dbUri = process.env.DATABASE || process.env.MONGODB_URI || process.env.MONGO_URL;
        if (!dbUri) {
            throw new Error('URI database tidak ditemukan di .env (cek variabel DATABASE / MONGODB_URI).');
        }

        await mongoose.connect(dbUri);

        const [sby, jkt, smg] = await Promise.all([
            Warehouse.findOne({ code: 'WH-SBY', removed: false }),
            Warehouse.findOne({ code: 'WH-JKT', removed: false }),
            Warehouse.findOne({ code: 'WH-SMG', removed: false }),
        ]);

        if (!sby || !jkt || !smg) {
            throw new Error('Data 3 gudang (WH-SBY, WH-JKT, WH-SMG) belum ada. Jalankan seedNddBatch1.js dulu.');
        }

        const products = await Product.find({ removed: false });
        if (!products.length) {
            throw new Error('Data produk belum ada. Jalankan seedNddBatch1.js dulu.');
        }

        const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

        if (bySku['NET-MTK-RB4011']) {
            await applyDemoMovement({
                product: bySku['NET-MTK-RB4011'],
                warehouse: sby,
                type: 'IN',
                signedQty: 15,
                referenceType: 'GOODS_RECEIPT',
                referenceNumber: 'B2-GR-SBY-001',
                notes: 'Restok MikroTik RB4011 batch 2 di Gudang Surabaya',
            });
        }

        if (bySku['NET-UBQ-U6PRO']) {
            await applyDemoMovement({
                product: bySku['NET-UBQ-U6PRO'],
                warehouse: jkt,
                type: 'OUT',
                signedQty: -5,
                referenceType: 'SALES_ORDER',
                referenceNumber: 'B2-SO-JKT-001',
                notes: 'Pengiriman UniFi U6 Pro ke klien B2B area Jakarta',
            });
        }

        if (bySku['NET-CSC-CBS250']) {
            const refTrf = 'B2-TRF-SBY-SMG-001';
            await applyDemoMovement({
                product: bySku['NET-CSC-CBS250'],
                warehouse: sby,
                type: 'TRANSFER_OUT',
                signedQty: -4,
                referenceType: 'STOCK_TRANSFER',
                referenceNumber: refTrf,
                notes: 'Transfer 4 unit Cisco CBS250 dari Surabaya ke Semarang',
            });
            await applyDemoMovement({
                product: bySku['NET-CSC-CBS250'],
                warehouse: smg,
                type: 'TRANSFER_IN',
                signedQty: 4,
                referenceType: 'STOCK_TRANSFER',
                referenceNumber: refTrf,
                notes: 'Penerimaan transfer 4 unit Cisco CBS250 dari Surabaya',
            });
        }

        if (bySku['NET-TPL-ER605']) {
            const balSmg = await StockBalance.findOne({
                product: bySku['NET-TPL-ER605']._id,
                warehouse: smg._id,
                removed: false,
            });
            const currentQty = Number(balSmg?.physicalQty || 0);
            const targetQty = currentQty + 2;
            const diff = targetQty - currentQty;

            await applyDemoMovement({
                product: bySku['NET-TPL-ER605'],
                warehouse: smg,
                type: 'ADJUSTMENT',
                signedQty: diff,
                referenceType: 'STOCK_OPNAME',
                referenceNumber: 'B2-ADJ-SMG-001',
                notes: `Opname stok ER605 di Semarang (saldo ${currentQty} -> ${targetQty})`,
            });
        }

        console.log('✅ Seed Batch 2 selesai! Riwayat mutasi IN, OUT, TRANSFER, dan ADJUSTMENT siap.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal seed Batch 2:', err.message || err);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedBatch2();