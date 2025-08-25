import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { protect, authorize } from '@ecommerce/shared';

export const userRoutes = (userController: UserController): Router => {
    const router = Router();

    // Public routes
    router.post('/register', userController.register);
    router.post('/login', userController.login);

    // Protected routes (require authentication)
    router.use(protect);

    // User profile routes
    router.get('/profile', userController.getProfile);
    router.put('/profile', userController.updateProfile);
    router.put('/change-password', userController.changePassword);

    // Address routes
    router.get('/addresses', userController.getAddresses);
    router.post('/addresses', userController.addAddress);
    router.put('/addresses/:addressId', userController.updateAddress);
    router.delete('/addresses/:addressId', userController.removeAddress);

    // Admin routes (require admin role)
    router.use(authorize('admin'));

    router.get('/', userController.getAllUsers);
    router.get('/search', userController.searchUsers);
    router.get('/:id', userController.getUserById);
    router.put('/:id/deactivate', userController.deactivateUser);
    router.put('/:id/reactivate', userController.reactivateUser);

    return router;
};
