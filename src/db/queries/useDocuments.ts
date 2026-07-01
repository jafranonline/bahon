import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@db/database'
import { softDeleteTrack } from '@db/tombstones'
import type { VehicleDocument } from '@/types'

export function useDocuments(vehicleId: string) {
  return useLiveQuery(
    () => db.documents.where('vehicleId').equals(vehicleId).sortBy('expiryDate'),
    [vehicleId]
  ) ?? []
}

export async function addDocument(
  data: Omit<VehicleDocument, 'id' | 'createdAt'>
): Promise<string> {
  const id = crypto.randomUUID()
  await db.documents.add({ ...data, id, createdAt: new Date().toISOString() })
  return id
}

export async function updateDocument(
  id: string,
  data: Partial<Omit<VehicleDocument, 'id' | 'createdAt'>>
): Promise<void> {
  await db.documents.update(id, data)
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id)
  await softDeleteTrack('documents', id)
}
