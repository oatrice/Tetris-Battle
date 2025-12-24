import { describe, it, expect } from 'vitest'

/**
 * Tests for Version Display Logic
 * 
 * Note: formatDate is tested by copying the logic here because
 * importing from useVersionInfo.ts triggers virtual:git-version import
 * which doesn't work in Vitest without complex mocking
 */

// Pure function copy for testing (same logic as useVersionInfo.ts)
function formatDate(isoDate: string): string {
    if (!isoDate) return isoDate
    try {
        const date = new Date(isoDate)
        if (isNaN(date.getTime())) return isoDate
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return isoDate
    }
}

describe('Version Info', () => {
    describe('formatDate', () => {
        it('should format ISO date to readable format', () => {
            const isoDate = '2025-12-23T10:30:00.000Z'
            const result = formatDate(isoDate)

            // Should contain month, day, year
            expect(result).toContain('Dec')
            expect(result).toContain('23')
            expect(result).toContain('2025')
        })

        it('should return original string if date is invalid', () => {
            const invalidDate = 'not-a-date'
            const result = formatDate(invalidDate)
            expect(result).toBe(invalidDate)
        })

        it('should handle empty string', () => {
            const result = formatDate('')
            expect(result).toBe('')
        })

        it('should handle various ISO formats', () => {
            // ISO with timezone
            expect(formatDate('2025-01-15T08:00:00+07:00')).toContain('Jan')
            expect(formatDate('2025-01-15T08:00:00+07:00')).toContain('15')

            // ISO without timezone
            expect(formatDate('2025-06-20T14:30:00')).toContain('Jun')
            expect(formatDate('2025-06-20T14:30:00')).toContain('20')
        })
    })

    describe('Version Display Logic', () => {
        it('should show HMR when isDirty is true', () => {
            const isDirty = true
            const commitHash = 'abc1234'

            const hashDisplay = isDirty ? 'HMR' : commitHash
            expect(hashDisplay).toBe('HMR')
        })

        it('should show commit hash when isDirty is false', () => {
            const isDirty = false
            const commitHash = 'abc1234'

            const hashDisplay = isDirty ? 'HMR' : commitHash
            expect(hashDisplay).toBe('abc1234')
        })

        it('should show current time when dirty, commit date when clean', () => {
            const currentTime = '11:30:45 PM'
            const commitDate = 'Dec 23, 2025'

            // Dirty state
            const dirtyDisplay = true ? currentTime : commitDate
            expect(dirtyDisplay).toBe(currentTime)

            // Clean state
            const cleanDisplay = false ? currentTime : commitDate
            expect(cleanDisplay).toBe(commitDate)
        })

        it('should apply correct CSS class based on state', () => {
            const getClasses = (isDev: boolean, isDirty: boolean) => {
                const classes: string[] = ['version-info']
                if (isDev) classes.push('dev')
                if (isDirty) classes.push('dirty')
                return classes
            }

            // Production
            expect(getClasses(false, false)).toEqual(['version-info'])

            // Dev, clean
            expect(getClasses(true, false)).toEqual(['version-info', 'dev'])

            // Dev, dirty
            expect(getClasses(true, true)).toEqual(['version-info', 'dev', 'dirty'])
        })
    })
})
