import { Organization, Vehicle, Driver, Route, Trip } from '../../shared/models';

export interface WorkspaceLiveTrip {
  _id: string;
  status: 'in_progress';
  scheduledAt: Date;
  routeName: string;
  vehicleNumber: string;
  driverName: string;
  publicTrackingToken: string;
}

export interface WorkspaceView {
  org: {
    _id: string;
    name: string;
    orgType: string;
    isActive: boolean;
  };
  counts: {
    vehicles: number;
    drivers: number;
    routes: number;
    tripsLive: number;
    tripsScheduled: number;
    tripsCompleted: number;
  };
  liveTrips: WorkspaceLiveTrip[];
}

export async function getWorkspace(organizationId: string): Promise<WorkspaceView | null> {
  const org = await Organization.findById(organizationId).lean();
  if (!org) return null;

  const [vehicles, drivers, routes, tripsLive, tripsScheduled, tripsCompleted, liveDocs] =
    await Promise.all([
      Vehicle.countDocuments({ organizationId, status: 'active' }),
      Driver.countDocuments({ organizationId, status: 'active' }),
      Route.countDocuments({ organizationId }),
      Trip.countDocuments({ organizationId, status: 'in_progress' }),
      Trip.countDocuments({ organizationId, status: 'scheduled' }),
      Trip.countDocuments({ organizationId, status: 'completed' }),
      Trip.find({ organizationId, status: 'in_progress' }).sort({ startedAt: -1 }).limit(12).lean(),
    ]);

  const routeIds = liveDocs.map((t) => t.routeId);
  const vehicleIds = liveDocs.map((t) => t.vehicleId);
  const driverIds = liveDocs.map((t) => t.driverId);

  const [routeDocs, vehicleDocs, driverDocs] = await Promise.all([
    Route.find({ _id: { $in: routeIds } }).lean(),
    Vehicle.find({ _id: { $in: vehicleIds } }).lean(),
    Driver.find({ _id: { $in: driverIds } }).lean(),
  ]);

  const routeById = new Map(routeDocs.map((r) => [r._id.toString(), r]));
  const vehicleById = new Map(vehicleDocs.map((v) => [v._id.toString(), v]));
  const driverById = new Map(driverDocs.map((d) => [d._id.toString(), d]));

  return {
    org: {
      _id: org._id.toString(),
      name: org.name,
      orgType: org.orgType,
      isActive: org.isActive,
    },
    counts: { vehicles, drivers, routes, tripsLive, tripsScheduled, tripsCompleted },
    liveTrips: liveDocs.map((t) => ({
      _id: t._id.toString(),
      status: 'in_progress' as const,
      scheduledAt: t.scheduledAt,
      routeName: routeById.get(t.routeId.toString())?.name ?? '—',
      vehicleNumber: vehicleById.get(t.vehicleId.toString())?.vehicleNumber ?? '—',
      driverName: driverById.get(t.driverId.toString())?.name ?? '—',
      publicTrackingToken: t.publicTrackingToken,
    })),
  };
}

export async function renameOrg(organizationId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error('name is required'), { status: 400 });
  }
  return Organization.findByIdAndUpdate(
    organizationId,
    { $set: { name: trimmed } },
    { new: true }
  ).lean();
}
