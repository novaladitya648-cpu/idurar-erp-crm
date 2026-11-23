const mongoose = require('mongoose');
const Product = require('@/models/appModels/Product');
const Warehouse = require('@/models/appModels/Warehouse');
const StockBalance = require('@/models/appModels/StockBalance');
const StockLedger = require('@/models/appModels/StockLedger');

const calcAvailable = (physicalQty, reservedQty) =>
    Math.max(0, Number(physicalQty || 0) - Number(reservedQty || 0));

async function upsertBalanceAndLedger({
    session,
    productId,
    warehouseId,
    type,
    qtyChange,
    balanceAfter,
    referenceType,
    referenceNumber,
    notes,
    adminId,
}) {
    const [ledger] = await StockLedger.create(
        [
            {
                product: productId,
                warehouse: warehouseId,
                type,
                qtyChange: Number(qtyChange),
                balanceAfter: Number(balanceAfter),
                referenceType,
                referenceNumber,
                notes,
                ...(adminId ? { createdBy: adminId } : {}),
            },
        ],
        { session }
    );

    return ledger;
}

async function getOrCreateBalance({ session, productId, warehouseId }) {
    let balance = await StockBalance.findOne({
        product: productId,
        warehouse: warehouseId,
        removed: false,
    }).session(session);

    if (!balance) {
        const [created] = await StockBalance.create(
            [
                {
                    product: productId,
                    warehouse: warehouseId,
                    physicalQty: 0,
                    reservedQty: 0,
                    availableQty: 0,
                },
            ],
            { session }
        );
        balance = created;
    }

    return balance;
}

