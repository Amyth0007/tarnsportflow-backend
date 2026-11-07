import { Request, Response } from 'express';
import * as orgService from './organization.service';
import type { CreateOrgInput } from './organization.service';
import type { OrgDoc } from './organization.service';

function handleError(res: Response, error: any): void {
  const status = error.status ?? 500;
  res.status(status).json({ error: error.message ?? 'Internal server error' });
}

export async function platformOverview(_req: Request, res: Response): Promise<void> {
  const data = await orgService.platformOverview();
  res.json({ data });
}

export async function createOrg(req: Request, res: Response): Promise<void> {
  const { name, orgType, adminName, adminEmail, adminPassword } =
    req.body as Partial<CreateOrgInput>;

  if (!name || !orgType || !adminName || !adminEmail || !adminPassword) {
    res.status(400).json({
      error: 'name, orgType, adminName, adminEmail, and adminPassword are required',
    });
    return;
  }

  try {
    const result = await orgService.createOrg({
      name,
      orgType,
      adminName,
      adminEmail,
      adminPassword,
    });
    res.status(201).json({ data: result });
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function listOrgs(_req: Request, res: Response): Promise<void> {
  const orgs = await orgService.listOrgsWithStats();
  res.json({ data: orgs });
}

export async function getOrg(req: Request, res: Response): Promise<void> {
  const org = await orgService.getOrgDetail(req.params.id);
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({ data: org });
}

export async function updateOrg(req: Request, res: Response): Promise<void> {
  const { name, orgType, isActive } = req.body as {
    name?: string;
    orgType?: OrgDoc['orgType'];
    isActive?: boolean;
  };
  const org = await orgService.updateOrg(req.params.id, { name, orgType, isActive });
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({ data: org });
}

export async function disableOrg(req: Request, res: Response): Promise<void> {
  const org = await orgService.disableOrg(req.params.id);
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({ data: org });
}

export async function enableOrg(req: Request, res: Response): Promise<void> {
  const org = await orgService.enableOrg(req.params.id);
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({ data: org });
}
