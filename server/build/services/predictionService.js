"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.performPrediction = void 0;
var _mongoose = _interopRequireDefault(require("mongoose"));
var _Lead = _interopRequireDefault(require("../models/Comercial/Lead.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
console.log('Prediction Service Loaded');

/**
 * Performs Logistic Regression to predict win probability.
 * @param {number} [year] - Optional year to filter the results.
 * @returns {Promise<Object>} - Predictions, feature weights, and summary.
 */
/**
 * Simple implementation of SMOTE (Synthetic Minority Over-sampling Technique)
 * to balance the dataset.
 */
const applySMOTE = (data, labels) => {
  const minorityClass = 1; // Assuming 'Won' (1) is usually the minority
  const majorityClass = 0;
  const minorityData = data.filter((_, i) => labels[i] === minorityClass);
  const majorityData = data.filter((_, i) => labels[i] === majorityClass);

  // If already balanced or minority is actually majority, do nothing (simplified)
  if (minorityData.length >= majorityData.length) return {
    data,
    labels
  };
  const syntheticData = [];
  const syntheticLabels = [];
  const k = 5; // k-nearest neighbors

  const targetCount = majorityData.length - minorityData.length;
  for (let i = 0; i < targetCount; i++) {
    // 1. Select a random sample from minority class
    const idx = Math.floor(Math.random() * minorityData.length);
    const sample = minorityData[idx];

    // 2. Find k nearest neighbors in minority class
    // Simple Euclidean distance
    const neighbors = minorityData.map(other => ({
      item: other,
      dist: Math.sqrt(sample.reduce((sum, val, d) => sum + Math.pow(val - other[d], 2), 0))
    })).sort((a, b) => a.dist - b.dist).slice(1, k + 1) // Exclude self (dist=0)
    .map(n => n.item);
    if (neighbors.length === 0) continue; // Should not happen if > 1 sample

    // 3. Select a random neighbor
    const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];

    // 4. Create synthetic sample
    const synthetic = sample.map((val, d) => val + Math.random() * (neighbor[d] - val));
    syntheticData.push(synthetic);
    syntheticLabels.push(minorityClass);
  }
  return {
    data: [...data, ...syntheticData],
    labels: [...labels, ...syntheticLabels]
  };
};
const performPrediction = async year => {
  console.log(`Starting prediction analysis${year ? ` for year ${year}` : ''}...`);

  // ... (Fetch Data and Preprocessing remain the same) ...
  // (I will rely on the existing code for lines 14-113)

  // ... inside performPrediction, after filling trainingData ...

  // 1. Fetch Data
  // We need ALL leads to build the full feature set (to ensure one-hot encoding is consistent)
  const leads = await _Lead.default.find({}).populate({
    path: 'id_empresa',
    populate: {
      path: 'id_nicho'
    }
  }).populate('id_origem_lead').populate('id_fase_atual').populate('id_contato') // Populate contact for names
  .lean();

  // Calculate available years from data
  const yearsSet = new Set();
  leads.forEach(l => {
    const date = l.data_ganho || l.data_perda || l.createdAt;
    if (date) yearsSet.add(new Date(date).getFullYear());
  });
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  // 2. Preprocessing & Feature Engineering

  // Identify Categorical Values
  const allNichos = [...new Set(leads.map(l => {
    var _l$id_empresa, _l$id_empresa$id_nich;
    return (_l$id_empresa = l.id_empresa) === null || _l$id_empresa === void 0 ? void 0 : (_l$id_empresa$id_nich = _l$id_empresa.id_nicho) === null || _l$id_empresa$id_nich === void 0 ? void 0 : _l$id_empresa$id_nich.nome_nicho;
  }).filter(Boolean))].sort();
  const allOrigens = [...new Set(leads.map(l => {
    var _l$id_origem_lead;
    return (_l$id_origem_lead = l.id_origem_lead) === null || _l$id_origem_lead === void 0 ? void 0 : _l$id_origem_lead.canal;
  }).filter(Boolean))].sort();

  // Calculate Mean Value for Imputation (to avoid 0-value leads getting 100% prob)
  const validValues = leads.map(l => l.valor_estimado).filter(v => v > 0);
  const meanValue = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 1000; // Default fallback

  // Helper to normalize
  const values = leads.map(l => Math.log1p(l.valor_estimado || meanValue));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const normalizeVal = v => maxVal - minVal === 0 ? 0 : (Math.log1p(v) - minVal) / (maxVal - minVal);
  const phases = leads.map(l => {
    var _l$id_fase_atual;
    return ((_l$id_fase_atual = l.id_fase_atual) === null || _l$id_fase_atual === void 0 ? void 0 : _l$id_fase_atual.ordem) || 0;
  });
  const minPhase = Math.min(...phases);
  const maxPhase = Math.max(...phases);
  const normalizePhase = p => maxPhase - minPhase === 0 ? 0 : (p - minPhase) / (maxPhase - minPhase);

  // New: Stale Lead Detection (Binary)
  // Instead of continuous time (which boosts new leads), we only penalize very old ones.
  const now = new Date();
  const STALE_THRESHOLD_DAYS = 150; // 5 months

  const isStale = lead => {
    const created = new Date(lead.createdAt);
    const closed = lead.data_ganho || lead.data_perda;
    const end = closed ? new Date(closed) : now;
    const days = (end - created) / (1000 * 60 * 60 * 24);
    return days > STALE_THRESHOLD_DAYS ? 1 : 0;
  };

  // Prepare Data Arrays
  const trainingData = [];
  const trainingLabels = [];
  const predictionData = [];
  const predictionLeads = [];

  // Feature Names for interpretation
  const featureNames = ['LogValue', 'Phase', 'IsStale'];
  allNichos.forEach(n => featureNames.push(`Niche_${n}`));
  allOrigens.forEach(o => featureNames.push(`Origin_${o}`));
  leads.forEach(lead => {
    var _lead$id_fase_atual, _lead$id_empresa, _lead$id_empresa$id_n, _lead$id_origem_lead;
    // Build Feature Vector
    const val = lead.valor_estimado || meanValue;
    const features = [normalizeVal(val), normalizePhase(((_lead$id_fase_atual = lead.id_fase_atual) === null || _lead$id_fase_atual === void 0 ? void 0 : _lead$id_fase_atual.ordem) || 0), isStale(lead)];

    // One-Hot Encode Niche
    const leadNiche = (_lead$id_empresa = lead.id_empresa) === null || _lead$id_empresa === void 0 ? void 0 : (_lead$id_empresa$id_n = _lead$id_empresa.id_nicho) === null || _lead$id_empresa$id_n === void 0 ? void 0 : _lead$id_empresa$id_n.nome_nicho;
    allNichos.forEach(n => features.push(n === leadNiche ? 1 : 0));

    // One-Hot Encode Origin
    const leadOrigin = (_lead$id_origem_lead = lead.id_origem_lead) === null || _lead$id_origem_lead === void 0 ? void 0 : _lead$id_origem_lead.canal;
    allOrigens.forEach(o => features.push(o === leadOrigin ? 1 : 0));

    // Split into Train/Predict
    // We TRAIN on all historical data to get the best model
    if (lead.status === 'Ganho') {
      trainingData.push(features);
      trainingLabels.push(1);
    } else if (lead.status === 'Perdido') {
      trainingData.push(features);
      trainingLabels.push(0);
    }

    // We PREDICT for Open leads (and we'll filter later for display)
    if (lead.status === 'Aberto') {
      predictionData.push(features);
      predictionLeads.push(lead);
    }
  });
  if (trainingData.length < 10) {
    throw new Error('Not enough historical data (Won/Lost) to train model. Need at least 10 records.');
  }

  // 3. Train Model
  // Dynamic import for ESM
  const {
    Matrix
  } = await eval('import("ml-matrix")');
  // ml-logistic-regression exports the class directly as module.exports
  const LogisticRegressionModule = await eval('import("ml-logistic-regression")');
  const LogisticRegression = LogisticRegressionModule.default || LogisticRegressionModule;
  let finalTrainingData = trainingData;
  let finalTrainingLabels = trainingLabels;

  // Apply SMOTE if dataset is small (< 2000) to improve balance
  if (trainingData.length < 2000) {
    console.log(`Dataset size (${trainingData.length}) < 2000. Applying SMOTE...`);
    const balanced = applySMOTE(trainingData, trainingLabels);
    finalTrainingData = balanced.data;
    finalTrainingLabels = balanced.labels;
    console.log(`SMOTE applied. New dataset size: ${finalTrainingData.length}`);
  }
  const X = new Matrix(finalTrainingData);
  const Y = Matrix.columnVector(finalTrainingLabels);
  const logreg = new LogisticRegression({
    numSteps: 2000,
    learningRate: 1e-2
  }); // Optimized hyperparameters
  logreg.train(X, Y);
  console.log('Model trained.');

  // 4. Predict
  const predictions = [];
  if (predictionData.length > 0) {
    // We use the classifier for Class 1 (Won) to get the probability of winning
    // The library creates a classifier per class (One-vs-Rest)
    const wonClassifier = logreg.classifiers[1];
    const weights = wonClassifier.weights;
    console.log('--- Model Weights ---');
    featureNames.forEach((name, idx) => {
      console.log(`${name}: ${weights.get(0, idx)}`);
    });
    console.log('---------------------');
    predictionLeads.forEach((lead, idx) => {
      var _lead$id_contato, _lead$id_contato2, _lead$id_empresa2;
      const features = predictionData[idx];
      // Manual calculation of probability using the weights for the "Won" class
      let z = 0;
      let debugStr = `Lead: ${((_lead$id_contato = lead.id_contato) === null || _lead$id_contato === void 0 ? void 0 : _lead$id_contato.nome) || 'Unknown'} | `;
      for (let i = 0; i < features.length; i++) {
        z += features[i] * weights.get(0, i);
        if (Math.abs(features[i] * weights.get(0, i)) > 0.5) {
          debugStr += `${featureNames[i]}(${features[i].toFixed(2)})*${weights.get(0, i).toFixed(2)} = ${(features[i] * weights.get(0, i)).toFixed(2)} | `;
        }
      }
      const prob = 1 / (1 + Math.exp(-z));
      if (prob > 0.9 || lead.valor_estimado === 0) {
        console.log(`[DEBUG] ${debugStr} => z=${z.toFixed(2)} prob=${prob.toFixed(4)}`);
      }
      predictions.push({
        id: lead._id,
        leadName: ((_lead$id_contato2 = lead.id_contato) === null || _lead$id_contato2 === void 0 ? void 0 : _lead$id_contato2.nome) || 'Unknown',
        companyName: ((_lead$id_empresa2 = lead.id_empresa) === null || _lead$id_empresa2 === void 0 ? void 0 : _lead$id_empresa2.nome_empresa) || 'Unknown',
        value: lead.valor_estimado,
        probability: parseFloat((prob * 100).toFixed(1)),
        factors: [],
        createdAt: lead.createdAt
      });
    });
  }

  // 5. Extract Feature Importance
  // Use the same weights from the "Won" classifier
  const wonClassifier = logreg.classifiers[1];
  const weights = wonClassifier.weights;
  const featureWeights = featureNames.map((name, idx) => ({
    name,
    weight: parseFloat(weights.get(0, idx).toFixed(4))
  })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)); // Sort by absolute impact

  // 6. Detailed Analysis & Forecast (Filtered by Year)
  const targetYear = year ? parseInt(year) : availableYears[0] || new Date().getFullYear();

  // Filter leads for summary metrics
  const wonLeadsInYear = leads.filter(l => l.status === 'Ganho' && (l.data_ganho ? new Date(l.data_ganho).getFullYear() === targetYear : new Date(l.createdAt).getFullYear() === targetYear));

  // Filter predictions (Open leads) by creation year
  // Note: Usually pipeline includes all open leads regardless of creation, but user asked to "consider year".
  // We will filter by createdAt for consistency with the "period" request.
  const predictionsInYear = predictions.filter(p => new Date(p.createdAt).getFullYear() === targetYear);
  const totalWonValue = wonLeadsInYear.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const totalPipelineValue = predictionsInYear.reduce((sum, l) => sum + (l.value || 0), 0); // Use .value from prediction object

  // Recalculate pipeline value from filtered predictions
  const pipelineValue = predictionsInYear.reduce((sum, p) => sum + (p.value || 0), 0);
  let expectedPipelineValue = 0;

  // Enrich predictions with factors
  const enrichedPredictions = predictionsInYear.map(pred => {
    // Removed idx as it's not reliable after filtering
    // We need to find the original feature vector.
    // Since we filtered predictionsInYear, the index 'idx' no longer matches 'predictionData'.
    // We need to find the index in the original 'predictionLeads' array.
    const originalIdx = predictionLeads.findIndex(l => l._id.toString() === pred.id.toString());
    const features = predictionData[originalIdx];
    const leadFactors = [];

    // Calculate contribution of each feature for this specific lead
    features.forEach((val, i) => {
      if (val !== 0) {
        // Only consider active features
        const weight = weights.get(0, i);
        const contribution = val * weight;
        // Only include significant factors
        if (Math.abs(contribution) > 0.1) {
          leadFactors.push({
            name: featureNames[i],
            effect: contribution
          });
        }
      }
    });

    // Sort factors by impact
    leadFactors.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

    // Add to expected value
    expectedPipelineValue += pred.value * (pred.probability / 100);
    return {
      ...pred,
      expectedValue: pred.value * (pred.probability / 100),
      factors: leadFactors.slice(0, 3) // Top 3 drivers
    };
  });

  // 7. ICP Analysis (Ideal Customer Profile)
  // We analyze ALL historical WON leads to find the "Perfect Lead" DNA
  const allWonLeads = leads.filter(l => l.status === 'Ganho');

  // Average Cycle Time (Days) - Calculated early for forecasting
  const avgCycleTime = allWonLeads.length > 0 ? allWonLeads.reduce((sum, l) => {
    const end = l.data_ganho ? new Date(l.data_ganho) : new Date();
    const start = new Date(l.createdAt);
    return sum + (end - start) / (1000 * 60 * 60 * 24);
  }, 0) / allWonLeads.length : 30; // Default to 30 days if no history

  // Helper to aggregate stats
  const aggregateStats = groupByFn => {
    const stats = {};
    allWonLeads.forEach(l => {
      const key = groupByFn(l);
      if (!key) return;
      if (!stats[key]) stats[key] = {
        count: 0,
        totalValue: 0,
        cycleTime: 0
      };
      stats[key].count++;
      stats[key].totalValue += l.valor_estimado || 0;

      // Cycle time
      if (l.data_ganho && l.createdAt) {
        const days = (new Date(l.data_ganho) - new Date(l.createdAt)) / (1000 * 60 * 60 * 24);
        stats[key].cycleTime += days;
      }
    });
    return Object.entries(stats).map(([key, data]) => ({
      name: key,
      count: data.count,
      avgValue: data.totalValue / data.count,
      avgCycleTime: data.cycleTime / data.count,
      totalValue: data.totalValue
    })).sort((a, b) => b.totalValue - a.totalValue); // Sort by total revenue generated
  };
  const topNiches = aggregateStats(l => {
    var _l$id_empresa2, _l$id_empresa2$id_nic;
    return (_l$id_empresa2 = l.id_empresa) === null || _l$id_empresa2 === void 0 ? void 0 : (_l$id_empresa2$id_nic = _l$id_empresa2.id_nicho) === null || _l$id_empresa2$id_nic === void 0 ? void 0 : _l$id_empresa2$id_nic.nome_nicho;
  });
  const topOrigins = aggregateStats(l => {
    var _l$id_origem_lead2;
    return (_l$id_origem_lead2 = l.id_origem_lead) === null || _l$id_origem_lead2 === void 0 ? void 0 : _l$id_origem_lead2.canal;
  });

  // Average Deal Size of Won Leads
  const avgDealSize = allWonLeads.length > 0 ? allWonLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0) / allWonLeads.length : 0;
  const icpAnalysis = {
    topNiches: topNiches.slice(0, 3),
    topOrigins: topOrigins.slice(0, 3),
    avgDealSize,
    avgCycleTime
  };

  // 8. Monthly Forecast Calculation
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = months.map(m => ({
    month: m,
    actual: 0,
    predicted: 0,
    cumulativeTotal: 0
  }));

  // Actual Revenue (Won Leads)
  wonLeadsInYear.forEach(l => {
    const date = l.data_ganho ? new Date(l.data_ganho) : new Date(l.createdAt);
    const monthIdx = date.getMonth();
    monthlyData[monthIdx].actual += l.valor_estimado || 0;
  });

  // Predicted Revenue (Open Leads)
  // We project the closing date based on creation date + average cycle time
  predictionsInYear.forEach(p => {
    const created = new Date(p.createdAt);
    const expectedCloseDate = new Date(created.getTime() + avgCycleTime * 24 * 60 * 60 * 1000);

    // Only count if expected close date is within the target year
    if (expectedCloseDate.getFullYear() === targetYear) {
      const monthIdx = expectedCloseDate.getMonth();
      // Expected Value = Value * Probability
      const ev = (p.value || 0) * (p.probability / 100);
      monthlyData[monthIdx].predicted += ev;
    }
  });

  // Calculate Cumulative Total
  let runningTotal = 0;
  monthlyData.forEach(d => {
    runningTotal += d.actual + d.predicted;
    d.cumulativeTotal = runningTotal;
  });
  return {
    availableYears,
    selectedYear: targetYear,
    summary: {
      totalWonValue,
      totalPipelineValue: pipelineValue,
      expectedPipelineValue,
      totalForecast: totalWonValue + expectedPipelineValue
    },
    predictions: enrichedPredictions.sort((a, b) => b.probability - a.probability),
    monthlyForecast: monthlyData,
    featureWeights,
    icpAnalysis
  };
};
exports.performPrediction = performPrediction;