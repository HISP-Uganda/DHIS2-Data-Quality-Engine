/**
 * Advanced Data Element Mapping Utility
 * Uses multiple similarity algorithms to intelligently map data elements across datasets
 */

// Levenshtein distance (edit distance) algorithm
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                )
            }
        }
    }

    return matrix[str2.length][str1.length]
}

// Calculate similarity ratio (0-1) based on Levenshtein distance
function levenshteinSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length)
    if (maxLen === 0) return 1.0
    const distance = levenshteinDistance(str1, str2)
    return 1 - (distance / maxLen)
}

// Jaro-Winkler similarity (better for short strings)
function jaroWinklerSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0

    const len1 = s1.length
    const len2 = s2.length

    if (len1 === 0 || len2 === 0) return 0.0

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1
    const s1Matches = new Array(len1).fill(false)
    const s2Matches = new Array(len2).fill(false)

    let matches = 0
    let transpositions = 0

    // Find matches
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchWindow)
        const end = Math.min(i + matchWindow + 1, len2)

        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue
            s1Matches[i] = true
            s2Matches[j] = true
            matches++
            break
        }
    }

    if (matches === 0) return 0.0

    // Find transpositions
    let k = 0
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue
        while (!s2Matches[k]) k++
        if (s1[i] !== s2[k]) transpositions++
        k++
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

    // Jaro-Winkler
    const prefixLength = Math.min(4, Math.min(len1, len2))
    let commonPrefix = 0
    for (let i = 0; i < prefixLength; i++) {
        if (s1[i] === s2[i]) commonPrefix++
        else break
    }

    return jaro + (commonPrefix * 0.1 * (1 - jaro))
}

// Normalize text for comparison
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim()
}

// Extract key terms (important words) from text
export function extractKeyTerms(text: string): string[] {
    const normalized = normalizeText(text)
    const stopWords = new Set([
        'total', 'number', 'of', 'in', 'the', 'and', 'or', 'for', 'from', 'to',
        'with', 'by', 'at', 'on', 'a', 'an', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can'
    ])

    return normalized
        .split(' ')
        .filter(word => word.length > 2 && !stopWords.has(word))
}

// Calculate term overlap similarity
function termOverlapSimilarity(terms1: string[], terms2: string[]): number {
    if (terms1.length === 0 && terms2.length === 0) return 1.0
    if (terms1.length === 0 || terms2.length === 0) return 0.0

    const set1 = new Set(terms1)
    const set2 = new Set(terms2)
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])

    return intersection.size / union.size // Jaccard similarity
}

// Check if strings contain each other or common patterns
function containmentScore(str1: string, str2: string): number {
    const norm1 = normalizeText(str1)
    const norm2 = normalizeText(str2)

    if (norm1.includes(norm2) || norm2.includes(norm1)) return 1.0

    // Check word-level containment
    const words1 = norm1.split(' ')
    const words2 = norm2.split(' ')

    let containedWords = 0
    for (const word1 of words1) {
        if (word1.length > 3 && words2.some(w2 => w2.includes(word1) || word1.includes(w2))) {
            containedWords++
        }
    }

    return containedWords / Math.max(words1.length, words2.length)
}

// Combined similarity score with weights
export interface SimilarityScore {
    overall: number
    levenshtein: number
    jaroWinkler: number
    termOverlap: number
    containment: number
}

export function calculateSimilarity(str1: string, str2: string): SimilarityScore {
    const norm1 = normalizeText(str1)
    const norm2 = normalizeText(str2)

    // If strings are identical, return perfect score
    if (norm1 === norm2) {
        return {
            overall: 1.0,
            levenshtein: 1.0,
            jaroWinkler: 1.0,
            termOverlap: 1.0,
            containment: 1.0
        }
    }

    const levenshtein = levenshteinSimilarity(norm1, norm2)
    const jaroWinkler = jaroWinklerSimilarity(norm1, norm2)
    const terms1 = extractKeyTerms(str1)
    const terms2 = extractKeyTerms(str2)
    const termOverlap = termOverlapSimilarity(terms1, terms2)
    const containment = containmentScore(str1, str2)

    // Weighted combination - term overlap and containment are most important
    const overall =
        (termOverlap * 0.35) +      // Most important for domain-specific terms
        (containment * 0.30) +       // Check if concepts are contained
        (jaroWinkler * 0.20) +       // Good for name variations
        (levenshtein * 0.15)         // Catch typos and minor differences

    return {
        overall,
        levenshtein,
        jaroWinkler,
        termOverlap,
        containment
    }
}

// Interface for data element
export interface DataElement {
    id: string
    displayName: string
    formName?: string
    datasetId?: string
    datasetName?: string
}

