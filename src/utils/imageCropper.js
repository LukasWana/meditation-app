/**
 * Utility pro ořezávání a úpravu obrázků pro pozadí aplikace
 */

/**
 * Zkontroluje, zda má obrázek minimální výšku 1080px
 * @param {File} file - Soubor obrázku
 * @returns {Promise<boolean>} - True pokud má minimální výšku
 */
export const validateImageHeight = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.height >= 1080);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };

    img.src = url;
  });
};

/**
 * Ořízne a upraví obrázek na minimální výšku 1080px
 * Zachová poměr stran, pokud je obrázek větší, ořízne ho center crop
 * @param {File} file - Soubor obrázku
 * @param {number} minHeight - Minimální výška (default 1080)
 * @param {number} maxWidth - Maximální šířka (optional)
 * @returns {Promise<string>} - Base64 URL upraveného obrázku
 */
export const cropAndResizeImage = (file, minHeight = 1080, maxWidth = null) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        let targetWidth = img.width;
        let targetHeight = img.height;

        // Pokud je výška menší než minimum, zvětšíme ji (ale nezměníme poměr stran)
        // Ve skutečnosti jen ořízneme větší obrázky
        if (sourceHeight >= minHeight) {
          // Ořízneme na střed (center crop)
          sourceY = (sourceHeight - minHeight) / 2;
          sourceHeight = minHeight;
          targetHeight = minHeight;
          targetWidth = (sourceWidth / img.height) * minHeight;

          // Pokud máme maxWidth a výsledná šířka je větší, ořízneme i šířku
          if (maxWidth && targetWidth > maxWidth) {
            const cropWidth = (targetWidth - maxWidth) / (targetWidth / sourceWidth);
            sourceX = (sourceWidth - cropWidth) / 2;
            sourceWidth = cropWidth;
            targetWidth = maxWidth;
          }
        } else {
          // Pokud je výška menší, necháme to být a jen zvětšíme
          // (ale obrázek už by měl být validován předtím)
          targetHeight = minHeight;
          targetWidth = (sourceWidth / sourceHeight) * minHeight;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Vykreslíme obrázek
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Komprese pro optimalizaci velikosti (kvalita 0.85)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Zjednodušená verze - ořízne obrázek s minimální výškou 1080px
 * Používá center crop
 * @param {File} file - Soubor obrázku
 * @returns {Promise<string>} - Base64 URL upraveného obrázku
 */
export const processImageForBackground = (file) => {
  return cropAndResizeImage(file, 1080, null);
};

