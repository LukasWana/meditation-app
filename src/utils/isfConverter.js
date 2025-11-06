/**
 * ISF (Interactive Shader Format) konverze
 * Obsahuje konverze pro ISF-specifické proměnné, funkce a parametry
 */

/**
 * Nahradí ISF built-in proměnné WebGL 1.0 kompatibilními ekvivalenty
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const replaceISFVariables = (code) => {
  // RENDERSIZE -> u_resolution (musí být před ostatními náhradami)
  code = code.replace(/RENDERSIZE\.xy/g, 'u_resolution');
  code = code.replace(/RENDERSIZE\.x/g, 'u_resolution.x');
  code = code.replace(/RENDERSIZE\.y/g, 'u_resolution.y');
  code = code.replace(/\bRENDERSIZE\b/g, 'u_resolution');

  // ISF časové proměnné
  code = code.replace(/\bTIME\b/g, 'u_time');

  // ISF frame index - použijme čas jako frame counter (přibližně 60 FPS)
  code = code.replace(/\bFRAMEINDEX\b/g, 'int(u_time * 60.0)');

  // ISF PASSINDEX - nahraď porovnání PASSINDEX == 0 na true, PASSINDEX == 1 na false, atd.
  // Protože máme jen single pass, PASSINDEX je vždy 0
  code = code.replace(/\bPASSINDEX\s*==\s*0\b/g, 'true');
  code = code.replace(/\bPASSINDEX\s*==\s*1\b/g, 'false');
  code = code.replace(/\bPASSINDEX\s*==\s*(\d+)\b/g, 'false');
  // Nahraď ostatní výskyty PASSINDEX na 0
  code = code.replace(/\bPASSINDEX\b/g, '0');

  // ISF TIMEDELTA - časový rozdíl mezi framy (přibližně 1/60)
  code = code.replace(/\bTIMEDELTA\b/g, '0.0166666667');

  // ISF souřadnice - musí být nahrazeno před ostatními operacemi
  // isf_FragNormCoord[0] a [1] se používají jako pole
  code = code.replace(/isf_FragNormCoord\s*\[\s*0\s*\]/g, 'v_uv.x');
  code = code.replace(/isf_FragNormCoord\s*\[\s*1\s*\]/g, 'v_uv.y');
  code = code.replace(/\bisf_FragNormCoord\b/g, 'v_uv');

  // isf_FragCoord -> v_uv * u_resolution
  code = code.replace(/\bisf_FragCoord\b/g, 'v_uv * u_resolution');

  // gl_FragCoord -> v_uv * u_resolution
  code = code.replace(/\bgl_FragCoord\.xy\b/g, 'v_uv * u_resolution');
  code = code.replace(/\bgl_FragCoord\b/g, 'vec3(v_uv * u_resolution, 0.0)');

  return code;
};

/**
 * Nahradí ISF built-in funkce mock hodnotami
 * @param {string} code - GLSL kód
 * @param {Array} audioInputs - Seznam audio/video inputů
 * @param {Array} persistentBuffers - Seznam persistent bufferů
 * @returns {string} Opravený kód
 */
