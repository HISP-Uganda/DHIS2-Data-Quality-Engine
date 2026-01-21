import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface FacilityContact {
    id: string
    name: string
    orgUnitId: string
    email: string[]
    whatsapp: string[]
    sms: string[]
    enabled: boolean
    notificationPreferences: {
        dqRuns: boolean
        comparisons: boolean
        emailEnabled: boolean
        whatsappEnabled: boolean
        smsEnabled: boolean
    }
    dqRunCount?: number // Track number of DQ runs for this facility
    createdAt: string
    updatedAt: string
}

const FACILITIES_FILE = join(__dirname, '../../data/facilities.json')

class FacilityStore {
    private facilities: FacilityContact[] = []

    constructor() {
        this.loadFacilities()
    }

    private loadFacilities() {
        if (existsSync(FACILITIES_FILE)) {
            try {
                const data = readFileSync(FACILITIES_FILE, 'utf8')
                this.facilities = JSON.parse(data)
                console.log(`[FacilityStore] Loaded ${this.facilities.length} facilities`)
            } catch (error) {
                console.error('[FacilityStore] Error loading facilities:', error)
                this.facilities = []
            }
        } else {
            console.log('[FacilityStore] No facilities file found, starting with empty list')
            this.facilities = []
        }
    }

    private saveFacilities() {
        try {
            writeFileSync(FACILITIES_FILE, JSON.stringify(this.facilities, null, 2))
            console.log(`[FacilityStore] Saved ${this.facilities.length} facilities`)
        } catch (error) {
            console.error('[FacilityStore] Error saving facilities:', error)
        }
    }

    getAllFacilities(): FacilityContact[] {
        return [...this.facilities]
    }

    getFacilityById(id: string): FacilityContact | null {
        return this.facilities.find(f => f.id === id) || null
    }

    getFacilityByOrgUnit(orgUnitId: string): FacilityContact | null {
        return this.facilities.find(f => f.orgUnitId === orgUnitId) || null
    }

    addFacility(facilityData: Omit<FacilityContact, 'id' | 'createdAt' | 'updatedAt'>): FacilityContact {
        const now = new Date().toISOString()
        const facility: FacilityContact = {
            ...facilityData,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now
        }

        this.facilities.push(facility)
        this.saveFacilities()
        
        console.log('[FacilityStore] Added facility:', facility.name, facility.orgUnitId)
        return facility
    }

    updateFacility(id: string, updates: Partial<Omit<FacilityContact, 'id' | 'createdAt'>>): FacilityContact | null {
        const index = this.facilities.findIndex(f => f.id === id)
        if (index === -1) return null

        this.facilities[index] = {
            ...this.facilities[index],
            ...updates,
            updatedAt: new Date().toISOString()
        }

        this.saveFacilities()
        console.log('[FacilityStore] Updated facility:', this.facilities[index].name)
        return this.facilities[index]
    }

    deleteFacility(id: string): boolean {
        const index = this.facilities.findIndex(f => f.id === id)
        if (index === -1) return false

        const facility = this.facilities[index]
        this.facilities.splice(index, 1)
        this.saveFacilities()
        
        console.log('[FacilityStore] Deleted facility:', facility.name)
        return true
    }

    getEnabledFacilities(): FacilityContact[] {
        return this.facilities.filter(f => f.enabled)
    }

    getFacilitiesForDQNotifications(): FacilityContact[] {
        return this.facilities.filter(f => 
            f.enabled && 
            f.notificationPreferences.dqRuns &&
            (f.notificationPreferences.emailEnabled || f.notificationPreferences.whatsappEnabled || f.notificationPreferences.smsEnabled)
        )
    }

    getFacilitiesForComparisonNotifications(): FacilityContact[] {
        return this.facilities.filter(f => 
            f.enabled && 
            f.notificationPreferences.comparisons &&
            (f.notificationPreferences.emailEnabled || f.notificationPreferences.whatsappEnabled || f.notificationPreferences.smsEnabled)
        )
    }

    getFacilitiesByOrgUnits(orgUnitIds: string[]): FacilityContact[] {
        return this.facilities.filter(f => 
            f.enabled && 
            orgUnitIds.includes(f.orgUnitId)
        )
    }

    private generateId(): string {
        return `facility_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Bulk operations
    importFacilities(facilities: Omit<FacilityContact, 'id' | 'createdAt' | 'updatedAt'>[]): { imported: number; errors: string[] } {
        let imported = 0
        const errors: string[] = []

        for (const facilityData of facilities) {
            try {
                // Check if facility already exists by orgUnitId
                const existing = this.getFacilityByOrgUnit(facilityData.orgUnitId)
                if (existing) {
                    errors.push(`Facility for org unit ${facilityData.orgUnitId} already exists`)
                    continue
                }

                this.addFacility(facilityData)
                imported++
            } catch (error) {
                errors.push(`Error importing facility ${facilityData.name}: ${error}`)
            }
        }

        console.log(`[FacilityStore] Bulk import complete: ${imported} imported, ${errors.length} errors`)
        return { imported, errors }
    }

    exportFacilities(): FacilityContact[] {
        return this.getAllFacilities()
    }

    // Statistics
    getStats() {
        const total = this.facilities.length
        const enabled = this.facilities.filter(f => f.enabled).length
        const emailEnabled = this.facilities.filter(f => f.notificationPreferences.emailEnabled).length
        const whatsappEnabled = this.facilities.filter(f => f.notificationPreferences.whatsappEnabled).length
        const smsEnabled = this.facilities.filter(f => f.notificationPreferences.smsEnabled).length
        const dqNotifications = this.facilities.filter(f => f.notificationPreferences.dqRuns).length
        const comparisonNotifications = this.facilities.filter(f => f.notificationPreferences.comparisons).length

        return {
            total,
            enabled,
            emailEnabled,
            whatsappEnabled,
            smsEnabled,
            dqNotifications,
            comparisonNotifications
        }
    }

    // Default facility creation for common org units
    createDefaultFacility(orgUnitId: string, orgUnitName: string): FacilityContact {
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
        })
    }

    // Increment DQ run count and return the new count
    incrementDQRunCount(orgUnitId: string): number {
        const facility = this.getFacilityByOrgUnit(orgUnitId)
        if (!facility) {
            console.log(`[FacilityStore] No facility found for org unit ${orgUnitId}, creating default`)
            const newFacility = this.createDefaultFacility(orgUnitId, orgUnitId)
            newFacility.dqRunCount = 1
            this.updateFacility(newFacility.id, newFacility)
            return 1
        }

        const currentCount = facility.dqRunCount || 0
        const newCount = currentCount + 1
        facility.dqRunCount = newCount
        facility.updatedAt = new Date().toISOString()

        this.updateFacility(facility.id, facility)
        console.log(`[FacilityStore] Incremented DQ run count for ${facility.name}: ${newCount}`)

        return newCount
    }

    // Get current DQ run count for a facility
    getDQRunCount(orgUnitId: string): number {
        const facility = this.getFacilityByOrgUnit(orgUnitId)
        return facility?.dqRunCount || 0
    }
}

export const facilityStore = new FacilityStore()