// Interface for mapping suggestion
export interface MappingSuggestion {
    sourceElement: DataElement
    targetElement: DataElement
    similarity: SimilarityScore
    confidence: 'high' | 'medium' | 'low'
    reasons: string[]
}

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
    high: 0.75,    // 75%+ similarity
    medium: 0.50,  // 50-75% similarity
    low: 0.30      // 30-50% similarity (below 30% not suggested)
}

// Determine confidence level
function getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' | null {
    if (similarity >= CONFIDENCE_THRESHOLDS.high) return 'high'
    if (similarity >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
    if (similarity >= CONFIDENCE_THRESHOLDS.low) return 'low'
    return null
}

// Generate explanation for why elements were matched
function generateMatchReasons(similarity: SimilarityScore, source: string, target: string): string[] {
    const reasons: string[] = []

    if (similarity.overall >= 0.9) {
        reasons.push('Nearly identical names')
    } else if (similarity.containment >= 0.7) {
        reasons.push('One name contains the other')
    } else if (similarity.termOverlap >= 0.7) {
        reasons.push('High overlap in key medical terms')
    } else if (similarity.jaroWinkler >= 0.8) {
        reasons.push('Very similar spelling')
    }

    const sourceTerms = extractKeyTerms(source)
    const targetTerms = extractKeyTerms(target)
    const commonTerms = sourceTerms.filter(t => targetTerms.includes(t))

    if (commonTerms.length > 0) {
        reasons.push(`Common terms: ${commonTerms.slice(0, 3).join(', ')}`)
    }

    if (reasons.length === 0) {
        reasons.push('Moderate similarity in name structure')
    }

    return reasons
}

// Generate automatic mappings
export function generateAutoMappings(
    sourceElements: DataElement[],
    targetElements: DataElement[],
    minSimilarity: number = 0.30
): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = []
    const usedTargets = new Set<string>()

    // For each source element, find best matching target
    for (const sourceElement of sourceElements) {
        let bestMatch: { element: DataElement; similarity: SimilarityScore } | null = null
        let bestScore = 0

        for (const targetElement of targetElements) {
            // Skip if already matched
            if (usedTargets.has(targetElement.id)) continue

            // Calculate similarity using both displayName and formName
            const displaySim = calculateSimilarity(
                sourceElement.displayName,
                targetElement.displayName
            )

            let formSim: SimilarityScore | null = null
            if (sourceElement.formName && targetElement.formName) {
                formSim = calculateSimilarity(
                    sourceElement.formName,
                    targetElement.formName
                )
            }

            // Use the better of the two scores
            const similarity = formSim && formSim.overall > displaySim.overall
                ? formSim
                : displaySim

            if (similarity.overall > bestScore && similarity.overall >= minSimilarity) {
                bestScore = similarity.overall
                bestMatch = { element: targetElement, similarity }
            }
        }

        // If we found a good match, add it
        if (bestMatch) {
            const confidence = getConfidenceLevel(bestMatch.similarity.overall)
            if (confidence) {
                suggestions.push({
                    sourceElement,
                    targetElement: bestMatch.element,
                    similarity: bestMatch.similarity,
                    confidence,
                    reasons: generateMatchReasons(
                        bestMatch.similarity,
                        sourceElement.displayName,
                        bestMatch.element.displayName
                    )
                })
                usedTargets.add(bestMatch.element.id)
            }
        }
    }

    // Sort by similarity (best matches first)
    suggestions.sort((a, b) => b.similarity.overall - a.similarity.overall)

    return suggestions
}

// Convert suggestions to mapping object
export function suggestionsToMapping(suggestions: MappingSuggestion[]): Record<string, string> {
    const mapping: Record<string, string> = {}

    for (const suggestion of suggestions) {
        mapping[suggestion.sourceElement.id] = suggestion.targetElement.id
    }

    return mapping
}

// Batch mapping for multiple datasets
export interface DatasetElements {
    datasetId: string
    datasetName: string
    elements: DataElement[]
}

export function generateCrossDatasetMappings(
    sourceDataset: DatasetElements,
    targetDatasets: DatasetElements[]
): Map<string, Map<string, MappingSuggestion[]>> {
    const results = new Map<string, Map<string, MappingSuggestion[]>>()

    for (const targetDataset of targetDatasets) {
        const suggestions = generateAutoMappings(
            sourceDataset.elements,
            targetDataset.elements
        )

        if (!results.has(sourceDataset.datasetId)) {
            results.set(sourceDataset.datasetId, new Map())
        }

        results.get(sourceDataset.datasetId)!.set(targetDataset.datasetId, suggestions)
    }

    return results
}
