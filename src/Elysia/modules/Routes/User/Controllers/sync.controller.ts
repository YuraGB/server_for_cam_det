import z from "zod";
import { upsertShadowUser } from "../Services";
import { setPermissionsToRedis } from "@/Elysia/modules/infrastructure/cache/cache.service";

export const syncUserInputSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: z.string().optional(),
  permissionsJson: z.array(z.string()),
  emailVerified: z.boolean().optional(),
  image: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const syncUserController = async ({
  body,
  userId,
  status,
}: {
  body: z.infer<typeof syncUserInputSchema>;
  userId: string;
  status: (code: number) => void;
}) => {
  await upsertShadowUser({
    ...body,
  }).catch((error) => {
    console.error("Error upserting shadow user:", error);
  });

  await setPermissionsToRedis(userId, body.permissionsJson).catch((error) => {
    console.error("Error setting permissions to Redis:", error);
  });

  return status(200);
};
