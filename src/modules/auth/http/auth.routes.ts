import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from '../domain/auth.service';
import { JwtAdapter } from '../infrastructure/jwt.adapter';
import { UsersRepository } from '../../users/infrastructure/users.repository';
// import { authRateLimit } from '../../../shared/middlewares/rate-limit.middleware';

const usersRepo = new UsersRepository();
const jwtAdapter = new JwtAdapter();
const service = new AuthService(usersRepo, jwtAdapter);
const ctrl = new AuthController(service);

const router = Router();

// router.post('/login',   authRateLimit, (req, res, next) => ctrl.login(req, res).catch(next));
// router.post('/refresh', authRateLimit, (req, res, next) => ctrl.refresh(req, res).catch(next));
// router.post('/logout',  authRateLimit, (req, res, next) => ctrl.logout(req, res).catch(next));

router.post('/login',   (req, res, next) => ctrl.login(req, res).catch(next));
router.post('/refresh', (req, res, next) => ctrl.refresh(req, res).catch(next));
router.post('/logout',  (req, res, next) => ctrl.logout(req, res).catch(next));

export default router;
