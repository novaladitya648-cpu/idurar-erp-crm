const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const recordMovement = require('./recordMovement');

const methods = createCRUDController('StockBalance');
methods.recordMovement = recordMovement;

module.exports = methods;