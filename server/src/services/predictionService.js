import mongoose from 'mongoose';
import Lead from '../models/Comercial/Lead.js';

console.log('Prediction Service Loaded');

/**
 * Performs Logistic Regression to predict win probability.
 * @param {number} [year] - Optional year to filter the results.
 * @returns {Promise<Object>} - Predictions, feature weights, and summary.
 */
export const performPrediction = async (year) => {
    console.log(`Starting prediction analysis${year ? ` for year ${year}` : ''}...`);

    // 1. Fetch Data
    // We need ALL leads to build the full feature set (to ensure one-hot encoding is consistent)
    const leads = await Lead.find({})
        .populate({
            path: 'id_empresa',
            populate: { path: 'id_nicho' }
        })
        .populate('id_origem_lead')
        .populate('id_fase_atual')
        .populate('id_contato') // Fix: Populate contact for names
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
    const allNichos = [...new Set(leads.map(l => l.id_empresa?.id_nicho?.nome_nicho).filter(Boolean))].sort();
    const allOrigens = [...new Set(leads.map(l => l.id_origem_lead?.canal).filter(Boolean))].sort();

    // Helper to normalize
    const values = leads.map(l => Math.log1p(l.valor_estimado || 0));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const normalizeVal = (v) => (maxVal - minVal === 0 ? 0 : (Math.log1p(v) - minVal) / (maxVal - minVal));

    const phases = leads.map(l => l.id_fase_atual?.ordem || 0);
    const minPhase = Math.min(...phases);
    const maxPhase = Math.max(...phases);
    const normalizePhase = (p) => (maxPhase - minPhase === 0 ? 0 : (p - minPhase) / (maxPhase - minPhase));

    // New: Stale Lead Detection (Binary)
    // Instead of continuous time (which boosts new leads), we only penalize very old ones.
    const now = new Date();
    const STALE_THRESHOLD_DAYS = 120; // 4 months

    const isStale = (lead) => {
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

    leads.forEach((lead) => {
        // Build Feature Vector
        const features = [
            normalizeVal(lead.valor_estimado || 0),
            normalizePhase(lead.id_fase_atual?.ordem || 0),
            isStale(lead)
        ];

        // One-Hot Encode Niche
        const leadNiche = lead.id_empresa?.id_nicho?.nome_nicho;
        allNichos.forEach(n => features.push(n === leadNiche ? 1 : 0));

        // One-Hot Encode Origin
        const leadOrigin = lead.id_origem_lead?.canal;
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
    const { Matrix } = await (eval('import("ml-matrix")'));
    // ml-logistic-regression exports the class directly as module.exports
    const LogisticRegressionModule = await (eval('import("ml-logistic-regression")'));
    const LogisticRegression = LogisticRegressionModule.default || LogisticRegressionModule;


    const X = new Matrix(trainingData);
    const Y = Matrix.columnVector(trainingLabels);

    const logreg = new LogisticRegression({ numSteps: 2000, learningRate: 1e-2 }); // Optimized hyperparameters
    logreg.train(X, Y);

    console.log('Model trained.');

    // 4. Predict
    const predictions = [];
    if (predictionData.length > 0) {
        // We use the classifier for Class 1 (Won) to get the probability of winning
        // The library creates a classifier per class (One-vs-Rest)
        const wonClassifier = logreg.classifiers[1];
        const weights = wonClassifier.weights;

        predictionLeads.forEach((lead, idx) => {
            const features = predictionData[idx];
            // Manual calculation of probability using the weights for the "Won" class
            let z = 0;
            for (let i = 0; i < features.length; i++) {
                z += features[i] * weights.get(0, i);
            }

            const prob = 1 / (1 + Math.exp(-z));

            predictions.push({
                id: lead._id,
                leadName: lead.id_contato?.nome || 'Unknown',
                companyName: lead.id_empresa?.nome_empresa || 'Unknown',
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
    const targetYear = year ? parseInt(year) : (availableYears[0] || new Date().getFullYear());

    // Filter leads for summary metrics
    const wonLeadsInYear = leads.filter(l =>
        l.status === 'Ganho' &&
        (l.data_ganho ? new Date(l.data_ganho).getFullYear() === targetYear : new Date(l.createdAt).getFullYear() === targetYear)
    );

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
    const enrichedPredictions = predictionsInYear.map((pred) => { // Removed idx as it's not reliable after filtering
        // We need to find the original feature vector. 
        // Since we filtered predictionsInYear, the index 'idx' no longer matches 'predictionData'.
        // We need to find the index in the original 'predictionLeads' array.
        const originalIdx = predictionLeads.findIndex(l => l._id.toString() === pred.id.toString());
        const features = predictionData[originalIdx];

        const leadFactors = [];

        // Calculate contribution of each feature for this specific lead
        features.forEach((val, i) => {
            if (val !== 0) { // Only consider active features
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
        featureWeights
    };
};
