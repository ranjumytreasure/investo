/**
 * Calculate billing charges based on group amount and selected features
 * @param groupAmount - The base amount for the group
 * @param features - Array of features with charge_percent
 * @returns Total billing charges amount
 */
export function calculateBillingCharges(
    groupAmount: number,
    features: Array<{ charge_percent: number }>
): number {
    const totalPercent = features.reduce((sum, feature) => sum + parseFloat(feature.charge_percent.toString()), 0);
    const charges = (groupAmount * totalPercent) / 100;
    return parseFloat(charges.toFixed(2));
}

/**
 * Calculate charge amount for a single feature
 * @param groupAmount - The base amount for the group
 * @param chargePercent - Percentage charge for the feature
 * @returns Charge amount for this feature
 */
export function calculateFeatureCharge(groupAmount: number, chargePercent: number): number {
    const charge = (groupAmount * parseFloat(chargePercent.toString())) / 100;
    return parseFloat(charge.toFixed(2));
}

