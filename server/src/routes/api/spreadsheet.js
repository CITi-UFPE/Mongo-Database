import { Router } from 'express';
import mongoose from 'mongoose';

// Import models
import Lead from '../../models/Comercial/Lead';
import Membro from '../../models/Comercial/Membro';
import Vendedor from '../../models/Comercial/Vendedor';
import Empresa from '../../models/Comercial/Empresa';
import Contato from '../../models/Comercial/Contato';
import FaseFunil from '../../models/Comercial/Fase_funil';
import OrigemLead from '../../models/Comercial/Origem_lead';
import Nicho from '../../models/Comercial/Nicho';
import MotivoPerda from '../../models/Comercial/Motivo_perda';

const router = Router();
const SHEET_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const isMongoReady = () => mongoose.connection.readyState === 1 && mongoose.connection.db;

const filterSpreadsheetCollections = (names) => {
  return names.filter((name) => {
    const lowered = name.toLowerCase();
    if (lowered.startsWith('system.')) return false;
    return lowered.includes('sheet');
  });
};

const MODEL_MAPPING = {
  'leads_sheet': {
    model: Lead,
    populate: [
      { path: 'id_fase_atual', select: 'nome_fase' },
      { path: 'id_empresa', select: 'nome_empresa' },
      { path: 'id_membro', select: 'nome' },
      { path: 'id_contato', select: 'nome' },
      { path: 'id_origem_lead', select: 'canal fonte' },
      { path: 'id_motivo_perda', select: 'descricao' }
    ]
  },
  'empresas_sheet': {
    model: Empresa,
    populate: [
      { path: 'id_nicho', select: 'nome_nicho' }
    ]
  },
  'contatos_sheet': {
    model: Contato,
    populate: [
      { path: 'id_empresa', select: 'nome_empresa' }
    ]
  },
  'vendedores_sheet': {
    model: Vendedor,
    populate: [
      { path: 'id_membro', select: 'nome email' }
    ]
  }
};

router.get('/', async (_req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({ message: 'Database connection is not ready.' });
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map((collection) => collection.name);
    const spreadsheets = filterSpreadsheetCollections(names);

    return res.json(spreadsheets);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list spreadsheets.' });
  }
});

router.get('/:sheetName', async (req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({ message: 'Database connection is not ready.' });
    }

    const { sheetName } = req.params;
    if (!SHEET_NAME_PATTERN.test(sheetName)) {
      return res.status(400).json({ message: 'Invalid sheet name.' });
    }

    const collectionNames = await mongoose.connection.db.listCollections({ name: sheetName }).toArray();
    if (collectionNames.length === 0) {
      return res.status(404).json({ message: 'Spreadsheet not found.' });
    }

    let documents;
    if (MODEL_MAPPING[sheetName]) {
      const { model, populate } = MODEL_MAPPING[sheetName];
      let query = model.find({});
      if (populate) {
        populate.forEach(p => {
          query = query.populate(p);
        });
      }
      documents = await query.lean();
    } else {
      documents = await mongoose.connection.db.collection(sheetName).find({}).toArray();
    }

    const formatted = documents.map((doc) => {
      const { _id, ...rest } = doc;
      return { id: _id?.toString?.() ?? undefined, ...rest };
    });

    return res.json(formatted);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to retrieve spreadsheet.' });
  }
});

export default router;
