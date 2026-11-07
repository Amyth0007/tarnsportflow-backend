import { Request, Response } from 'express';
import * as workspaceService from './workspace.service';

export async function getWorkspace(req: Request, res: Response): Promise<void> {
  const data = await workspaceService.getWorkspace(req.org.organizationId);
  if (!data) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({ data });
}

export async function patchWorkspace(req: Request, res: Response): Promise<void> {
  if (req.user.role !== 'org_admin') {
    res.status(403).json({ error: 'Only org admins can update organization settings' });
    return;
  }
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  try {
    const org = await workspaceService.renameOrg(req.org.organizationId, name);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json({ data: { name: org.name, orgType: org.orgType, isActive: org.isActive } });
  } catch (error: any) {
    const status = error.status ?? 500;
    res.status(status).json({ error: error.message ?? 'Internal server error' });
  }
}
