"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _mongoose = _interopRequireDefault(require("mongoose"));
var _authMiddleware = _interopRequireDefault(require("../../middleware/authMiddleware"));
var _Lead = _interopRequireDefault(require("../../models/Comercial/Lead"));
var _Membro = _interopRequireDefault(require("../../models/Comercial/Membro"));
var _Vendedor = _interopRequireDefault(require("../../models/Comercial/Vendedor"));
var _Empresa = _interopRequireDefault(require("../../models/Comercial/Empresa"));
var _Contato = _interopRequireDefault(require("../../models/Comercial/Contato"));
var _Fase_funil = _interopRequireDefault(require("../../models/Comercial/Fase_funil"));
var _Origem_lead = _interopRequireDefault(require("../../models/Comercial/Origem_lead"));
var _Nicho = _interopRequireDefault(require("../../models/Comercial/Nicho"));
var _Motivo_perda = _interopRequireDefault(require("../../models/Comercial/Motivo_perda"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Import middleware

// Import models

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
const MODEL_MAPPING = {
  'leads_sheet': {
    model: _Lead.default,
    populate: [{
      path: 'id_fase_atual',
      select: 'nome_fase'
    }, {
      path: 'id_empresa',
      select: 'nome_empresa'
    }, {
      path: 'id_membro',
      select: 'nome'
    }, {
      path: 'id_contato',
      select: 'nome'
    }, {
      path: 'id_origem_lead',
      select: 'canal fonte'
    }, {
      path: 'id_motivo_perda',
      select: 'descricao'
    }]
  },
  'empresas_sheet': {
    model: _Empresa.default,
    populate: [{
      path: 'id_nicho',
      select: 'nome_nicho'
    }]
  },
  'contatos_sheet': {
    model: _Contato.default,
    populate: [{
      path: 'id_empresa',
      select: 'nome_empresa'
    }]
  },
  'vendedores_sheet': {
    model: _Vendedor.default,
    populate: [{
      path: 'id_membro',
      select: 'nome email'
    }]
  }
};
router.get('/', _authMiddleware.default, async (_req, res) => {
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
router.get('/:sheetName', _authMiddleware.default, async (req, res) => {
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
    let documents;
    if (MODEL_MAPPING[sheetName]) {
      const {
        model,
        populate
      } = MODEL_MAPPING[sheetName];
      let query = model.find({});
      if (populate) {
        populate.forEach(p => {
          query = query.populate(p);
        });
      }
      documents = await query.lean();
    } else {
      documents = await _mongoose.default.connection.db.collection(sheetName).find({}).toArray();
    }
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
    console.error(error);
    return res.status(500).json({
      message: 'Failed to retrieve spreadsheet.'
    });
  }
});
var _default = exports.default = router;