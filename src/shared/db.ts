import mongoose from 'mongoose';

function mongoHost(uri: string): string {
  try {
    return new URL(uri.replace(/^mongodb\+srv/, 'https')).host;
  } catch {
    return '(unparseable URI)';
  }
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Put it in backend/.env (see .env.example).');
  }

  try {
    await mongoose.connect(uri);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'ENOTFOUND' || String(err).includes('querySrv')) {
      throw new Error(
        `Atlas host ${mongoHost(uri)} does not resolve (querySrv ENOTFOUND). ` +
          'In MongoDB Atlas: Cluster → Connect → Drivers, copy a new URI into backend/.env. ' +
          'The cluster may be paused, deleted, or the hostname may be wrong.'
      );
    }
    throw err;
  }
  console.log(`MongoDB connected: ${mongoose.connection.host} (from ${mongoHost(uri)})`);
}
