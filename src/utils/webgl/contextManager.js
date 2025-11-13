/**
 * WebGL Context Manager
 * Správné správa WebGL kontextů - prevence "Too many active WebGL contexts"
 */

import { shouldDisableAntialiasing, isAndroid } from '@utils/deviceDetection';

// Globální registry aktivních kontextů
const activeContexts = new WeakMap();
const contextRegistry = new Set();

const MAX_CONTEXTS_PER_SECOND = 4; // Maximálně 4 kontexty za sekundu
let contextsCreatedThisSecond = 0;
let lastSecondStart = Date.now();

/**
 * Získá nebo vytvoří WebGL kontext s kontrolou limitu
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Možnosti kontextu
 * @returns {WebGLRenderingContext|WebGL2RenderingContext|null} WebGL kontext nebo null
 */
export function getWebGLContext(canvas, options = {}) {
  if (!canvas) {
    console.warn('⚠️ getWebGLContext: Canvas není k dispozici');
    return null;
  }

  // Zkontroluj, zda už má canvas kontext
  const existingContext = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (existingContext) {
    // Pokud už má kontext, vrať ho
    if (!activeContexts.has(existingContext)) {
      activeContexts.set(existingContext, {
        canvas,
        createdAt: Date.now(),
        type: existingContext instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
        lastUsed: Date.now()
      });
      contextRegistry.add(existingContext);
    } else {
      // Aktualizuj lastUsed
      const contextInfo = activeContexts.get(existingContext);
      if (contextInfo) {
        contextInfo.lastUsed = Date.now();
      }
    }
    return existingContext;
  }

  // Debouncing: zkontroluj, zda můžeme vytvořit kontext
  const now = Date.now();
  if (now - lastSecondStart >= 1000) {
    // Nová sekunda - resetuj počítadlo
    contextsCreatedThisSecond = 0;
    lastSecondStart = now;
  }

  if (contextsCreatedThisSecond >= MAX_CONTEXTS_PER_SECOND) {
    // Příliš mnoho kontextů za sekundu - počkej
    console.warn(`⚠️ getWebGLContext: Příliš mnoho kontextů za sekundu (${contextsCreatedThisSecond}). Čekám...`);
    // Vrať null a nech komponentu to zkusit později
    return null;
  }

  // Zkontroluj limit aktivních kontextů (sníženo na 2 pro lepší stabilitu)
  const maxContexts = options.maxContexts || 2;
  if (contextRegistry.size >= maxContexts) {
    console.warn(`⚠️ getWebGLContext: Dosáhl limitu ${maxContexts} aktivních kontextů. Okamžitě uvolním nejstarší kontext.`);
    // Okamžité uvolnění nejstaršího kontextu při překročení limitu
    const contextsToRelease = [];
    contextRegistry.forEach((glContext) => {
      const contextInfo = activeContexts.get(glContext);
      if (contextInfo) {
        contextsToRelease.push({ context: glContext, age: Date.now() - (contextInfo.lastUsed || contextInfo.createdAt) });
      }
    });

    // Seřaď podle stáří (nejstarší první)
    contextsToRelease.sort((a, b) => b.age - a.age);

    // Uvolni nejstarší kontext
    if (contextsToRelease.length > 0) {
      releaseWebGLContext(contextsToRelease[0].context);
    }

    // Pokud stále překračujeme limit, zkus vyčistit všechny neaktivní kontexty
    if (contextRegistry.size >= maxContexts) {
      console.warn(`⚠️ getWebGLContext: Stále překračujeme limit. Pokusím se vyčistit všechny neaktivní kontexty.`);
      cleanupInactiveContexts(0); // Vyčisti všechny neaktivní kontexty
    }

    // Pokud stále překračujeme limit, vrať null
    if (contextRegistry.size >= maxContexts) {
      console.error('❌ getWebGLContext: Nelze vytvořit nový kontext - limit překročen');
      return null;
    }
  }

  // Optimalizace pro Android
  const isAndroidDevice = isAndroid();
  const disableAntialiasing = shouldDisableAntialiasing();

  // Zkus vytvořit WebGL 2.0 kontext
  let glContext = canvas.getContext('webgl2', {
    alpha: options.alpha !== false,
    antialias: options.antialias !== false && !disableAntialiasing,
    depth: options.depth !== false,
    stencil: options.stencil !== false,
    preserveDrawingBuffer: options.preserveDrawingBuffer || false,
    powerPreference: options.powerPreference || (isAndroidDevice ? 'low-power' : 'default'),
    failIfMajorPerformanceCaveat: options.failIfMajorPerformanceCaveat !== undefined ? options.failIfMajorPerformanceCaveat : isAndroidDevice
  });

  const isWebGL2 = !!glContext;

  // Pokud WebGL 2.0 není dostupné, zkus WebGL 1.0
  if (!glContext) {
    glContext = canvas.getContext('webgl', {
      alpha: options.alpha !== false,
      antialias: options.antialias !== false && !disableAntialiasing,
      depth: options.depth !== false,
      stencil: options.stencil !== false,
      preserveDrawingBuffer: options.preserveDrawingBuffer || false,
      powerPreference: options.powerPreference || (isAndroidDevice ? 'low-power' : 'default'),
      failIfMajorPerformanceCaveat: options.failIfMajorPerformanceCaveat !== undefined ? options.failIfMajorPerformanceCaveat : isAndroidDevice
    }) || canvas.getContext('experimental-webgl', {
      alpha: options.alpha !== false,
      antialias: options.antialias !== false && !disableAntialiasing,
      depth: options.depth !== false,
      stencil: options.stencil !== false,
      preserveDrawingBuffer: options.preserveDrawingBuffer || false,
      powerPreference: options.powerPreference || (isAndroidDevice ? 'low-power' : 'default'),
      failIfMajorPerformanceCaveat: options.failIfMajorPerformanceCaveat !== undefined ? options.failIfMajorPerformanceCaveat : isAndroidDevice
    });
  }

  if (!glContext) {
    console.warn('⚠️ getWebGLContext: WebGL není podporován');
    return null;
  }

  // Zaregistruj kontext
  activeContexts.set(glContext, {
    canvas,
    createdAt: Date.now(),
    type: isWebGL2 ? 'webgl2' : 'webgl',
    lastUsed: Date.now()
  });
  contextRegistry.add(glContext);

  // Aktualizuj počítadlo kontextů za sekundu
  contextsCreatedThisSecond++;

  // Přidej event listenery pro detekci ztráty kontextu
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('⚠️ WebGL context lost:', canvas);
    handleContextLost(glContext);
  });

  canvas.addEventListener('webglcontextrestored', () => {
    console.log('✅ WebGL context restored:', canvas);
    handleContextRestored(glContext);
  });

  return glContext;
}

