import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/orgContext';
import { requireSuperAdmin } from '../../shared/middleware/requireSuperAdmin';
import * as controller from './organization.controller';

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.get('/overview', controller.platformOverview);
router.get('/', controller.listOrgs);
router.get('/:id', controller.getOrg);
router.post('/', controller.createOrg);
router.patch('/:id', controller.updateOrg);
router.patch('/:id/disable', controller.disableOrg);
router.patch('/:id/enable', controller.enableOrg);

export { router as organizationRouter };
