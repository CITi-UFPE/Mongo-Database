import faker from 'faker';
import { join } from 'path';

import Sale from '../models/Sale';
import { deleteAllAvatars } from './utils';
import { IMAGES_FOLDER_PATH } from './constants';

export const seedDb = async () => {
  console.log('Seeding car sales database...');

  await Sale.deleteMany({});
  await deleteAllAvatars(join(__dirname, '../..', IMAGES_FOLDER_PATH));

  // listas de referência
  const brands = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Volkswagen', 'Hyundai', 'Nissan', 'Jeep', 'BMW', 'Mercedes'];
  const paymentMethods = ['Cartão de Crédito', 'Boleto', 'Transferência Bancária', 'Financiamento', 'Pix'];
  const fuelTypes = ['Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'];
  const transmissions = ['Manual', 'Automática'];
  const conditions = ['Novo', 'Usado'];

  // cria 100 vendas mockadas
  const sales = [...Array(100).keys()].map(() => {
    const brand = faker.random.arrayElement(brands);
    const model = faker.vehicle.model();
    const year = faker.datatype.number({ min: 2005, max: 2025 });
    const price = faker.datatype.number({ min: 40000, max: 300000 });
    const condition = faker.random.arrayElement(conditions);

    return new Sale({
      brand,
      model,
      year,
      color: faker.vehicle.color(),
      price,
      condition,
      fuelType: faker.random.arrayElement(fuelTypes),
      transmission: faker.random.arrayElement(transmissions),
      mileage: condition === 'Novo' ? 0 : faker.datatype.number({ min: 5000, max: 200000 }),
      buyerName: faker.name.findName(),
      buyerEmail: faker.internet.email(),
      sellerName: faker.name.findName(),
      paymentMethod: faker.random.arrayElement(paymentMethods),
      saleDate: faker.date.between('2020-01-01', '2025-11-01'),
      city: faker.address.cityName(),
      state: faker.address.state(),
      createdAt: new Date(),
    });
  });

  await Sale.insertMany(sales);

  console.log('Seeding complete with 100 car sales.');
};
