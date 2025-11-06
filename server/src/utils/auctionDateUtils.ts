/**
 * Calculate the next auction date based on current auction date and frequency
 * @param currentAuctionDate - The current/previous auction date
 * @param frequency - The auction frequency ('weekly', 'biweekly', 'monthly')
 * @returns The next auction date
 */
export function calculateNextAuctionDate(
    currentAuctionDate: Date,
    frequency: 'weekly' | 'biweekly' | 'monthly' | null
): Date {
    const nextDate = new Date(currentAuctionDate);
    
    switch (frequency) {
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



