const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializuj Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.downloadProxy = functions.https.onRequest(async (req, res) => {
    try {
      // Povol CORS
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
      }

      const { filePath } = req.query;

      if (!filePath) {
        res.status(400).json({ error: 'File path is required' });
        return;
      }

      console.log(`Downloading file: ${filePath}`);

      // Získej storage bucket
      const bucket = admin.storage().bucket();

      // Získej soubor
      const file = bucket.file(filePath);

      // Zkontroluj, jestli soubor existuje
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Získej metadata souboru
      const [metadata] = await file.getMetadata();

      // Nastav správné headers
      res.set('Content-Type', metadata.contentType || 'audio/mpeg');
      res.set('Content-Length', metadata.size);
      res.set('Cache-Control', 'max-age=31536000');

      // Streamuj soubor
      const stream = file.createReadStream();

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error' });
        }
      });

      stream.pipe(res);

    } catch (error) {
      console.error('Download proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);
