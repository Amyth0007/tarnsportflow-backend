import { Router } from 'express';
import { requireOrgStaff } from '../../shared/middleware/orgContext';
import * as controller from './workspace.controller';

const router = Router();

router.use(requireOrgStaff);
router.get('/', controller.getWorkspace);
router.patch('/', controller.patchWorkspace);

export { router as workspaceRouter };
