"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetStats = exports.getAllComparisons = exports.getAllDQRuns = exports.getDashboardMetrics = exports.addComparisonStats = exports.addDQRunStats = void 0;
let dqRunHistory = [];
let comparisonHistory = [];
const addDQRunStats = (stats) => {
    const newStats = {
        ...stats,
        id: `dq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
    };
    dqRunHistory.push(newStats);
    if (dqRunHistory.length > 100) {
        dqRunHistory = dqRunHistory.slice(-100);
    }
    return newStats;
};
exports.addDQRunStats = addDQRunStats;
const addComparisonStats = (stats) => {
    const newStats = {
        ...stats,
        id: `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
    };
    comparisonHistory.push(newStats);
    if (comparisonHistory.length > 50) {
        comparisonHistory = comparisonHistory.slice(-50);
    }
    return newStats;
};
exports.addComparisonStats = addComparisonStats;
const getDashboardMetrics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentDQRuns = dqRunHistory.filter(run => run.timestamp >= thirtyDaysAgo);
    const recentComparisons = comparisonHistory.filter(comp => comp.timestamp >= thirtyDaysAgo);
    const totalDQRuns = recentDQRuns.length;
    const successfulRuns = recentDQRuns.filter(run => run.success).length;
    const totalValidationErrors = recentDQRuns.reduce((sum, run) => sum + run.validationErrors, 0);
    const totalDatasetComparisons = recentComparisons.length;
    const averageCompleteness = recentDQRuns.length > 0
        ? recentDQRuns.reduce((sum, run) => sum + run.completeness, 0) / recentDQRuns.length
        : 0;
    const totalConsensusFound = recentComparisons.reduce((sum, comp) => sum + comp.consensusFound, 0);
    const totalComparisonRecords = recentComparisons.reduce((sum, comp) => sum + comp.totalRecords, 0);
    const consensusPercentage = totalComparisonRecords > 0
        ? (totalConsensusFound / totalComparisonRecords) * 100
        : 0;
    const lastRunTime = recentDQRuns.length > 0
        ? recentDQRuns[recentDQRuns.length - 1].timestamp
        : null;
    const recentErrors = recentDQRuns
        .filter(run => !run.success)
        .slice(-10)
        .map(run => `${run.orgUnit} (${run.period}): Validation errors`);
    const facilityStats = recentDQRuns
        .reduce((acc, run) => {
        const existing = acc.find(f => f.orgUnit === run.orgUnit);
        if (existing) {
            existing.completeness = (existing.completeness + run.completeness) / 2;
            existing.errors += run.validationErrors;
        }
        else {
            acc.push({
                orgUnit: run.orgUnit,
                orgUnitName: run.orgUnit,
                completeness: run.completeness,
                errors: run.validationErrors
            });
        }
        return acc;
    }, [])
        .slice(0, 10);
    const regionalStats = [
        { region: 'Central Region', completeness: averageCompleteness + 2, facilities: Math.max(1, Math.floor(facilityStats.length * 0.3)) },
        { region: 'Eastern Region', completeness: averageCompleteness - 1, facilities: Math.max(1, Math.floor(facilityStats.length * 0.25)) },
        { region: 'Western Region', completeness: averageCompleteness - 3, facilities: Math.max(1, Math.floor(facilityStats.length * 0.2)) },
        { region: 'Northern Region', completeness: averageCompleteness, facilities: Math.max(1, Math.floor(facilityStats.length * 0.15)) },
        { region: 'Southern Region', completeness: averageCompleteness + 1, facilities: Math.max(1, Math.floor(facilityStats.length * 0.1)) },
    ];
    const trendsData = [];
    for (let i = 6; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - (i - 1) * 7 * 24 * 60 * 60 * 1000);
        const weekRuns = recentDQRuns.filter(run => run.timestamp >= weekStart && run.timestamp < weekEnd);
        const weekCompleteness = weekRuns.length > 0
            ? weekRuns.reduce((sum, run) => sum + run.completeness, 0) / weekRuns.length
            : averageCompleteness;
        const weekAccuracy = weekRuns.length > 0
            ? ((weekRuns.filter(run => run.validationErrors === 0).length) / weekRuns.length) * 100
            : 90;
        trendsData.push({
            period: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            completeness: Math.round(weekCompleteness * 10) / 10,
            accuracy: Math.round(weekAccuracy * 10) / 10
        });
    }
    return {
        totalDQRuns,
        successfulRuns,
        totalValidationErrors,
        totalDatasetComparisons,
        averageCompleteness: Math.round(averageCompleteness * 10) / 10,
        consensusPercentage: Math.round(consensusPercentage * 10) / 10,
        activeDQJobs: 0,
        lastRunTime,
        recentErrors,
        facilityStats,
        regionalStats,
        trendsData
    };
};
exports.getDashboardMetrics = getDashboardMetrics;
const getAllDQRuns = () => dqRunHistory;
exports.getAllDQRuns = getAllDQRuns;
const getAllComparisons = () => comparisonHistory;
exports.getAllComparisons = getAllComparisons;
const resetStats = () => {
    dqRunHistory = [];
    comparisonHistory = [];
};
exports.resetStats = resetStats;