export const replaceISFFunctions = (code, audioInputs = [], persistentBuffers = []) => {
  // Detekuj audio/video inputs z kódu
  const audioInputMatches = code.match(/\b(\w+Image)\b/g);
  const detectedAudioInputs = audioInputMatches ? [...new Set(audioInputMatches)] : [];
  const allAudioInputs = [...new Set([...audioInputs, ...detectedAudioInputs])];

  // Nejdřív nahraď persistent buffery (musí být před obecným nahrazením)
  persistentBuffers.forEach(bufferName => {
    // Nahraď IMG_THIS_NORM_PIXEL(buff) a IMG_THIS_PIXEL(buff)
    code = code.replace(new RegExp(`IMG_THIS_NORM_PIXEL\\s*\\(\\s*${bufferName}\\s*\\)`, 'g'), 'vec4(0.0)');
    code = code.replace(new RegExp(`IMG_THIS_PIXEL\\s*\\(\\s*${bufferName}\\s*\\)`, 'g'), 'vec4(0.0)');
    // Nahraď také IMG_NORM_PIXEL(buff, ...) a IMG_PIXEL(buff, ...) pro persistent buffery
    code = code.replace(new RegExp(`IMG_NORM_PIXEL\\s*\\(\\s*${bufferName}\\s*,\\s*[^)]+\\)`, 'g'), 'vec4(0.0)');
    code = code.replace(new RegExp(`IMG_PIXEL\\s*\\(\\s*${bufferName}\\s*,\\s*[^)]+\\)`, 'g'), 'vec4(0.0)');
    // Odstraň deklarace sampler2D pro persistent buffery
    code = code.replace(new RegExp(`uniform\\s+sampler2D\\s+${bufferName}\\s*;`, 'g'), '');
  });

  // Nahraď IMG_NORM_PIXEL pro audio/video inputs
  allAudioInputs.forEach(input => {
    // Nahraď IMG_NORM_PIXEL(audioInput, ...) za vec4(0.5) - mock audio input
    code = code.replace(new RegExp(`IMG_NORM_PIXEL\\s*\\(\\s*${input}\\s*,\\s*[^)]+\\)`, 'g'), 'vec4(0.5)');
    // Nahraď IMG_PIXEL(audioInput, ...) za vec4(0.5)
    code = code.replace(new RegExp(`IMG_PIXEL\\s*\\(\\s*${input}\\s*,\\s*[^)]+\\)`, 'g'), 'vec4(0.5)');
  });

  // Nahraď všechny ostatní IMG_NORM_PIXEL za vec4(0.5)
  code = code.replace(/IMG_NORM_PIXEL\s*\(/g, 'vec4(0.5)');
  // Nahraď všechny ostatní IMG_PIXEL za vec4(0.5)
  code = code.replace(/IMG_PIXEL\s*\(/g, 'vec4(0.5)');

  // Nahraď IMG_THIS_NORM_PIXEL bez parametru (používá aktuální buffer)
  code = code.replace(/IMG_THIS_NORM_PIXEL\s*\(/g, 'vec4(0.0)');

  // Nahraď IMG_THIS_PIXEL - podobně jako IMG_THIS_NORM_PIXEL
  code = code.replace(/IMG_THIS_PIXEL\s*\(/g, 'vec4(0.0)');

  // Odstraň deklarace audio/video inputs, pokud existují
  code = code.replace(/uniform\s+sampler2D\s+\w+Image\s*;/g, '');

  // Nahraď inputImage a podobné ISF proměnné
  code = code.replace(/\binputImage\b/g, 'vec4(0.5)');
  code = code.replace(/\binputImage\s*\[/g, 'vec4(0.5)[');

  return code;
};

/**
 * Formátuje hodnotu na GLSL float literál
 * @param {number|string} value - Hodnota k formátování
 * @returns {string} Formátovaná hodnota
 */
const formatFloatValue = (value) => {
  let val;
  if (typeof value === 'number') {
    // Pokud je to číslo, zkontroluj, zda je to celé číslo nebo float
    if (Number.isInteger(value)) {
      // Celé číslo - převeď na float
      val = value.toString() + '.0';
    } else {
      // Float - použij jak je (toString() vrátí správný formát, např. "6.04")
      val = value.toString();
      // NIKDY nepřidávej .0 k číslu, které už má desetinnou část
      // toString() pro float čísla už vrátí správný formát s tečkou
    }
  } else {
    // Pokud je to string, použij jak je
    val = value.toString().trim();
  }

  // Zkontroluj a oprav neplatné formáty PŘED jakýmkoliv dalším zpracováním
  if (typeof val === 'string') {
    // Nejdřív zkontroluj neplatné formáty a oprav je
    // Oprav formáty jako "6.04.0", "192.00.0", "3.00.0", "2.01.0", "3.05.0", "1000.00.0"
    // Regex musí zachytit i více teček: "6.04.0", "192.00.0", atd.
    // Může být i více teček: "6.04.0.5" -> "6.04"
    if (val.match(/^-?\d+\.\d+\./)) {
      // Neplatný formát (např. 2.05.0 nebo 6.04.0) - oprav na první část
      // Vezmi první dvě části (před první tečkou a mezi tečkami)
      const parts = val.split('.');
      val = parts[0] + '.' + parts[1];
    }
    // Oprav formáty jako "10.0.", "1.0.", "2.0."
    else if (val.match(/^-?\d+\.\d+\.$/)) {
      // Má tečku na konci (např. 10.0.) - odstraň tečku na konci
      val = val.replace(/\.$/, '');
    }
    // Oprav formáty jako "10.", "1."
    else if (val.match(/^-?\d+\.$/)) {
      // Má tečku na konci bez desetinné části (např. "10.") - převeď na "10.0"
      val = val.replace(/\.$/, '') + '.0';
    }

    // Nyní zkontroluj, zda už je validní float formát
    if (val.match(/^-?\d+\.\d+$/)) {
      // Už je validní float (např. "6.04") - použij jak je
      return val;
    } else if (val.match(/^-?\d+$/)) {
      // Celé číslo bez tečky - převeď na float
      return val + '.0';
    } else {
      // Neznámý formát - použij jak je (možná už je opraveno)
      return val;
    }
  }

  return val;
};

/**
 * Zpracuje ISF INPUTS parametry - deklaruje je jako konstanty
 * @param {string} code - GLSL kód
 * @param {Array} inputParams - Seznam INPUTS parametrů z ISF metadata
 * @returns {Object} { code: string, constantDeclarations: Array<string> }
 */
export const processISFInputs = (code, inputParams = []) => {
  const constantDeclarations = [];

  inputParams.forEach(param => {
    // Audio/video inputs už řešíme výše
    if (param.TYPE === 'audio' || param.TYPE === 'video' || param.TYPE === 'image') {
      return;
    }

    const paramName = param.NAME;

    // Zkontroluj, zda už není deklarován jako proměnná nebo konstanta
    // Musíme hledat skutečné deklarace - typ následovaný mezerou, pak názvem parametru, pak mezerou nebo = nebo ;
    // Např. "float maxNote" nebo "const float maxNote" nebo "uniform float maxNote"
    // Ale ne "maxNote - minNote" nebo "float something = maxNote"
    // Použijeme word boundary na začátku a konci, abychom se ujistili, že je to skutečná deklarace
    // Jednodušší přístup: zkontroluj, zda je parametr deklarován na začátku řádku nebo po středníku
    // Musíme také zkontrolovat, zda není deklarován bez const (např. "float RADIUS = 0.0;")
    const declarationPattern = new RegExp(`(^|;|\\n)\\s*(uniform\\s+)?(const\\s+)?(vec2|vec3|vec4|float|int|bool|sampler2D)\\s+${paramName}\\s*[=;]`);
    if (declarationPattern.test(code)) {
      return; // Už je deklarován
    }

    // Zkontroluj také, zda není deklarován jako konstanta bez const (např. "float RADIUS = 0.0;")
    const simpleDeclarationPattern = new RegExp(`\\b(float|vec2|vec3|vec4|int|bool)\\s+${paramName}\\s*=\\s*[^;]+;`);
    if (simpleDeclarationPattern.test(code)) {
      return; // Už je deklarován
    }

    // Deklarujme všechny INPUTS parametry - pro jistotu deklarujeme všechny
    // protože některé se mohou používat v podmínkách nebo výrazech, které regex nedetekuje

    // Detekuj skutečné použití parametru v kódu pro určení typu
    // Např. pokud je použit jako vec4(paramName) nebo paramName.x, paramName.y, paramName.rgb, atd.
    const usagePattern = new RegExp(`\\b${paramName}\\s*\\.\\s*([xyzwrgba]|\\[)`, 'g');
    const dotMatches = code.match(usagePattern);
    let detectedType = param.TYPE;

    // Detekuj také použití .rgb, .rgba, .xy, atd. (více komponent najednou)
    const multiComponentPattern = new RegExp(`\\b${paramName}\\s*\\.\\s*(rgb|rgba|xy|xyz|xyzw)`, 'g');
    const multiComponentMatches = code.match(multiComponentPattern);

    // Pokud je použit s .x, .y, .z, .w, .r, .g, .b, .a nebo [], je to vektor
    if (dotMatches && dotMatches.length > 0) {
      // Počítáme, kolik komponent je použito
      const components = new Set();
      dotMatches.forEach(match => {
        const component = match.match(/\.([xyzwrgba])/);
        if (component) {
          components.add(component[1]);
        }
      });
      // Pokud je použit index [], je to pole nebo vektor
      if (dotMatches.some(m => m.includes('['))) {
        if (components.size >= 4 || param.TYPE === 'color') {
          detectedType = 'vec4';
        } else if (components.size >= 3) {
          detectedType = 'vec3';
        } else if (components.size >= 2) {
          detectedType = 'vec2';
        }
      } else if (components.size >= 4) {
        detectedType = 'vec4';
      } else if (components.size >= 3) {
        detectedType = 'vec3';
      } else if (components.size >= 2) {
        detectedType = 'vec2';
      }
    }

    // Pokud je použit s .rgb, .rgba, .xy, atd., je to vektor
    if (multiComponentMatches && multiComponentMatches.length > 0) {
      multiComponentMatches.forEach(match => {
        if (match.includes('rgba') || match.includes('xyzw')) {
          detectedType = 'vec4';
        } else if (match.includes('rgb') || match.includes('xyz')) {
          detectedType = 'vec3';
        } else if (match.includes('xy')) {
          detectedType = 'vec2';
        }
      });
    }

    // Pokud je použit jako argument funkce, která očekává vec4
    // Musíme zkontrolovat, zda je parametr skutečně argumentem funkce, která očekává vec4
    // Ne jen jestli je v kódu s vec4 nebo mix/smoothstep
    // Např. vec4(paramName) nebo mix(paramName, ...) nebo smoothstep(paramName, ...)
    // Ale ne smoothstep(0.0, 1.0, fract(x * paramName)) - tam je paramName argumentem fract(), ne smoothstep()
    // DŮLEŽITÉ: Použij param.TYPE jako primární zdroj typu, detekci typu použij pouze jako fallback
    const vec4ConstructorPattern = new RegExp(`vec4\\s*\\([^,]*${paramName}[^)]*\\)`, 'g');
    const mixPattern = new RegExp(`mix\\s*\\([^,]*${paramName}[^,)]*[,)]`, 'g');
    const smoothstepPattern = new RegExp(`smoothstep\\s*\\([^,]*${paramName}[^,)]*[,)]`, 'g');

    // Pouze pokud param.TYPE není definován nebo je neplatný, použij detekci typu
    if (!param.TYPE || param.TYPE === 'long' || param.TYPE === 'event') {
      if ((vec4ConstructorPattern.test(code) || mixPattern.test(code) || smoothstepPattern.test(code)) && detectedType === 'float') {
        // Pouze pokud je parametr skutečně argumentem funkce, která očekává vec4
        // Zkontroluj, zda není použit jako argument jiné funkce (např. fract, floor, atd.)
        const isUsedInOtherFunction = new RegExp(`(fract|floor|ceil|round|abs|sin|cos|tan|atan|sqrt|pow|exp|log|mod|min|max|clamp|mix|smoothstep)\\s*\\([^)]*${paramName}[^)]*\\)`, 'g');
        if (!isUsedInOtherFunction.test(code)) {
          detectedType = 'vec4';
        }
      }
    }

    // Zpracuj defaultní hodnotu podle typu - použij param.TYPE jako primární zdroj typu
    let defaultValue;
    let glslType;

    // Použij param.TYPE jako primární zdroj typu, detekci typu použij pouze jako fallback
    // Pokud param.TYPE není definován nebo je neplatný, použij detekovaný typ
    const finalType = (!param.TYPE || param.TYPE === 'long' || param.TYPE === 'event')
      ? (detectedType || 'float')
      : param.TYPE;

    if (finalType === 'bool' || param.TYPE === 'bool') {
      // GLSL ES 1.0 nepodporuje bool, použij float (0.0 nebo 1.0)
      glslType = 'float';
      defaultValue = (param.DEFAULT === true || param.DEFAULT === 1) ? '1.0' : '0.0';
    } else if (finalType === 'int' || param.TYPE === 'int') {
      // GLSL ES 1.0 nepodporuje int konstanty dobře, použij float
      glslType = 'float';
      if (param.DEFAULT !== undefined) {
        defaultValue = formatFloatValue(param.DEFAULT);
      } else {
        defaultValue = '0.0';
      }
    } else if (finalType === 'color' || param.TYPE === 'color') {
      // Color je vec4 v ISF
      glslType = 'vec4';
      if (Array.isArray(param.DEFAULT)) {
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec4(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec4(0.0)';
      }
    } else if (finalType === 'vec4') {
      glslType = 'vec4';
      if (Array.isArray(param.DEFAULT)) {
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec4(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec4(0.0)';
      }
    } else if (finalType === 'vec3') {
      glslType = 'vec3';
      if (Array.isArray(param.DEFAULT)) {
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec3(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec3(0.0)';
      }
    } else if (finalType === 'vec2') {
      glslType = 'vec2';
      if (Array.isArray(param.DEFAULT)) {
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec2(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec2(0.0)';
      }
    } else if (param.TYPE === 'float' || finalType === 'float') {
      glslType = 'float';
      if (param.DEFAULT !== undefined) {
        defaultValue = formatFloatValue(param.DEFAULT);
      } else {
        defaultValue = '0.0';
      }
    } else if (param.TYPE === 'vec2') {
      glslType = 'vec2';
      if (Array.isArray(param.DEFAULT)) {
        // Převod čísel v poli na float, pokud jsou celá čísla
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec2(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec2(0.0)';
      }
    } else if (param.TYPE === 'vec3') {
      glslType = 'vec3';
      if (Array.isArray(param.DEFAULT)) {
        // Převod čísel v poli na float, pokud jsou celá čísla
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec3(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec3(0.0)';
      }
    } else if (param.TYPE === 'vec4') {
      glslType = 'vec4';
      if (Array.isArray(param.DEFAULT)) {
        // Převod čísel v poli na float, pokud jsou celá čísla
        const convertedValues = param.DEFAULT.map(v => formatFloatValue(v));
        defaultValue = `vec4(${convertedValues.join(', ')})`;
      } else {
        defaultValue = 'vec4(0.0)';
      }
    } else {
      // Neznámý typ, použij float
      glslType = 'float';
      if (param.DEFAULT !== undefined) {
        defaultValue = formatFloatValue(param.DEFAULT);
      } else {
        defaultValue = '0.0';
      }
    }

    // Přidej const před deklaraci, aby to byla konstanta
    // Oprav neplatné formáty v defaultValue PŘED přidáním do deklarace
    let finalDefaultValue = defaultValue;
    if (typeof defaultValue === 'string') {
      // Oprav neplatné formáty jako "6.04.0", "192.00.0", "3.00.0", "2.01.0", "3.05.0", "1000.00.0"
      // Oprav formáty jako "10.0.", "1.0.", "2.0."
      // Může být i více teček: "6.04.0.5" -> "6.04"
      if (defaultValue.match(/^-?\d+\.\d+\./)) {
        // Neplatný formát - oprav na první část
        const parts = defaultValue.split('.');
        finalDefaultValue = parts[0] + '.' + parts[1];
      } else if (defaultValue.match(/^-?\d+\.\d+\.$/)) {
        // Má tečku na konci - odstraň tečku na konci
        finalDefaultValue = defaultValue.replace(/\.$/, '');
      } else if (defaultValue.match(/^-?\d+\.$/)) {
        // Má tečku na konci bez desetinné části - převeď na "10.0"
        finalDefaultValue = defaultValue.replace(/\.$/, '') + '.0';
      }

      // Navíc: pokud je defaultValue komplexní výraz (např. "vec4(6.04.0, 2.05.0, ...)"),
      // musíme opravit i čísla uvnitř výrazu
      if (finalDefaultValue.includes('(') && finalDefaultValue.includes(')')) {
        // Oprav čísla uvnitř závorek
        finalDefaultValue = finalDefaultValue.replace(/(-?\d+\.\d+\.\d+)/g, (match) => {
          const parts = match.split('.');
          return parts[0] + '.' + parts[1];
        });
        finalDefaultValue = finalDefaultValue.replace(/(-?\d+\.\d+)\.(\s|,|\))/g, '$1$2');
        finalDefaultValue = finalDefaultValue.replace(/(-?\d+)\.(\s|,|\))/g, '$1.0$2');
      }
    }

    constantDeclarations.push(`const ${glslType} ${paramName} = ${finalDefaultValue};`);
  });

  return { code, constantDeclarations };
};

/**
 * Opraví logické operátory pro bool parametry (převedené na float)
 * @param {string} code - GLSL kód
 * @param {Array} inputParams - Seznam INPUTS parametrů z ISF metadata
 * @returns {string} Opravený kód
 */
export const fixBoolOperators = (code, inputParams = []) => {
  inputParams.forEach(param => {
    if (param.TYPE === 'bool') {
      const paramName = param.NAME;

      // Nejdřív oprav porovnání bool parametru s true/false
      // paramName == true -> paramName > 0.5
      code = code.replace(new RegExp(`\\b${paramName}\\s*==\\s*true\\b`, 'g'), `(${paramName} > 0.5)`);
      // paramName == false -> paramName < 0.5
      code = code.replace(new RegExp(`\\b${paramName}\\s*==\\s*false\\b`, 'g'), `(${paramName} < 0.5)`);
      // paramName != true -> paramName < 0.5
      code = code.replace(new RegExp(`\\b${paramName}\\s*!=\\s*true\\b`, 'g'), `(${paramName} < 0.5)`);
      // paramName != false -> paramName > 0.5
      code = code.replace(new RegExp(`\\b${paramName}\\s*!=\\s*false\\b`, 'g'), `(${paramName} > 0.5)`);

      // Oprav !boolParam na boolParam < 0.5
      code = code.replace(new RegExp(`!\\s*${paramName}(?!\\s*[><=])`, 'g'), `(${paramName} < 0.5)`);
      // Oprav také případ s závorkami !(boolParam)
      code = code.replace(new RegExp(`!\\s*\\(\\s*${paramName}\\s*\\)`, 'g'), `(${paramName} < 0.5)`);

      // Oprav použití bool parametru v podmínkách
      // if (paramName) -> if (paramName > 0.5)
      // Musíme být opatrní - zachytit pouze pokud není už porovnání
      code = code.replace(new RegExp(`(if|while|for)\\s*\\(\\s*${paramName}(?!\\s*[><=!])`, 'g'), (match, keyword) => {
        // Zkontroluj, zda už není porovnání nebo boolean výraz
        const afterParam = match.substring(match.indexOf(paramName) + paramName.length);
        if (afterParam.match(/^\s*[><=!]/)) {
          return match; // Už je porovnání
        }
        return `${keyword} (${paramName} > 0.5`;
      });

      // Oprav ternární operátor: (paramName ? ... : ...) -> ((paramName > 0.5) ? ... : ...)
      // Musíme být opatrní - zachytit pouze pokud není už porovnání
      code = code.replace(new RegExp(`\\(\\s*${paramName}(?!\\s*[><=!])\\s*\\?`, 'g'), (match) => {
        // Zkontroluj, zda už není porovnání nebo boolean výraz
        const afterParam = match.substring(match.indexOf(paramName) + paramName.length);
        if (afterParam.match(/^\s*[><=!]/)) {
          return match; // Už je porovnání
        }
        return `((${paramName} > 0.5) ?`;
      });

      // Oprav také použití bool parametru v logických výrazech
      // paramName && ... -> (paramName > 0.5) && ...
      // paramName || ... -> (paramName > 0.5) || ...
      code = code.replace(new RegExp(`\\b${paramName}(?!\\s*[><=!])\\s*(&&|\\|\\|)`, 'g'), (match) => {
        return `(${paramName} > 0.5) ${match.includes('&&') ? '&&' : '||'}`;
      });

      // Oprav také opačně: ... && paramName -> ... && (paramName > 0.5)
      // ... || paramName -> ... || (paramName > 0.5)
      code = code.replace(new RegExp(`(&&|\\|\\|)\\s*${paramName}(?!\\s*[><=!])`, 'g'), (match) => {
        return `${match.includes('&&') ? '&&' : '||'} (${paramName} > 0.5)`;
      });
    }
  });

  return code;
};

/**
 * Přidá konstanty (PI2, F4) pokud jsou potřeba
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const addConstants = (code) => {
  // Přidej PI2 konstantu pokud je potřeba
  if (code.includes('PI2') && !code.match(/\bPI2\b.*=/) && !code.match(/\bconst\s+float\s+PI2\b/)) {
    const firstFunctionMatch = code.match(/(\w+\s+\w+\s*\([^)]*\)\s*\{|void\s+main\s*\([^)]*\)\s*\{)/);
    if (firstFunctionMatch) {
      const functionIndex = code.indexOf(firstFunctionMatch[0]);
      code = code.substring(0, functionIndex) +
             'const float PI2 = 6.283185307179586;\n' +
             code.substring(functionIndex);
    } else if (code.includes('void main()')) {
      code = code.replace(/void\s+main\s*\([^)]*\)\s*\{/, (match) => {
        return match + '\n\tconst float PI2 = 6.283185307179586;';
      });
    }
  }

  // Přidej F4 konstantu pokud je potřeba
  if (code.match(/\bF4\b/) && !code.match(/\bF4\b.*=/) && !code.match(/\bconst\s+float\s+F4\b/)) {
    const firstFunctionMatch = code.match(/(\w+\s+\w+\s*\([^)]*\)\s*\{|void\s+main\s*\([^)]*\)\s*\{)/);
    if (firstFunctionMatch) {
      const functionIndex = code.indexOf(firstFunctionMatch[0]);
      code = code.substring(0, functionIndex) +
             'const float F4 = 4.0;\n' +
             code.substring(functionIndex);
    } else if (code.includes('void main()')) {
      code = code.replace(/void\s+main\s*\([^)]*\)\s*\{/, (match) => {
        return match + '\n\tconst float F4 = 4.0;';
      });
    }
  }

  return code;
};

