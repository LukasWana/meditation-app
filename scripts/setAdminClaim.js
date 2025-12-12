// Spuštění: FIREBASE_PROJECT_ID=... GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node scripts/setAdminClaim.js qwanap@gmail.com
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Použití: node scripts/setAdminClaim.js <email>');
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId) {
    console.error('Chybí FIREBASE_PROJECT_ID');
    process.exit(1);
  }

  let credential;
  if (saPath && fs.existsSync(saPath)) {
    credential = cert(saPath);
  } else {
    credential = applicationDefault();
  }

  initializeApp({ credential, projectId });

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);

  await auth.setCustomUserClaims(user.uid, { admin: true });
  await auth.revokeRefreshTokens(user.uid);

  console.log(`✅ Admin claim nastaven pro ${email}. Uživatel se musí znovu přihlásit.`);
}

main().catch((err) => {
  console.error('❌ Nastavení claimu selhalo:', err);
  process.exit(1);
});

