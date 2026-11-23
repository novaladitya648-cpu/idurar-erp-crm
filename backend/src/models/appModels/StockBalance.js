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
    physicalQty: {
        type: Number,
        default: 0,
        min: 0,
    },
    reservedQty: {
        type: Number,
        default: 0,
        min: 0,
    },
    availableQty: {
        type: Number,
        default: 0,
        min: 0,
    },
    updated: {
        type: Date,
        default: Date.now,
    },
});

schema.index({ product: 1, warehouse: 1 }, { unique: true });
schema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('StockBalance', schema);