/**
 * Uvolní WebGL kontext
 * @param {WebGLRenderingContext|WebGL2RenderingContext} glContext - WebGL kontext
 */
export function releaseWebGLContext(glContext) {
  if (!glContext) return;

  const contextInfo = activeContexts.get(glContext);
  if (!contextInfo) {
    console.warn('⚠️ releaseWebGLContext: Kontext není v registru');
    return;
  }

  // Odstraň z registru
  contextRegistry.delete(glContext);
  activeContexts.delete(glContext);

  // Zkus získat canvas a zrušit kontext
  const canvas = contextInfo.canvas;
  if (canvas) {
    // WebGL kontexty se automaticky uvolní, když se canvas odstraní z DOM
    // Ale můžeme explicitně zrušit kontext pomocí getExtension('WEBGL_lose_context')
    try {
      const loseContext = glContext.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    } catch (error) {
      console.warn('⚠️ releaseWebGLContext: Nelze explicitně zrušit kontext:', error);
    }
  }

  console.log('✅ WebGL context released');
}

/**
 * Vyčistí neaktivní kontexty (starší než 8 sekund)
 * @param {number} maxAge - Maximální stáří kontextu v ms (default: 8 sekund)
 */
export function cleanupInactiveContexts(maxAge = 2 * 1000) {
  const now = Date.now();
  const contextsToRemove = [];

  contextRegistry.forEach((glContext) => {
    const contextInfo = activeContexts.get(glContext);
    if (!contextInfo) {
      contextsToRemove.push({ context: glContext, priority: 1, age: Infinity });
      return;
    }

    // Priorita 1: Zkontroluj, zda je kontext ztracen
    if (glContext.isContextLost && glContext.isContextLost()) {
      contextsToRemove.push({ context: glContext, priority: 1, age: Infinity });
      return;
    }

    // Priorita 2: Zkontroluj, zda je canvas stále v DOM
    const canvas = contextInfo.canvas;
    if (canvas && !canvas.parentNode) {
      // Canvas byl odstraněn z DOM - uvolni kontext
      contextsToRemove.push({ context: glContext, priority: 2, age: Infinity });
      return;
    }

    // Zkontroluj, zda je kontext starší než maxAge
    // Ale pouze pokud není aktivně používán (lastUsed je starší než maxAge)
    const age = now - (contextInfo.lastUsed || contextInfo.createdAt);
    const timeSinceCreated = now - contextInfo.createdAt;

    // Priorita 3-5: Uvolni kontext pouze pokud:
    // 3. Nebyl použit déle než 5 sekund (zvýšeno z 1 sekundy pro stabilitu)
    // 4. Je starší než maxAge A nebyl použit dlouho
    // 5. Je velmi starý (více než 30 sekund) bez ohledu na lastUsed
    if (age > 5 * 1000 && timeSinceCreated > 5 * 1000) {
      // Uvolnění neaktivních kontextů (starší než 5 sekund)
      contextsToRemove.push({ context: glContext, priority: 3, age });
    } else if (age > maxAge && timeSinceCreated > maxAge * 2) {
      contextsToRemove.push({ context: glContext, priority: 4, age });
    } else if (timeSinceCreated > 30 * 1000 && age > maxAge) {
      // Velmi starý kontext, který nebyl dlouho používán (zvýšeno z 10 na 30 sekund)
      contextsToRemove.push({ context: glContext, priority: 5, age });
    }
  });

  // Seřaď kontexty podle priority (nižší číslo = vyšší priorita)
  contextsToRemove.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Pokud mají stejnou prioritu, seřaď podle stáří (starší = vyšší priorita)
    return b.age - a.age;
  });

  // Převést zpět na pole kontextů
  const contextsToRelease = contextsToRemove.map(item => item.context);

  contextsToRelease.forEach((glContext) => {
    releaseWebGLContext(glContext);
  });

  if (contextsToRelease.length > 0) {
    console.log(`🧹 cleanupInactiveContexts: Vyčištěno ${contextsToRelease.length} neaktivních kontextů`);
  }
}

