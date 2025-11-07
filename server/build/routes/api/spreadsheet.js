"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _mongoose = _interopRequireDefault(require("mongoose"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = (0, _express.Router)();
const SHEET_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const isMongoReady = () => _mongoose.default.connection.readyState === 1 && _mongoose.default.connection.db;
const filterSpreadsheetCollections = names => {
  return names.filter(name => {
    const lowered = name.toLowerCase();
    if (lowered.startsWith('system.')) return false;
    return lowered.includes('sheet');
  });
};
router.get('/', async (_req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({
        message: 'Database connection is not ready.'
      });
    }
    const collections = await _mongoose.default.connection.db.listCollections().toArray();
    const names = collections.map(collection => collection.name);
    const spreadsheets = filterSpreadsheetCollections(names);
    return res.json(spreadsheets);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to list spreadsheets.'
    });
  }
});
router.get('/:sheetName', async (req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({
        message: 'Database connection is not ready.'
      });
    }
    const {
      sheetName
    } = req.params;
    if (!SHEET_NAME_PATTERN.test(sheetName)) {
      return res.status(400).json({
        message: 'Invalid sheet name.'
      });
    }
    const collectionNames = await _mongoose.default.connection.db.listCollections({
      name: sheetName
    }).toArray();
    if (collectionNames.length === 0) {
      return res.status(404).json({
        message: 'Spreadsheet not found.'
      });
    }
    const documents = await _mongoose.default.connection.db.collection(sheetName).find({}).toArray();
    const formatted = documents.map(doc => {
      var _id$toString;
      const {
        _id,
        ...rest
      } = doc;
      return {
        id: (_id === null || _id === void 0 ? void 0 : (_id$toString = _id.toString) === null || _id$toString === void 0 ? void 0 : _id$toString.call(_id)) ?? undefined,
        ...rest
      };
    });
    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to retrieve spreadsheet.'
    });
  }
});
var _default = exports.default = router;
//# sourceMappingURL=spreadsheet.js.map