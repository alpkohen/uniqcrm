import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { readDealAttachment } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const attachment = await prisma.dealAttachment.findUnique({ where: { id } });
  if (!attachment) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const buffer = await readDealAttachment(attachment.dealId, attachment.storedName);
  if (!buffer) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.fileType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
    },
  });
}
