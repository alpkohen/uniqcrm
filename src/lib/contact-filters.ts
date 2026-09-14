import type { Prisma } from "@prisma/client";

export function buildContactWhere({
  q,
  tag,
  owner,
}: {
  q: string;
  tag: string;
  owner: string;
}): Prisma.ContactWhereInput {
  return {
    AND: [
      q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { title: { contains: q } },
              { company: { name: { contains: q } } },
            ],
          }
        : {},
      tag ? { tags: { some: { tagId: tag } } } : {},
      owner ? { ownerId: owner } : {},
    ],
  };
}