/**
 * Zpracuje ztrátu kontextu
 * @param {WebGLRenderingContext|WebGL2RenderingContext} glContext - WebGL kontext
 */
function handleContextLost(glContext) {
  const contextInfo = activeContexts.get(glContext);
  if (contextInfo) {
    console.warn('⚠️ handleContextLost: Kontext byl ztracen', contextInfo);
    contextInfo.lost = true;
    contextInfo.lostAt = Date.now();
    // Okamžitě uvolni kontext
    releaseWebGLContext(glContext);
  } else {
    // Pokud není v registru, zkus ho uvolnit přímo
    if (contextRegistry.has(glContext)) {
      contextRegistry.delete(glContext);
    }
  }
}

/**
 * Zpracuje obnovení kontextu
 * @param {WebGLRenderingContext|WebGL2RenderingContext} glContext - WebGL kontext
 */
function handleContextRestored(glContext) {
  const contextInfo = activeContexts.get(glContext);
  if (contextInfo) {
    console.log('✅ WebGL context restored:', glContext);
    contextInfo.lost = false;
    contextInfo.restoredAt = Date.now();
    contextInfo.lastUsed = Date.now();

    // Znovu zaregistruj kontext, pokud není v registru
    if (!contextRegistry.has(glContext)) {
      contextRegistry.add(glContext);
    }
  }
}

/**
 * Retry mechanismus pro ztracené kontexty
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Možnosti kontextu
 * @param {number} maxRetries - Maximální počet pokusů (default: 3)
 * @param {number} retryDelay - Zpoždění mezi pokusy v ms (default: 1000)
 * @returns {Promise<WebGLRenderingContext|WebGL2RenderingContext|null>} WebGL kontext nebo null
 */
export async function getWebGLContextWithRetry(canvas, options = {}, maxRetries = 3, retryDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const context = getWebGLContext(canvas, options);
    if (context && !context.isContextLost()) {
      return context;
    }

    if (attempt < maxRetries - 1) {
      console.warn(`⚠️ getWebGLContextWithRetry: Pokus ${attempt + 1} selhal, zkouším znovu za ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Exponenciální backoff
      retryDelay *= 1.5;
    }
  }

  console.error(`❌ getWebGLContextWithRetry: Všechny ${maxRetries} pokusy selhaly`);
  return null;
}

/**
 * Aktualizuje čas posledního použití kontextu
 * @param {WebGLRenderingContext|WebGL2RenderingContext} glContext - WebGL kontext
 */
export function updateContextUsage(glContext) {
  const contextInfo = activeContexts.get(glContext);
  if (contextInfo) {
    contextInfo.lastUsed = Date.now();
  }
}

/**
 * Získá informace o aktivních kontextech (pro debugging)
 * @returns {Array<Object>} Informace o kontextech
 */
export function getActiveContextsInfo() {
  const info = [];
  contextRegistry.forEach((glContext) => {
    const contextInfo = activeContexts.get(glContext);
    if (contextInfo) {
      info.push({
        type: contextInfo.type,
        age: Date.now() - contextInfo.createdAt,
        lastUsed: Date.now() - contextInfo.lastUsed,
        lost: contextInfo.lost || false,
        canvas: contextInfo.canvas
      });
    }
  });
  return info;
}

/**
 * Získá počet aktivních kontextů
 * @returns {number} Počet aktivních kontextů
 */
export function getActiveContextsCount() {
  return contextRegistry.size;
}

// Automatický cleanup každé 2 sekundy (proaktivní správa kontextů)
// Zpomaleno z 250ms na 2 sekundy pro stabilitu - cleanup je příliš agresivní
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupInactiveContexts(5 * 1000); // Vyčisti kontexty starší než 5 sekund (zvýšeno z 2 sekund)
  }, 2 * 1000); // Zpomaleno z 250ms na 2 sekundy
}

