import Elysia from "elysia";
import { authenticateRequest } from "../../Authentication";
import {
  syncUserController,
  syncUserInputSchema,
} from "./Controllers/sync.controller";

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
  .post("/sync", syncUserController, {
    body: syncUserInputSchema,
  });
