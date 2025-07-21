/**
 * Utility function to get the last 6 characters of a UUID for display
 * @param uuid - The full UUID string
 * @returns The last 6 characters of the UUID
 */
export const getShortId = (uuid: string): string => {
    return uuid.slice(-6).toUpperCase()
}