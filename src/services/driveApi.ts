import { GoogleHttpError } from './googleAuth'
import { googleRequest } from './googleHttp'

const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
// The app's single backup file, in the hidden per-app folder (scope `drive.appdata`).
export const STATE_FILE = 'state.json'

/** Id of the backup file, or null when this account has none yet. */
export const findStateFile = async (token: string): Promise<string | null> => {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${STATE_FILE}' and trashed = false`,
    fields: 'files(id, modifiedTime)',
    orderBy: 'modifiedTime desc',
  })
  const { data } = await googleRequest<{ files?: { id: string }[] }>(
    token,
    'drive.files.list',
    `${FILES}?${params.toString()}`,
  )
  return data?.files?.[0]?.id ?? null
}

export const downloadJson = async (token: string, fileId: string): Promise<unknown> => {
  const { data } = await googleRequest<unknown>(
    token,
    'drive.files.get',
    `${FILES}/${encodeURIComponent(fileId)}?alt=media`,
  )
  return data
}

/** Writes the content; creates the file first when `fileId` is null. Returns the file id. */
export const uploadJson = async (
  token: string,
  fileId: string | null,
  content: unknown,
): Promise<string> => {
  let id = fileId
  if (!id) {
    const { data } = await googleRequest<{ id: string }>(
      token,
      'drive.files.create',
      `${FILES}?fields=id`,
      {
        method: 'POST',
        body: { name: STATE_FILE, parents: ['appDataFolder'], mimeType: 'application/json' },
      },
    )
    if (!data?.id) throw new GoogleHttpError(500, 'drive.files.create')
    id = data.id
  }
  await googleRequest(
    token,
    'drive.files.update',
    `${UPLOAD}/${encodeURIComponent(id)}?uploadType=media`,
    {
      method: 'PATCH',
      body: JSON.stringify(content),
    },
  )
  return id
}

export const deleteFile = async (token: string, fileId: string): Promise<void> => {
  try {
    await googleRequest(token, 'drive.files.delete', `${FILES}/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    })
  } catch (e) {
    if (!(e instanceof GoogleHttpError && e.status === 404)) throw e
  }
}
