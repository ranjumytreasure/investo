/**
 * Calculate the next auction date based on current auction date and frequency
 * @param currentAuctionDate - The current/previous auction date
 * @param frequency - The auction frequency ('weekly', 'biweekly', 'monthly')
 * @returns The next auction date
 */
export function calculateNextAuctionDate(
    currentAuctionDate: Date,
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null
): Date {
    const nextDate = new Date(currentAuctionDate);
    
    switch (frequency) {
        case 'daily':
            // Add 1 day
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            // Add 7 days
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'biweekly':
            // Add 14 days
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            // Add 30 days
            nextDate.setDate(nextDate.getDate() + 30);
            break;
        default:
            // Default to monthly (30 days) if frequency not specified
            nextDate.setDate(nextDate.getDate() + 30);
    }
    
    return nextDate;
}





