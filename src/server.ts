/**
 * "app" can be changed to Fastly (exaьple) 
 * if we want to switch to nodejs against Elysia,
 *  but for now we will use Elysia 
 * as it is more modern and faster than nodejs
**/
import { SERVER_PORT } from "./constants"
import app from "./Elysia/imdex" 
import { startGRPCStream } from "./grpc"

// ------------------------------
// Запуск сервера
// ------------------------------
app.listen(SERVER_PORT, () => {
  console.log(`[WS] Сервер запущено на порту ${SERVER_PORT}`)
  
  // ------------------------------
  // Після запуску WS стартуємо gRPC стрім
  // ------------------------------
 startGRPCStream()
})