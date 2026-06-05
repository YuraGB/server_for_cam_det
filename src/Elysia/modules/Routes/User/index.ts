import Elysia from "elysia";
import { authenticateRequest } from "../../Authentication";
import { setPermissionsToRedis, upsertShadowUser } from "./Service";
import { z } from "zod";

export const userRoutes = new Elysia({
  name: "UserSync",
  prefix: "/api/users",
})
  .derive(async ({ request, status }) => {
    const authResult = await authenticateRequest(request);
    if (!authResult.ok) {
      return status(401);
    }

    return { userId: authResult.auth.userId };
  })
  .post(
    "/sync",
    async ({ body, userId, status }) => {
      await upsertShadowUser({
        ...body,
      }).catch((error) => {
        console.error("Error upserting shadow user:", error);
      });

      await setPermissionsToRedis(userId, body.permissionsJson).catch(
        (error) => {
          console.error("Error setting permissions to Redis:", error);
        },
      );

      return status(200);
    },
    {
      body: z.object({
        id: z.string(),
        email: z.email(),
        name: z.string(),
        role: z.string().optional(),
        permissionsJson: z.array(z.string()),
        emailVerified: z.boolean().optional(),
        image: z.string().nullable().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    },
  );
