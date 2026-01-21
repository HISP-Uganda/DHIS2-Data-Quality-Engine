"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.facilityStore = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const FACILITIES_FILE = (0, path_1.join)(__dirname, '../../data/facilities.json');
class FacilityStore {
    constructor() {
        this.facilities = [];
        this.loadFacilities();
    }
    loadFacilities() {
        if ((0, fs_1.existsSync)(FACILITIES_FILE)) {
            try {
                const data = (0, fs_1.readFileSync)(FACILITIES_FILE, 'utf8');
                this.facilities = JSON.parse(data);
                console.log(`[FacilityStore] Loaded ${this.facilities.length} facilities`);
            }
            catch (error) {
                console.error('[FacilityStore] Error loading facilities:', error);
                this.facilities = [];
            }
        }
        else {
            console.log('[FacilityStore] No facilities file found, starting with empty list');
            this.facilities = [];
        }
    }
    saveFacilities() {
        try {
            (0, fs_1.writeFileSync)(FACILITIES_FILE, JSON.stringify(this.facilities, null, 2));
            console.log(`[FacilityStore] Saved ${this.facilities.length} facilities`);
        }
        catch (error) {
            console.error('[FacilityStore] Error saving facilities:', error);
        }
    }
    getAllFacilities() {
        return [...this.facilities];
    }
    getFacilityById(id) {
        return this.facilities.find(f => f.id === id) || null;
    }
    getFacilityByOrgUnit(orgUnitId) {
        return this.facilities.find(f => f.orgUnitId === orgUnitId) || null;
    }
    addFacility(facilityData) {
        const now = new Date().toISOString();
        const facility = {
            ...facilityData,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now
        };
        this.facilities.push(facility);
        this.saveFacilities();
        console.log('[FacilityStore] Added facility:', facility.name, facility.orgUnitId);
        return facility;
    }
    updateFacility(id, updates) {
        const index = this.facilities.findIndex(f => f.id === id);
        if (index === -1)
            return null;
        this.facilities[index] = {
            ...this.facilities[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.saveFacilities();
        console.log('[FacilityStore] Updated facility:', this.facilities[index].name);
        return this.facilities[index];
    }
    deleteFacility(id) {
        const index = this.facilities.findIndex(f => f.id === id);
        if (index === -1)
            return false;
        const facility = this.facilities[index];
        this.facilities.splice(index, 1);
        this.saveFacilities();
        console.log('[FacilityStore] Deleted facility:', facility.name);
        return true;
    }
    getEnabledFacilities() {
        return this.facilities.filter(f => f.enabled);
    }
    getFacilitiesForDQNotifications() {
        return this.facilities.filter(f => f.enabled &&
            f.notificationPreferences.dqRuns &&
            (f.notificationPreferences.emailEnabled || f.notificationPreferences.whatsappEnabled || f.notificationPreferences.smsEnabled));
    }
    getFacilitiesForComparisonNotifications() {
        return this.facilities.filter(f => f.enabled &&
            f.notificationPreferences.comparisons &&
            (f.notificationPreferences.emailEnabled || f.notificationPreferences.whatsappEnabled || f.notificationPreferences.smsEnabled));
    }
    getFacilitiesByOrgUnits(orgUnitIds) {
        return this.facilities.filter(f => f.enabled &&
            orgUnitIds.includes(f.orgUnitId));
    }
    generateId() {
        return `facility_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Bulk operations
    importFacilities(facilities) {
        let imported = 0;
        const errors = [];
        for (const facilityData of facilities) {
            try {
                // Check if facility already exists by orgUnitId
                const existing = this.getFacilityByOrgUnit(facilityData.orgUnitId);
                if (existing) {
                    errors.push(`Facility for org unit ${facilityData.orgUnitId} already exists`);
                    continue;
                }
                this.addFacility(facilityData);
                imported++;
            }
            catch (error) {
                errors.push(`Error importing facility ${facilityData.name}: ${error}`);
            }
        }
        console.log(`[FacilityStore] Bulk import complete: ${imported} imported, ${errors.length} errors`);
        return { imported, errors };
    }
    exportFacilities() {
        return this.getAllFacilities();
    }
    // Statistics
    getStats() {
        const total = this.facilities.length;
        const enabled = this.facilities.filter(f => f.enabled).length;
        const emailEnabled = this.facilities.filter(f => f.notificationPreferences.emailEnabled).length;
        const whatsappEnabled = this.facilities.filter(f => f.notificationPreferences.whatsappEnabled).length;
        const smsEnabled = this.facilities.filter(f => f.notificationPreferences.smsEnabled).length;
        const dqNotifications = this.facilities.filter(f => f.notificationPreferences.dqRuns).length;
        const comparisonNotifications = this.facilities.filter(f => f.notificationPreferences.comparisons).length;
        return {
            total,
            enabled,
            emailEnabled,
            whatsappEnabled,
            smsEnabled,
            dqNotifications,
            comparisonNotifications
        };
    }
    // Default facility creation for common org units
    createDefaultFacility(orgUnitId, orgUnitName) {
        return this.addFacility({
            name: orgUnitName,
            orgUnitId,
            email: [],
            whatsapp: [],
            sms: [],
            enabled: false, // Disabled by default until contacts are added
            notificationPreferences: {
                dqRuns: true,
                comparisons: true,
                emailEnabled: true,
                whatsappEnabled: true,
                smsEnabled: true
            },
            dqRunCount: 0
        });
    }
    // Increment DQ run count and return the new count
    incrementDQRunCount(orgUnitId) {
        const facility = this.getFacilityByOrgUnit(orgUnitId);
        if (!facility) {
            console.log(`[FacilityStore] No facility found for org unit ${orgUnitId}, creating default`);
            const newFacility = this.createDefaultFacility(orgUnitId, orgUnitId);
            newFacility.dqRunCount = 1;
            this.updateFacility(newFacility.id, newFacility);
            return 1;
        }
        const currentCount = facility.dqRunCount || 0;
        const newCount = currentCount + 1;
        facility.dqRunCount = newCount;
        facility.updatedAt = new Date().toISOString();
        this.updateFacility(facility.id, facility);
        console.log(`[FacilityStore] Incremented DQ run count for ${facility.name}: ${newCount}`);
        return newCount;
    }
    // Get current DQ run count for a facility
    getDQRunCount(orgUnitId) {
        const facility = this.getFacilityByOrgUnit(orgUnitId);
        return facility?.dqRunCount || 0;
    }
}
exports.facilityStore = new FacilityStore();
