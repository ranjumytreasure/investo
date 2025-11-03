import { Express } from 'express';
import { Config } from '../models/Config';
import { FeatureConfig } from '../models/FeatureConfig';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

export function registerAdminRoutes(app: Express) {
    app.get('/admin/config', async (_req, res) => {
        const commission = await Config.findByPk('commission_percent');
        const starter = await Config.findByPk('starter_discount_percent');
        return res.json({
            commission_percent: commission?.value ?? '5',
            starter_discount_percent: starter?.value ?? '1'
        });
    });

    app.post('/admin/config', async (req, res) => {
        const { commission_percent, starter_discount_percent } = req.body as any;
        if (commission_percent !== undefined) await Config.upsert({ key: 'commission_percent', value: String(commission_percent) });
        if (starter_discount_percent !== undefined) await Config.upsert({ key: 'starter_discount_percent', value: String(starter_discount_percent) });
        return res.json({ ok: true });
    });

    // Feature Management Routes

    // Get all configurable features (public for now, can be restricted later)
    app.get('/admin/features', async (_req, res) => {
        try {
            const features = await FeatureConfig.findAll({
                order: [['created_at', 'DESC']]
            });
            return res.json(features);
        } catch (error: any) {
            console.error('Error fetching features:', error);
            return res.status(400).json({
                message: error.message || 'Failed to fetch features'
            });
        }
    });

    // Create new feature configuration (admin only)
    app.post('/admin/features', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
        try {
            const { name, description, charge_percent, created_by } = req.body as {
                name: string;
                description?: string;
                charge_percent: number;
                created_by?: string;
            };

            if (!name || charge_percent === undefined) {
                return res.status(400).json({
                    message: 'Name and charge_percent are required'
                });
            }

            if (charge_percent < 0 || charge_percent > 100) {
                return res.status(400).json({
                    message: 'Charge percent must be between 0 and 100'
                });
            }

            const feature = await FeatureConfig.create({
                name: name.trim(),
                description: description?.trim() || null,
                charge_percent: parseFloat(charge_percent.toString()),
                is_active: true,
                created_by: req.user?.id || null
            });

            return res.json(feature);
        } catch (error: any) {
            console.error('Error creating feature:', error);
            return res.status(400).json({
                message: error.message || 'Failed to create feature'
            });
        }
    });

    // Update feature configuration (admin only)
    app.put('/admin/features/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
        try {
            const { id } = req.params;
            const { name, description, charge_percent, is_active, updated_by } = req.body as {
                name?: string;
                description?: string;
                charge_percent?: number;
                is_active?: boolean;
                updated_by?: string;
            };

            const feature = await FeatureConfig.findByPk(id);
            if (!feature) {
                return res.status(404).json({ message: 'Feature not found' });
            }

            if (name !== undefined) feature.name = name.trim();
            if (description !== undefined) feature.description = description?.trim() || null;
            if (charge_percent !== undefined) {
                if (charge_percent < 0 || charge_percent > 100) {
                    return res.status(400).json({
                        message: 'Charge percent must be between 0 and 100'
                    });
                }
                feature.charge_percent = parseFloat(charge_percent.toString());
            }
            if (is_active !== undefined) feature.is_active = is_active;
            feature.updated_by = req.user?.id || null;
            feature.updated_at = new Date();

            await feature.save();
            return res.json(feature);
        } catch (error: any) {
            console.error('Error updating feature:', error);
            return res.status(400).json({
                message: error.message || 'Failed to update feature'
            });
        }
    });

    // Delete feature configuration (admin only)
    app.delete('/admin/features/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
        try {
            const { id } = req.params;
            const feature = await FeatureConfig.findByPk(id);
            if (!feature) {
                return res.status(404).json({ message: 'Feature not found' });
            }

            await feature.destroy();
            return res.json({ message: 'Feature deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting feature:', error);
            return res.status(400).json({
                message: error.message || 'Failed to delete feature'
            });
        }
    });
}




