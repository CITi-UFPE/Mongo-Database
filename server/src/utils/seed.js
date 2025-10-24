import faker from 'faker';
import { join } from 'path';

import User from '../models/User';
import Message from '../models/Message';
import { deleteAllAvatars } from './utils';
import { IMAGES_FOLDER_PATH } from './constants';

export const seedDb = async () => {
  console.log('Seeding database...');

  await User.deleteMany({});
  await Message.deleteMany({});
  await deleteAllAvatars(join(__dirname, '../..', IMAGES_FOLDER_PATH));

    // create 3 users
    const usersPromises = [...Array(3).keys()].map((index) => {
      const user = new User({
        provider: 'email',
        username: `user${index}`,
        email: `email${index}@email.com`,
        password: '123456789',
        name: faker.name.findName(),
        avatar: `avatar${index}.jpg`,
        bio: faker.lorem.sentences(3),
      });
  
      if (index === 0) {
        user.role = 'ADMIN';
      }
  
      return user; // apenas retorna o objeto User
      
    });
  
    // save users to the database
    const users = await Promise.all(usersPromises.map((u) => u.save()));
  
    // create some messages and associate with users
    const messages = [...Array(10).keys()].map((i) => {
      return new Message({
        text: faker.lorem.sentence(),
        user: users[i % users.length]._id,
        createdAt: new Date(),
      });
    });
  
    await Message.insertMany(messages);
  
    console.log('Seeding complete.');
  };
