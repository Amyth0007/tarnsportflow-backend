import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Organization, User, Vehicle, Driver, Route, Trip } from '../../shared/models';

export interface OrgDoc {
  _id: Types.ObjectId;
  name: string;
  orgType: 'gas' | 'school' | 'corporate' | 'generic';
  isActive: boolean;
  createdAt: Date;
}

export interface OrgAdminDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
}

export interface CreateOrgInput {
  name: string;
  orgType: OrgDoc['orgType'];
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Create a new organization and its first Org Admin in one call.
 * Returns both so the Super Admin panel can display the new admin's
 * credentials immediately.
 */
export async function createOrg(
  input: CreateOrgInput
): Promise<{ org: OrgDoc; admin: OrgAdminDoc }> {
  const existing = await User.findOne({ email: input.adminEmail }).lean();
  if (existing) {
    throw Object.assign(new Error('A user with that email already exists'), { status: 409 });
  }

  const org = await Organization.create({
    name: input.name,
    orgType: input.orgType,
    isActive: true,
  });

  const passwordHash = await bcrypt.hash(input.adminPassword, 10);
  const admin = await User.create({
    organizationId: org._id,
    name: input.adminName,
    email: input.adminEmail,
    passwordHash,
    role: 'org_admin',
  });

  return {
    org: org.toObject<OrgDoc>(),
    admin: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

export interface OrgStats {
  vehicles: number;
  drivers: number;
  routes: number;
  tripsLive: number;
  tripsScheduled: number;
  tripsCompleted: number;
}

export interface OrgListItem extends OrgDoc {
  stats: OrgStats;
}

export interface OrgDetail extends OrgDoc {
  stats: OrgStats;
  admins: { _id: Types.ObjectId; name: string; email: string; role: string; createdAt: Date }[];
}

export interface PlatformOverview {
  orgsTotal: number;
  orgsActive: number;
  orgsDisabled: number;
  tripsLive: number;
  tripsScheduled: number;
}

async function computeOrgStats(organizationId: Types.ObjectId | string): Promise<OrgStats> {
  const id = organizationId;
  const [vehicles, drivers, routes, tripsLive, tripsScheduled, tripsCompleted] = await Promise.all([
    Vehicle.countDocuments({ organizationId: id }),
    Driver.countDocuments({ organizationId: id, status: 'active' }),
    Route.countDocuments({ organizationId: id }),
    Trip.countDocuments({ organizationId: id, status: 'in_progress' }),
    Trip.countDocuments({ organizationId: id, status: 'scheduled' }),
    Trip.countDocuments({ organizationId: id, status: 'completed' }),
  ]);
  return { vehicles, drivers, routes, tripsLive, tripsScheduled, tripsCompleted };
}

/** List all organizations, newest first. */
export async function listOrgs(): Promise<OrgDoc[]> {
  return Organization.find().sort({ createdAt: -1 }).lean<OrgDoc[]>();
}

export async function listOrgsWithStats(): Promise<OrgListItem[]> {
  const orgs = await listOrgs();
  const withStats: OrgListItem[] = [];
  for (const org of orgs) {
    withStats.push({ ...org, stats: await computeOrgStats(org._id) });
  }
  return withStats;
}

export async function getOrgDetail(orgId: string): Promise<OrgDetail | null> {
  if (!Types.ObjectId.isValid(orgId)) return null;
  const org = await Organization.findById(orgId).lean<OrgDoc>();
  if (!org) return null;
  const [stats, admins] = await Promise.all([
    computeOrgStats(org._id),
    User.find({ organizationId: org._id, role: { $in: ['org_admin', 'manager'] } })
      .select('name email role createdAt')
      .sort({ createdAt: 1 })
      .lean(),
  ]);
  return {
    ...org,
    stats,
    admins: admins.map((a) => ({
      _id: a._id,
      name: a.name,
      email: a.email,
      role: a.role,
      createdAt: a.createdAt,
    })),
  };
}

export async function platformOverview(): Promise<PlatformOverview> {
  const [orgsTotal, orgsActive, tripsLive, tripsScheduled] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ isActive: true }),
    Trip.countDocuments({ status: 'in_progress' }),
    Trip.countDocuments({ status: 'scheduled' }),
  ]);
  return {
    orgsTotal,
    orgsActive,
    orgsDisabled: orgsTotal - orgsActive,
    tripsLive,
    tripsScheduled,
  };
}

export async function updateOrg(
  orgId: string,
  patch: { name?: string; orgType?: OrgDoc['orgType']; isActive?: boolean }
): Promise<OrgDoc | null> {
  if (!Types.ObjectId.isValid(orgId)) return null;
  const $set: Record<string, unknown> = {};
  if (typeof patch.name === 'string' && patch.name.trim()) $set.name = patch.name.trim();
  if (patch.orgType) $set.orgType = patch.orgType;
  if (typeof patch.isActive === 'boolean') $set.isActive = patch.isActive;
  if (Object.keys($set).length === 0) {
    return Organization.findById(orgId).lean<OrgDoc>();
  }
  return Organization.findByIdAndUpdate(orgId, { $set }, { new: true }).lean<OrgDoc>();
}

/**
 * Disable an organization by setting isActive: false.
 * Returns null if not found.
 */
export async function disableOrg(orgId: string): Promise<OrgDoc | null> {
  return updateOrg(orgId, { isActive: false });
}

export async function enableOrg(orgId: string): Promise<OrgDoc | null> {
  return updateOrg(orgId, { isActive: true });
}
