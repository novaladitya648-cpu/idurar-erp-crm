const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true,
        autopopulate: true,
    },
    warehouse: {
        type: mongoose.Schema.ObjectId,
        ref: 'Warehouse',
        required: true,
        autopopulate: true,
    },
    type: {
        type: String,
        enum: ['IN', 'OUT', 'ADJUSTMENT', 'RESERVE', 'RELEASE', 'TRANSFER_OUT', 'TRANSFER_IN', 'RETURN'],
        required: true,
    },
    qtyChange: {
        type: Number,
        required: true,
    },
    balanceAfter: {
        type: Number,
        required: true,
        min: 0,
    },
    referenceType: {
        type: String,
        default: 'MANUAL',
    },
    referenceNumber: {
        type: String,
        trim: true,
    },
    notes: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'Admin',
    },
    created: {
        type: Date,
        default: Date.now,
    },
});

schema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('StockLedger', schema);