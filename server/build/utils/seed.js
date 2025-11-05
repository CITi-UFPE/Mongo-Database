"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.seedDb = void 0;
var _faker = _interopRequireDefault(require("faker"));
var _path = require("path");
var _Sale = _interopRequireDefault(require("../models/Sale"));
var _utils = require("./utils");
var _constants = require("./constants");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const seedDb = async () => {
  console.log('Seeding car sales database...');
  await _Sale.default.deleteMany({});
  await (0, _utils.deleteAllAvatars)((0, _path.join)(__dirname, '../..', _constants.IMAGES_FOLDER_PATH));

  // listas de referência
  const brands = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Volkswagen', 'Hyundai', 'Nissan', 'Jeep', 'BMW', 'Mercedes'];
  const paymentMethods = ['Cartão de Crédito', 'Boleto', 'Transferência Bancária', 'Financiamento', 'Pix'];
  const fuelTypes = ['Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'];
  const transmissions = ['Manual', 'Automática'];
  const conditions = ['Novo', 'Usado'];

  // cria 100 vendas mockadas
  const sales = [...Array(100).keys()].map(() => {
    const brand = _faker.default.random.arrayElement(brands);
    const model = _faker.default.vehicle.model();
    const year = _faker.default.datatype.number({
      min: 2005,
      max: 2025
    });
    const price = _faker.default.datatype.number({
      min: 40000,
      max: 300000
    });
    const condition = _faker.default.random.arrayElement(conditions);
    return new _Sale.default({
      brand,
      model,
      year,
      color: _faker.default.vehicle.color(),
      price,
      condition,
      fuelType: _faker.default.random.arrayElement(fuelTypes),
      transmission: _faker.default.random.arrayElement(transmissions),
      mileage: condition === 'Novo' ? 0 : _faker.default.datatype.number({
        min: 5000,
        max: 200000
      }),
      buyerName: _faker.default.name.findName(),
      buyerEmail: _faker.default.internet.email(),
      sellerName: _faker.default.name.findName(),
      paymentMethod: _faker.default.random.arrayElement(paymentMethods),
      saleDate: _faker.default.date.between('2020-01-01', '2025-11-01'),
      city: _faker.default.address.cityName(),
      state: _faker.default.address.state(),
      createdAt: new Date()
    });
  });
  await _Sale.default.insertMany(sales);
  console.log('Seeding complete with 100 car sales.');
};
exports.seedDb = seedDb;