const recordMovement = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const {
            productId,
            product,
            warehouseId,
            warehouse,
            sourceWarehouseId,
            targetWarehouseId,
            targetWarehouse,
            destinationWarehouseId,
            type,
            qty,
            referenceType,
            referenceNumber,
            notes,
        } = req.body;

        const prodId = productId || product;
        const whId = warehouseId || warehouse || sourceWarehouseId;
        const toWhId = targetWarehouseId || targetWarehouse || destinationWarehouseId;
        const movementType = String(type || '').toUpperCase().trim();
        const numericQty = Number(qty);

        if (!prodId || !whId || !movementType) {
            return res.status(400).json({
                success: false,
                result: null,
                message: 'Field productId, warehouseId, dan type wajib diisi.',
            });
        }

        if (!Number.isFinite(numericQty) || numericQty <= 0) {
            return res.status(400).json({
                success: false,
                result: null,
                message: 'Field qty harus berupa angka lebih besar dari 0.',
            });
        }

        const [prodDoc, whDoc] = await Promise.all([
            Product.findOne({ _id: prodId, removed: false }),
            Warehouse.findOne({ _id: whId, removed: false }),
        ]);

        if (!prodDoc) {
            return res.status(404).json({
                success: false,
                result: null,
                message: 'Produk tidak ditemukan.',
            });
        }

        if (!whDoc) {
            return res.status(404).json({
                success: false,
                result: null,
                message: 'Gudang tidak ditemukan.',
            });
        }

        const adminId = req.admin?._id || null;
        let resultData = null;

        await session.withTransaction(async () => {
            if (movementType === 'IN' || movementType === 'RETURN') {
                const balance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                });

                const nextPhysical = Number(balance.physicalQty || 0) + numericQty;
                const nextAvailable = calcAvailable(nextPhysical, balance.reservedQty);

                balance.physicalQty = nextPhysical;
                balance.availableQty = nextAvailable;
                balance.updated = new Date();
                await balance.save({ session });

                const ledger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                    type: movementType,
                    qtyChange: numericQty,
                    balanceAfter: nextPhysical,
                    referenceType: referenceType || (movementType === 'RETURN' ? 'RETURN_ORDER' : 'GOODS_RECEIPT'),
                    referenceNumber: referenceNumber || `MUT-${Date.now()}`,
                    notes: notes || `Mutasi ${movementType} di ${whDoc.code}`,
                    adminId,
                });

                resultData = { movementType, balance, ledger };
                return;
            }

            if (movementType === 'OUT') {
                const balance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                });

                const nextPhysical = Number(balance.physicalQty || 0) - numericQty;
                const nextAvailable = Number(balance.availableQty || 0) - numericQty;

                if (nextPhysical < 0 || nextAvailable < 0) {
                    const err = new Error(
                        `Stok tidak mencukupi di ${whDoc.code}. Tersedia: ${balance.availableQty}, Fisik: ${balance.physicalQty}, Diminta: ${numericQty}`
                    );
                    err.statusCode = 400;
                    throw err;
                }

                balance.physicalQty = nextPhysical;
                balance.availableQty = calcAvailable(nextPhysical, balance.reservedQty);
                balance.updated = new Date();
                await balance.save({ session });

                const ledger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                    type: 'OUT',
                    qtyChange: -numericQty,
                    balanceAfter: nextPhysical,
                    referenceType: referenceType || 'SALES_ORDER',
                    referenceNumber: referenceNumber || `OUT-${Date.now()}`,
                    notes: notes || `Mutasi OUT dari ${whDoc.code}`,
                    adminId,
                });

                resultData = { movementType, balance, ledger };
                return;
            }

            if (movementType === 'TRANSFER') {
                if (!toWhId) {
                    const err = new Error('Untuk mutasi TRANSFER, targetWarehouseId wajib diisi.');
                    err.statusCode = 400;
                    throw err;
                }

                if (String(toWhId) === String(whId)) {
                    const err = new Error('Gudang tujuan transfer harus berbeda dari gudang asal.');
                    err.statusCode = 400;
                    throw err;
                }

                const toWhDoc = await Warehouse.findOne({ _id: toWhId, removed: false }).session(session);
                if (!toWhDoc) {
                    const err = new Error('Gudang tujuan transfer tidak ditemukan.');
                    err.statusCode = 404;
                    throw err;
                }

                const sourceBalance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                });

                const nextSourcePhysical = Number(sourceBalance.physicalQty || 0) - numericQty;
                const nextSourceAvailable = Number(sourceBalance.availableQty || 0) - numericQty;

                if (nextSourcePhysical < 0 || nextSourceAvailable < 0) {
                    const err = new Error(
                        `Stok di gudang asal (${whDoc.code}) tidak mencukupi untuk transfer. Tersedia: ${sourceBalance.availableQty}, Diminta: ${numericQty}`
                    );
                    err.statusCode = 400;
                    throw err;
                }

                const destBalance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: toWhId,
                });

                const nextDestPhysical = Number(destBalance.physicalQty || 0) + numericQty;
                const nextDestAvailable = calcAvailable(nextDestPhysical, destBalance.reservedQty);

                sourceBalance.physicalQty = nextSourcePhysical;
                sourceBalance.availableQty = calcAvailable(nextSourcePhysical, sourceBalance.reservedQty);
                sourceBalance.updated = new Date();
                await sourceBalance.save({ session });

                destBalance.physicalQty = nextDestPhysical;
                destBalance.availableQty = nextDestAvailable;
                destBalance.updated = new Date();
                await destBalance.save({ session });

                const refNum = referenceNumber || `TRF-${Date.now()}`;

                const outLedger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                    type: 'TRANSFER_OUT',
                    qtyChange: -numericQty,
                    balanceAfter: nextSourcePhysical,
                    referenceType: referenceType || 'STOCK_TRANSFER',
                    referenceNumber: refNum,
                    notes: notes || `Transfer dari ${whDoc.code} ke ${toWhDoc.code}`,
                    adminId,
                });

                const inLedger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: toWhId,
                    type: 'TRANSFER_IN',
                    qtyChange: numericQty,
                    balanceAfter: nextDestPhysical,
                    referenceType: referenceType || 'STOCK_TRANSFER',
                    referenceNumber: refNum,
                    notes: notes || `Terima transfer dari ${whDoc.code} ke ${toWhDoc.code}`,
                    adminId,
                });

                resultData = {
                    movementType,
                    referenceNumber: refNum,
                    source: { balance: sourceBalance, ledger: outLedger },
                    destination: { balance: destBalance, ledger: inLedger },
                };
                return;
            }

            if (movementType === 'ADJUSTMENT') {
                // qty diperlakukan sebagai target saldo fisik baru hasil stok opname
                const balance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                });

                const previousPhysical = Number(balance.physicalQty || 0);
                const diffQty = numericQty - previousPhysical;
                const nextAvailable = calcAvailable(numericQty, balance.reservedQty);

                balance.physicalQty = numericQty;
                balance.availableQty = nextAvailable;
                balance.updated = new Date();
                await balance.save({ session });

                const ledger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                    type: 'ADJUSTMENT',
                    qtyChange: diffQty,
                    balanceAfter: numericQty,
                    referenceType: referenceType || 'STOCK_OPNAME',
                    referenceNumber: referenceNumber || `ADJ-${Date.now()}`,
                    notes: notes || `Penyesuaian stok fisik di ${whDoc.code} menjadi ${numericQty}`,
                    adminId,
                });

                resultData = {
                    movementType,
                    previousPhysicalQty: previousPhysical,
                    targetPhysicalQty: numericQty,
                    diffQty,
                    balance,
                    ledger,
                };
                return;
            }

            if (movementType === 'RESERVE') {
                const balance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                });

                if (Number(balance.availableQty || 0) < numericQty) {
                    const err = new Error(
                        `Stok tersedia di ${whDoc.code} tidak cukup untuk di-reserve. Tersedia: ${balance.availableQty}`
                    );
                    err.statusCode = 400;
                    throw err;
                }

                const nextReserved = Number(balance.reservedQty || 0) + numericQty;
                balance.reservedQty = nextReserved;
                balance.availableQty = calcAvailable(balance.physicalQty, nextReserved);
                balance.updated = new Date();
                await balance.save({ session });

                const ledger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                    type: 'RESERVE',
                    qtyChange: -numericQty,
                    balanceAfter: Number(balance.physicalQty || 0),
                    referenceType: referenceType || 'SALES_RESERVATION',
                    referenceNumber: referenceNumber || `RSV-${Date.now()}`,
                    notes: notes || `Reservasi stok ${numericQty} di ${whDoc.code}`,
                    adminId,
                });

                resultData = { movementType, balance, ledger };
                return;
            }

            if (movementType === 'RELEASE') {
                const balance = await getOrCreateBalance({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                });

                if (Number(balance.reservedQty || 0) < numericQty) {
                    const err = new Error(
                        `Qty reserved di ${whDoc.code} (${balance.reservedQty}) lebih kecil dari qty release (${numericQty}).`
                    );
                    err.statusCode = 400;
                    throw err;
                }

                const nextReserved = Number(balance.reservedQty || 0) - numericQty;
                balance.reservedQty = nextReserved;
                balance.availableQty = calcAvailable(balance.physicalQty, nextReserved);
                balance.updated = new Date();
                await balance.save({ session });

                const ledger = await upsertBalanceAndLedger({
                    session,
                    productId: prodId,
                    warehouseId: whId,
                    type: 'RELEASE',
                    qtyChange: numericQty,
                    balanceAfter: Number(balance.physicalQty || 0),
                    referenceType: referenceType || 'RELEASE_RESERVATION',
                    referenceNumber: referenceNumber || `RLS-${Date.now()}`,
                    notes: notes || `Pelepasan reservasi stok ${numericQty} di ${whDoc.code}`,
                    adminId,
                });

                resultData = { movementType, balance, ledger };
                return;
            }

            const err = new Error(
                `Tipe mutasi '${movementType}' tidak didukung. Gunakan IN, OUT, TRANSFER, ADJUSTMENT, RESERVE, RELEASE, atau RETURN.`
            );
            err.statusCode = 400;
            throw err;
        });

        return res.status(200).json({
            success: true,
            result: resultData,
            message: `Mutasi stok (${movementType}) berhasil dicatat.`,
        });
    } catch (error) {
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            result: null,
            message: error.message || 'Terjadi kesalahan saat memproses mutasi stok.',
        });
    } finally {
        await session.endSession();
    }
};

module.exports = recordMovement;