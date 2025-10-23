"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.seedDb = void 0;
var _faker = _interopRequireDefault(require("faker"));
var _path = require("path");
var _User = _interopRequireDefault(require("../models/User"));
var _Message = _interopRequireDefault(require("../models/Message"));
var _utils = require("./utils");
var _constants = require("./constants");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const seedDb = async () => {
  console.log('Seeding database...');
  await _User.default.deleteMany({});
  await _Message.default.deleteMany({});
  await (0, _utils.deleteAllAvatars)((0, _path.join)(__dirname, '../..', _constants.IMAGES_FOLDER_PATH));

  // create 3 users
  const usersPromises = [...Array(3).keys()].map(index => {
    const user = new _User.default({
      provider: 'email',
      username: `user${index}`,
      email: `email${index}@email.com`,
      password: '123456789',
      name: _faker.default.name.findName(),
      avatar: `avatar${index}.jpg`,
      bio: _faker.default.lorem.sentences(3)
    });
    if (index === 0) {
      user.role = 'ADMIN';
    }
    return user; // apenas retorna o objeto User
  });

  // save users to the database
  const users = await Promise.all(usersPromises.map(u => u.save()));

  // create some messages and associate with users
  const messages = [...Array(10).keys()].map(i => {
    return new _Message.default({
      text: _faker.default.lorem.sentence(),
      user: users[i % users.length]._id,
      createdAt: new Date()
    });
  });
  await _Message.default.insertMany(messages);
  console.log('Seeding complete.');
};
exports.seedDb = seedDb;
//# sourceMappingURL=seed.js.map