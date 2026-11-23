const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    enabled: {
        type: Boolean,
        default: true,
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        default: 'Networking',
    },
    unit: {
        type: String,
        default: 'Unit',
    },
    costPrice: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    sellingPrice: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    minStock: {
        type: Number,
        default: 5,
    },
    description: {
        type: String,
        trim: true,
    },
    created: {
        type: Date,
        default: Date.now,
    },
    updated: {
        type: Date,
        default: Date.now,
    },
});

schema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Product', schema);