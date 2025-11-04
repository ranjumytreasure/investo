import { Express } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { UserAddress } from '../models/Address';

export function registerProfileRoutes(app: Express) {
    // Get current user profile
    app.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const user = await User.findByPk(req.user.id, {
                attributes: ['id', 'name', 'phone', 'email', 'status', 'kyc_verified', 'face_scan_url', 'aadhar_masked', 'passport_masked', 'created_at', 'updated_at']
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get user addresses
            const addresses = await UserAddress.findAll({
                where: { user_id: req.user.id },
                order: [['created_at', 'DESC']]
            });

            return res.json({
                user: user.toJSON(),
                addresses: addresses.map(addr => addr.toJSON())
            });
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            return res.status(500).json({ message: error.message || 'Failed to fetch profile' });
        }
    });

    // Update user profile
    app.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { name, email } = req.body as { name?: string; email?: string };

            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Update fields
            if (name !== undefined) user.name = name;
            if (email !== undefined) user.email = email;
            user.updated_by = req.user.id;
            user.updated_at = new Date();

            await user.save();

            return res.json({
                message: 'Profile updated successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    status: user.status,
                    kyc_verified: user.kyc_verified,
                    face_scan_url: user.face_scan_url,
                    aadhar_masked: user.aadhar_masked,
                    passport_masked: user.passport_masked,
                    updated_at: user.updated_at
                }
            });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            return res.status(500).json({ message: error.message || 'Failed to update profile' });
        }
    });

    // Create address
    app.post('/profile/addresses', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const {
                address_type,
                address_line1,
                address_line2,
                landmark,
                city,
                state,
                country,
                pincode,
                latitude,
                longitude,
                proof_type,
                proof_document_url
            } = req.body;

            const address = await UserAddress.create({
                user_id: req.user.id,
                address_type: address_type || 'home',
                address_line1: address_line1 || null,
                address_line2: address_line2 || null,
                landmark: landmark || null,
                city: city || null,
                state: state || null,
                country: country || 'India',
                pincode: pincode || null,
                latitude: latitude || null,
                longitude: longitude || null,
                proof_type: proof_type || null,
                proof_document_url: proof_document_url || null,
                verified: false,
                created_by: req.user.id,
                updated_by: req.user.id
            });

            return res.status(201).json({
                message: 'Address created successfully',
                address: address.toJSON()
            });
        } catch (error: any) {
            console.error('Error creating address:', error);
            return res.status(500).json({ message: error.message || 'Failed to create address' });
        }
    });

    // Update address
    app.put('/profile/addresses/:id', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { id } = req.params;
            const address = await UserAddress.findOne({
                where: { id, user_id: req.user.id }
            });

            if (!address) {
                return res.status(404).json({ message: 'Address not found' });
            }

            const {
                address_type,
                address_line1,
                address_line2,
                landmark,
                city,
                state,
                country,
                pincode,
                latitude,
                longitude,
                proof_type,
                proof_document_url
            } = req.body;

            // Update fields
            if (address_type !== undefined) address.address_type = address_type;
            if (address_line1 !== undefined) address.address_line1 = address_line1;
            if (address_line2 !== undefined) address.address_line2 = address_line2;
            if (landmark !== undefined) address.landmark = landmark;
            if (city !== undefined) address.city = city;
            if (state !== undefined) address.state = state;
            if (country !== undefined) address.country = country;
            if (pincode !== undefined) address.pincode = pincode;
            if (latitude !== undefined) address.latitude = latitude;
            if (longitude !== undefined) address.longitude = longitude;
            if (proof_type !== undefined) address.proof_type = proof_type;
            if (proof_document_url !== undefined) address.proof_document_url = proof_document_url;
            address.updated_by = req.user.id;
            address.updated_at = new Date();

            await address.save();

            return res.json({
                message: 'Address updated successfully',
                address: address.toJSON()
            });
        } catch (error: any) {
            console.error('Error updating address:', error);
            return res.status(500).json({ message: error.message || 'Failed to update address' });
        }
    });

    // Delete address
    app.delete('/profile/addresses/:id', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { id } = req.params;
            const address = await UserAddress.findOne({
                where: { id, user_id: req.user.id }
            });

            if (!address) {
                return res.status(404).json({ message: 'Address not found' });
            }

            await address.destroy();

            return res.json({ message: 'Address deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting address:', error);
            return res.status(500).json({ message: error.message || 'Failed to delete address' });
        }
    });

    // Delete user account
    app.delete('/profile', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Delete all addresses first
            await UserAddress.destroy({ where: { user_id: req.user.id } });

            // Delete user
            await user.destroy();

            return res.json({ message: 'Account deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting account:', error);
            return res.status(500).json({ message: error.message || 'Failed to delete account' });
        }
    });
}

