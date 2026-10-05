import { setTimeout as wait } from 'node:timers/promises'

// Exercise the real browser uploader without putting demo bytes in cloud storage.
// Only this isolated page receives the reserved, explicitly disclosed API fixtures.
// `failFirstUpload` rejects the first storage PUT to demonstrate the retry path.
export async function installUploadFixture(page, baseURL, { failFirstUpload = false } = {}) {
  let group,
    confirmedGroup,
    failedUploads = 0,
    receivedBytes = 0
  await page.route('**/api/v1/uploads/presigned-url', async (route) => {
    const body = route.request().postDataJSON()
    if (
      route.request().method() !== 'POST' ||
      !body.pipelineGroupId ||
      !body.contentType.startsWith('audio/')
    )
      throw Error('Unexpected tutorial upload request')
    group = body.pipelineGroupId
    await route.fulfill({
      json: {
        ok: true,
        data: {
          uploadId: 'd0c50000-0000-4000-8000-000000000901',
          uploadUrl: `${baseURL}/__tutorial-fixtures/upload`,
          s3Key: 'docs-capture/tutorial-recording.webm',
          tier: 'economy',
          pipelineGroupId: group,
          patientRecordId: body.patientRecordId,
          requiredHeaders: { 'Content-Type': body.contentType },
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    })
  })
  await page.route(`${baseURL}/__tutorial-fixtures/upload`, async (route) => {
    receivedBytes = route.request().postDataBuffer()?.length || 0
    if (route.request().method() !== 'PUT' || !receivedBytes)
      throw Error('Missing recorded demo bytes')
    await wait(700)
    if (failFirstUpload && !failedUploads) {
      failedUploads++
      receivedBytes = 0
      return route.fulfill({ status: 503, body: '' })
    }
    await route.fulfill({ status: 200, body: '' })
  })
  await page.route('**/api/v1/uploads/confirm-group', async (route) => {
    if (
      route.request().method() !== 'POST' ||
      !receivedBytes ||
      route.request().postDataJSON().pipelineGroupId !== group
    )
      throw Error('Invalid tutorial upload confirmation')
    confirmedGroup = group
    await wait(700)
    await route.fulfill({
      json: {
        ok: true,
        data: {
          transcriptionId: 'd0c50000-0000-4000-8000-000000000201',
          pipelineGroupId: group,
          fileCount: 1,
          status: 'queued',
          message: 'Processing started',
        },
      },
    })
  })
  return () => ({ receivedBytes, confirmedGroup, failedUploads })
}
