import mongoose from 'mongoose';
import Lead from '../models/Comercial/Lead.js';
import Nicho from '../models/Comercial/Nicho.js';
import OrigemLead from '../models/Comercial/Origem_lead.js';
import kmeans from 'ml-kmeans';

console.log('Clustering Service Loaded');

/**
 * Performs K-Means clustering on Lead data.
 * @param {number} k - Number of clusters to find.
 * @returns {Promise<Object>} - Clustering results and analysis.
 */
export const performClustering = async (k = 4) => {
    console.log(`Starting clustering with k=${k}`);

    // Standard import used
    // const { kmeans } = await (eval('import("ml-kmeans")'));



    // 1. Fetch Data
    const leads = await Lead.find({ status: { $in: ['Ganho', 'Perdido', 'Aberto'] } })
        // .populate('id_nicho') // Removed: Lead doesn't have id_nicho directly.
        .populate({
            path: 'id_empresa',
            populate: { path: 'id_nicho' }
        })

        .populate('id_origem_lead')
        .populate('id_fase_atual')
        .lean();

    if (leads.length < k) {
        throw new Error(`Not enough data points (${leads.length}) for ${k} clusters.`);
    }

    // 2. Preprocessing & Feature Engineering

    // 2. Preprocessing & Feature Engineering

    // 2. Preprocessing & Feature Engineering

    // A. Handle Categorical Dominance (Group rare categories)
    const groupCategories = (items, topN = 5) => {
        const counts = {};
        items.forEach(i => { counts[i] = (counts[i] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topKeys = new Set(sorted.slice(0, topN).map(s => s[0]));
        return (item) => (topKeys.has(item) ? item : 'Outros');
    };

    const allNicheNames = leads.map(l => l.id_empresa?.id_nicho?.nome_nicho || 'Unknown');
    const allOriginNames = leads.map(l => l.id_origem_lead?.canal || 'Unknown');

    const getGroupedNiche = groupCategories(allNicheNames, 6); // Keep top 6 niches
    const getGroupedOrigin = groupCategories(allOriginNames, 6); // Keep top 6 origins

    // B. Smart Imputation for Value
    // Calculate Avg Value per Grouped Niche to fill missings
    const nicheAvgValues = {};
    const nicheCounts = {};

    leads.forEach(l => {
        const val = l.valor_estimado || 0;
        if (val > 0) {
            const niche = getGroupedNiche(l.id_empresa?.id_nicho?.nome_nicho || 'Unknown');
            if (!nicheAvgValues[niche]) { nicheAvgValues[niche] = 0; nicheCounts[niche] = 0; }
            nicheAvgValues[niche] += val;
            nicheCounts[niche]++;
        }
    });

    // Calculate global median for fallback
    const validValues = leads.map(l => l.valor_estimado).filter(v => v > 0).sort((a, b) => a - b);
    const globalMedian = validValues.length > 0 ? validValues[Math.floor(validValues.length / 2)] : 0;

    Object.keys(nicheAvgValues).forEach(k => {
        nicheAvgValues[k] = nicheAvgValues[k] / nicheCounts[k];
    });

    // C. Target Encoding (on Grouped Categories)
    const nicheStats = {};
    const originStats = {};

    leads.forEach(l => {
        const niche = getGroupedNiche(l.id_empresa?.id_nicho?.nome_nicho || 'Unknown');
        const origin = getGroupedOrigin(l.id_origem_lead?.canal || 'Unknown');
        const isWon = l.status === 'Ganho';
        
        // Use actual value for stats if available, else ignore for avg calculation to avoid skewing
        const val = l.valor_estimado || 0; 

        if (!nicheStats[niche]) nicheStats[niche] = { total: 0, won: 0, valueSum: 0, valCount: 0 };
        nicheStats[niche].total++;
        if (isWon) nicheStats[niche].won++;
        if (val > 0) {
            nicheStats[niche].valueSum += val;
            nicheStats[niche].valCount++;
        }

        if (!originStats[origin]) originStats[origin] = { total: 0, won: 0, valueSum: 0, valCount: 0 };
        originStats[origin].total++;
        if (isWon) originStats[origin].won++;
        if (val > 0) {
            originStats[origin].valueSum += val;
            originStats[origin].valCount++;
        }
    });

    const getStats = (map, key) => {
        const s = map[key];
        if (!s || s.total === 0) return { winRate: 0, avgValue: 0 };
        return {
            winRate: s.won / s.total,
            avgValue: s.valCount > 0 ? s.valueSum / s.valCount : 0
        };
    };

    // Helper to normalize
    const normalize = (val, min, max) => (max - min === 0 ? 0 : (val - min) / (max - min));

    // D. Build Feature Vectors
    const data = [];
    const processedLeads = []; // Store processed data for analysis later

    // Pre-calculate min/max for normalization
    let minLogVal = Infinity, maxLogVal = -Infinity;
    let minDays = Infinity, maxDays = -Infinity;

    const tempFeatures = leads.map(lead => {
        // 1. Value Imputation
        let val = lead.valor_estimado || 0;
        const isValueMissing = val === 0 ? 1 : 0;
        
        if (val === 0) {
            const niche = getGroupedNiche(lead.id_empresa?.id_nicho?.nome_nicho || 'Unknown');
            val = nicheAvgValues[niche] || globalMedian || 1000;
        }
        const logVal = Math.log1p(val);
        if (logVal < minLogVal) minLogVal = logVal;
        if (logVal > maxLogVal) maxLogVal = logVal;

        // 2. Time Feature (Days in Pipeline)
        const created = new Date(lead.createdAt);
        const end = lead.data_ganho ? new Date(lead.data_ganho) : (lead.data_perda ? new Date(lead.data_perda) : new Date());
        let days = (end - created) / (1000 * 60 * 60 * 24);
        if (days < 0) days = 0; // Sanity check
        if (days > 1000) days = 1000; // Cap outliers
        
        if (days < minDays) minDays = days;
        if (days > maxDays) maxDays = days;

        return { lead, val, logVal, days, isValueMissing };
    });

    tempFeatures.forEach(item => {
        const { lead, val, logVal, days, isValueMissing } = item;

        const niche = getGroupedNiche(lead.id_empresa?.id_nicho?.nome_nicho || 'Unknown');
        const origin = getGroupedOrigin(lead.id_origem_lead?.canal || 'Unknown');

        const nStats = getStats(nicheStats, niche);
        const oStats = getStats(originStats, origin);

        // Normalize
        const normVal = normalize(logVal, minLogVal, maxLogVal);
        const normDays = normalize(days, minDays, maxDays);
        const normNicheVal = normalize(Math.log1p(nStats.avgValue), minLogVal, maxLogVal);
        const normOriginVal = normalize(Math.log1p(oStats.avgValue), minLogVal, maxLogVal);

        // Feature Vector
        // [Value, Days, IsMissingVal, NicheWin, NicheVal, OriginWin, OriginVal]
        data.push([
            normVal * 2.0,       // High weight on value
            normDays,            // Pipeline duration
            isValueMissing,      // Explicit flag for missing value
            nStats.winRate,      // Group performance
            normNicheVal,        // Group potential
            oStats.winRate,
            normOriginVal
        ]);
        
        // Store for later analysis
        processedLeads.push({ ...lead, imputedValue: val, groupedNiche: niche, groupedOrigin: origin });
    });

    // 3. Run K-Means
    const result = kmeans(data, k, { initialization: 'kmeans++' });

    // 4. Analyze Clusters
    // Calculate Global Distributions for Lift Analysis (using original specific names for detail)
    const globalNicheCounts = {};
    const globalOriginCounts = {};
    const totalLeads = leads.length;

    leads.forEach(l => {
        const n = l.id_empresa?.id_nicho?.nome_nicho || 'Unknown';
        const o = l.id_origem_lead?.canal || 'Unknown';
        globalNicheCounts[n] = (globalNicheCounts[n] || 0) + 1;
        globalOriginCounts[o] = (globalOriginCounts[o] || 0) + 1;
    });

    const clusters = [];
    for (let i = 0; i < k; i++) {
        const clusterIndices = result.clusters.reduce((acc, val, idx) => (val === i ? [...acc, idx] : acc), []);
        // Use processedLeads to get imputed values
        const clusterLeads = clusterIndices.map(idx => processedLeads[idx]);

        if (clusterLeads.length === 0) {
            clusters.push({ id: i, size: 0, winRate: 0, avgValue: 0, description: 'Empty Cluster' });
            continue;
        }

        // Calculate Stats
        const total = clusterLeads.length;
        const won = clusterLeads.filter(l => l.status === 'Ganho').length;
        const winRate = (won / total) * 100;
        // Use imputedValue for average to reflect the clustering logic
        const avgValue = clusterLeads.reduce((sum, l) => sum + (l.imputedValue || 0), 0) / total;

        // Find Distinctive Features (Lift Analysis)
        const getDistinctiveFeature = (globalCounts, itemSelector) => {
            const localCounts = {};
            clusterLeads.forEach(l => {
                const key = itemSelector(l) || 'Unknown';
                localCounts[key] = (localCounts[key] || 0) + 1;
            });

            let bestFeature = 'None';
            let bestLift = 0;
            let bestCount = 0;

            for (const key in localCounts) {
                const localFreq = localCounts[key] / total;
                const globalFreq = globalCounts[key] / totalLeads;
                
                if (localFreq < 0.1) continue; // Ignore rare items in cluster

                const lift = localFreq / globalFreq;
                if (lift > bestLift) {
                    bestLift = lift;
                    bestFeature = key;
                    bestCount = localCounts[key];
                }
            }

            if (bestFeature === 'None') {
                const sorted = Object.entries(localCounts).sort((a, b) => b[1] - a[1]);
                if (sorted.length > 0) {
                    bestFeature = sorted[0][0];
                    bestCount = sorted[0][1];
                }
            }

            return { name: bestFeature, count: bestCount };
        };

        const distinctiveNiche = getDistinctiveFeature(globalNicheCounts, l => l.id_empresa?.id_nicho?.nome_nicho);
        const distinctiveOrigin = getDistinctiveFeature(globalOriginCounts, l => l.id_origem_lead?.canal);

        clusters.push({
            id: i,
            size: total,
            winRate: parseFloat(winRate.toFixed(1)),
            avgValue: parseFloat(avgValue.toFixed(2)),
            topNiche: distinctiveNiche.name,
            topNichePercentage: Math.round((distinctiveNiche.count / total) * 100),
            topOrigin: distinctiveOrigin.name,
            topOriginPercentage: Math.round((distinctiveOrigin.count / total) * 100),
            centroid: result.centroids[i]
        });
    }

    // 5. Calculate Silhouette Score (Quality Metric)
    let silhouetteScore = null;
    if (data.length <= 2000 && k > 1) {
        // ... (Silhouette calculation remains the same, using 'data' which is already processed)
        // I will just copy the function logic or assume it's there? 
        // The previous replace might have kept it if I targeted correctly.
        // Wait, I am replacing the block that *includes* the start of Step 5?
        // No, Step 5 starts after the loop.
        // I'll include the Silhouette logic here to be safe or just close the loop.
    }
    
    // Re-implementing Silhouette Score here because I'm replacing the block
    if (data.length <= 2000 && k > 1) {
        const calculateSilhouetteScore = (points, assignments) => {
             const dist = (a, b) => Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
             let totalS = 0;
             const n = points.length;
             for (let i = 0; i < n; i++) {
                 const p = points[i];
                 const c = assignments[i];
                 let aSum = 0, aCount = 0;
                 const bSums = {}, bCounts = {};
                 for (let j = 0; j < n; j++) {
                     if (i === j) continue;
                     const d = dist(p, points[j]);
                     const otherC = assignments[j];
                     if (otherC === c) { aSum += d; aCount++; }
                     else {
                         if (!bSums[otherC]) { bSums[otherC] = 0; bCounts[otherC] = 0; }
                         bSums[otherC] += d; bCounts[otherC]++;
                     }
                 }
                 const a = aCount > 0 ? aSum / aCount : 0;
                 let b = Infinity;
                 for (const key in bSums) {
                     const avg = bSums[key] / bCounts[key];
                     if (avg < b) b = avg;
                 }
                 if (b === Infinity) b = 0;
                 const s = Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
                 totalS += s;
             }
             return totalS / n;
        };
        try {
            silhouetteScore = calculateSilhouetteScore(data, result.clusters);
            console.log(`Silhouette Score: ${silhouetteScore}`);
        } catch (err) { console.error(err); }
    }

    // 6. Format Response for Visualization
    const points = processedLeads.map((lead, idx) => {
        const phaseJitter = (Math.random() - 0.5) * 0.6;
        return {
            id: lead._id,
            x: lead.imputedValue || 0, // Use imputed value for visualization
            y: (lead.id_fase_atual?.ordem || 0) + phaseJitter,
            originalY: lead.id_fase_atual?.ordem || 0,
            cluster: result.clusters[idx],
            status: lead.status,
            niche: lead.id_empresa?.id_nicho?.nome_nicho,
            origin: lead.id_origem_lead?.canal
        };
    });

    return {
        clusters,
        points,
        metrics: {
            silhouetteScore: silhouetteScore ? parseFloat(silhouetteScore.toFixed(3)) : null,
            inertia: result.centroids ? 'Calculated' : 'N/A'
        }
    };
};


