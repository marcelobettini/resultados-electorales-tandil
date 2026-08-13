// Setup para tests de integracion: requieren la BD MySQL local (MAMP, puerto 8889).
// Si la BD no esta disponible, los tests de integracion fallan explicitamente.
import { execSync } from "node:child_process";
import { beforeAll } from "vitest";

let dbUp = false;

function probeDb(): boolean {
  try {
    execSync(
      `node -e "const m=require('mysql2/promise');(async()=>{try{const c=await m.createConnection({host:'localhost',port:8889,user:'root',password:process.env.DB_PASSWORD||'root',database:'resultados_tandil'});await c.end();process.exit(0)}catch(e){process.exit(1)}})()"`,
      { stdio: "pipe" }
    );
    return true;
  } catch {
    return false;
  }
}

beforeAll(() => {
  dbUp = probeDb();
  if (!dbUp) {
    throw new Error(
      "BD MySQL local no disponible (localhost:8889). Iniciar MAMP antes de correr tests de integracion."
    );
  }
});
