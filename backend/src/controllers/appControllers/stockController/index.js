const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const StockBalance = require('@/models/appModels/StockBalance');
const StockLedger = require('@/models/appModels/StockLedger');
const recordMovement = require('./recordMovement');

const methods = createCRUDController('StockBalance');
methods.recordMovement = recordMovement;

methods.listLedger = async (req, res) => {
    try {
        const { warehouse, product, type, referenceNumber, limit = 100 } = req.query;
        const filter = { removed: false };

        if (warehouse) filter.warehouse = warehouse;
        if (product) filter.product = product;
        if (type) filter.type = String(type).toUpperCase().trim();
        if (referenceNumber) {
            filter.referenceNumber = { $regex: String(referenceNumber).trim(), $options: 'i' };
        }

        const items = await StockLedger.find(filter)
            .sort({ created: -1 })
            .limit(Math.min(Math.max(Number(limit) || 100, 1), 300));

        return res.status(200).json({
            success: true,
            result: items,
            message: 'Berhasil mengambil riwayat mutasi stok.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            result: null,
            message: error.message || 'Gagal mengambil riwayat mutasi stok.',
        });
    }
};

methods.summary = async (req, res) => {
    try {
        const { warehouse, product, lowStockOnly } = req.query;
        const filter = { removed: false };

        if (warehouse) filter.warehouse = warehouse;
        if (product) filter.product = product;

        let balances = await StockBalance.find(filter).sort({ updated: -1 });

        if (String(lowStockOnly).toLowerCase() === 'true') {
            balances = balances.filter((item) => {
                const minStock = Number(item.product?.minStock ?? 0);
                return Number(item.availableQty ?? 0) <= minStock;
            });
        }

        const totalPhysicalQty = balances.reduce((acc, b) => acc + Number(b.physicalQty || 0), 0);
        const totalReservedQty = balances.reduce((acc, b) => acc + Number(b.reservedQty || 0), 0);
        const totalAvailableQty = balances.reduce((acc, b) => acc + Number(b.availableQty || 0), 0);

        return res.status(200).json({
            success: true,
            result: {
                totals: {
                    records: balances.length,
                    physicalQty: totalPhysicalQty,
                    reservedQty: totalReservedQty,
                    availableQty: totalAvailableQty,
                },
                balances,
            },
            message: 'Berhasil mengambil ringkasan saldo stok.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            result: null,
            message: error.message || 'Gagal mengambil ringkasan saldo stok.',
        });
    }
};

module.exports = methods;