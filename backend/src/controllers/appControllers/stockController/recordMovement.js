const mongoose = require('mongoose');
const StockBalance = mongoose.model('StockBalance');
const StockLedger = mongoose.model('StockLedger');

const recordMovement = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product, warehouse, type, qty, referenceType, referenceNumber, notes } = req.body;

        if (!product || !warehouse || !type || !qty || Number(qty) === 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Product, warehouse, type, dan qty wajib diisi (qty tidak boleh 0).',
            });
        }

        const numQty = Number(qty);
        let qtyChange = numQty;
        if (['OUT', 'TRANSFER_OUT'].includes(type)) {
            qtyChange = -Math.abs(numQty);
        } else if (['IN', 'TRANSFER_IN', 'RETURN'].includes(type)) {
            qtyChange = Math.abs(numQty);
        }

        let balance = await StockBalance.findOne({ product, warehouse }).session(session);
        if (!balance) {
            balance = new StockBalance({
                product,
                warehouse,
                physicalQty: 0,
                reservedQty: 0,
                availableQty: 0,
            });
        }

        const newPhysical = balance.physicalQty + qtyChange;
        const newAvailable = newPhysical - balance.reservedQty;

        if (newPhysical < 0 || newAvailable < 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Stok tidak mencukupi! Stok fisik saat ini: ${balance.physicalQty}, tereservasi: ${balance.reservedQty}.`,
            });
        }

        balance.physicalQty = newPhysical;
        balance.availableQty = newAvailable;
        balance.updated = new Date();
        await balance.save({ session });

        const ledger = await StockLedger.create(
            [
                {
                    product,
                    warehouse,
                    type,
                    qtyChange,
                    balanceAfter: newPhysical,
                    referenceType: referenceType || 'MANUAL',
                    referenceNumber: referenceNumber || `STK-${Date.now()}`,
                    notes,
                    createdBy: req.admin ? req.admin._id : undefined,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        return res.status(200).json({
            success: true,
            result: { balance, ledger: ledger[0] },
            message: 'Mutasi stok berhasil dicatat ke Stock Ledger.',
        });
    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({
            success: false,
            message: error.message || 'Gagal mencatat mutasi stok.',
        });
    } finally {
        session.endSession();
    }
};

module.exports = recordMovement;