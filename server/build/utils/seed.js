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
// Função auxiliar para escolher com pesos
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = _faker.default.datatype.number({
    min: 0,
    max: totalWeight - 1
  });
  for (const item of items) {
    if (random < item.weight) {
      return item.value;
    }
    random -= item.weight;
  }
  return items[items.length - 1].value; // fallback
}
const CURRENT_YEAR = new Date().getFullYear();
const seedDb = async () => {
  console.log('Seeding car sales database...');
  await _Sale.default.deleteMany({});
  await (0, _utils.deleteAllAvatars)((0, _path.join)(__dirname, '../..', _constants.IMAGES_FOLDER_PATH));

  // Distribuições com pesos (mais realistas)
  const brands = [{
    value: 'Toyota',
    weight: 15
  }, {
    value: 'Volkswagen',
    weight: 14
  }, {
    value: 'Chevrolet',
    weight: 13
  }, {
    value: 'Ford',
    weight: 12
  }, {
    value: 'Honda',
    weight: 10
  }, {
    value: 'Hyundai',
    weight: 9
  }, {
    value: 'Nissan',
    weight: 7
  }, {
    value: 'Jeep',
    weight: 5
  }, {
    value: 'BMW',
    weight: 3
  }, {
    value: 'Mercedes',
    weight: 2
  }];
  const paymentMethods = [{
    value: 'Financiamento',
    weight: 35
  }, {
    value: 'Pix',
    weight: 25
  }, {
    value: 'Cartão de Crédito',
    weight: 20
  }, {
    value: 'Transferência Bancária',
    weight: 15
  }, {
    value: 'Boleto',
    weight: 5
  }];
  const fuelTypes = [{
    value: 'Gasolina',
    weight: 45
  }, {
    value: 'Etanol',
    weight: 20
  }, {
    value: 'Híbrido',
    weight: 15
  }, {
    value: 'Elétrico',
    weight: 10
  }, {
    value: 'Diesel',
    weight: 10
  }];
  const transmissions = [{
    value: 'Automática',
    weight: 70
  }, {
    value: 'Manual',
    weight: 30
  }];
  const conditions = [{
    value: 'Usado',
    weight: 70
  }, {
    value: 'Novo',
    weight: 30
  }];
  const sales = [...Array(2000).keys()].map(() => {
    const condition = weightedRandom(conditions);
    let year;
    if (condition === 'Novo') {
      year = _faker.default.datatype.number({
        min: CURRENT_YEAR - 1,
        max: CURRENT_YEAR
      });
    } else {
      year = _faker.default.datatype.number({
        min: 2005,
        max: CURRENT_YEAR - 1
      });
    }
    const brand = weightedRandom(brands);
    const model = _faker.default.vehicle.model();
    const fuelType = weightedRandom(fuelTypes);
    const transmission = weightedRandom(transmissions);
    const paymentMethod = weightedRandom(paymentMethods);

    // Ajuste básico de preço com base em marca e ano
    let basePrice;
    if (['BMW', 'Mercedes'].includes(brand)) {
      basePrice = _faker.default.datatype.number({
        min: 180000,
        max: 500000
      });
    } else if (['Toyota', 'Honda', 'Volkswagen'].includes(brand)) {
      basePrice = _faker.default.datatype.number({
        min: 80000,
        max: 300000
      });
    } else {
      basePrice = _faker.default.datatype.number({
        min: 60000,
        max: 250000
      });
    }

    // Desvalorização simples para usados
    const price = condition === 'Novo' ? basePrice : basePrice * (0.5 + 0.45 * ((year - 2005) / (CURRENT_YEAR - 2005)));
    const mileage = condition === 'Novo' ? 0 : _faker.default.datatype.number({
      min: 5000,
      max: 200000
    });

    // Carros elétricos/híbridos tendem a ser mais recentes (< 2018 raro)
    if (['Elétrico', 'Híbrido'].includes(fuelType) && year < 2018) {
      // ajusta ano mínimo se for elétrico/híbrido antigo (raro)
      year = _faker.default.datatype.number({
        min: 2018,
        max: CURRENT_YEAR
      });
    }
    return new _Sale.default({
      brand,
      model,
      year,
      color: _faker.default.vehicle.color(),
      price: Math.round(price / 100) * 100,
      // arredonda para valor mais realista
      condition,
      fuelType,
      transmission,
      mileage,
      buyerName: _faker.default.name.findName(),
      buyerEmail: _faker.default.internet.email(),
      sellerName: _faker.default.name.findName(),
      paymentMethod,
      saleDate: _faker.default.date.between('2020-01-01', '2025-11-01'),
      city: _faker.default.address.cityName(),
      state: _faker.default.address.state()
    });
  });
  await _Sale.default.insertMany(sales);
  console.log('Seeding complete with 2000 car sales.');
};
exports.seedDb = seedDb;