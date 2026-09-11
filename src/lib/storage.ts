import "server-only";

import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

function attachmentStore() {
  return getStore("deal-attachments");
}

export async function saveDealAttachment(dealId: string, file: File) {
  const storedName = `${randomUUID()}-${file.name}`;
  const buffer = await file.arrayBuffer();
  await attachmentStore().set(`${dealId}/${storedName}`, buffer);
  return storedName;
}

export async function readDealAttachment(dealId: string, storedName: string) {
  const data = await attachmentStore().get(`${dealId}/${storedName}`, { type: "arrayBuffer" });
  return data ? Buffer.from(data) : null;
}

export async function deleteDealAttachmentFile(dealId: string, storedName: string) {
  await attachmentStore().delete(`${dealId}/${storedName}`);
}
