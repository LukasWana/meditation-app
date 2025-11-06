/**
 * Opravy syntaxe pro GLSL ES 1.0 kompatibilitu
 * Obsahuje opravy pro for smyčky, int->float konverze, in qualifier, atd.
 */

/**
 * Opraví for smyčky s int inicializací - převede na float
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const fixForLoops = (code) => {
  // Oprav for smyčky bez inicializace: for(int i; i < 10; i++)
  code = code.replace(/for\s*\(\s*int\s+(\w+)\s*;\s*([^;]+);\s*([^)]+)\)/g, (match, varName, condition, increment) => {
    // For smyčka bez inicializace - převedeme na float s inicializací 0.0
    let floatCondition = condition.trim();
    // Použijeme kontrolu s negativním lookbehind a lookahead
    // Musíme zachytit pouze samostatná celá čísla, ne součást float čísla (např. 44 v 44.00)
    floatCondition = floatCondition.replace(/\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])/g, (fullMatch, num, offset) => {
      // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
      if (offset > 0) {
        const beforeChar = floatCondition[offset - 1];
        if (beforeChar === '.' || /\d/.test(beforeChar)) {
          return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
        }
      }
      // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
      if (offset + fullMatch.length < floatCondition.length) {
        const afterChar = floatCondition[offset + fullMatch.length];
        if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
          return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
        }
      }
      return num + '.0';
    });

    let floatIncrement = increment.trim();
    floatIncrement = floatIncrement.replace(/\b(\w+)\+\+/g, '$1 += 1.0');
    floatIncrement = floatIncrement.replace(/\+\+(\w+)/g, '$1 += 1.0');
    floatIncrement = floatIncrement.replace(/\b(\w+)--/g, '$1 -= 1.0');
    floatIncrement = floatIncrement.replace(/--(\w+)/g, '$1 -= 1.0');

    return `for(float ${varName} = 0.0; ${floatCondition}; ${floatIncrement})`;
  });

  // Oprav for smyčky s int inicializací: for(int i = 0; i < 10; i++)
  code = code.replace(/for\s*\(\s*int\s+(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)/g, (match, varName, init, condition, increment) => {
    // Převod na float - opravíme inicializaci a inkrement
    let floatInit = init.trim();

    // Pokud je inicializace prázdná nebo neplatná, použij 0.0
    if (!floatInit || floatInit.length === 0) {
      floatInit = '0.0';
    } else {
      // Převod int(...) výrazů na float(...) - např. int(channels) -> float(channels)
      floatInit = floatInit.replace(/int\s*\(/g, 'float(');
      // Převod čísel na float (např. 1 -> 1.0, ale nechte 1.0 jak je)
      // Použijeme kontrolu s negativním lookbehind a lookahead
      // Musíme zachytit pouze samostatná celá čísla, ne součást float čísla (např. 44 v 44.00)
      floatInit = floatInit.replace(/\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])/g, (fullMatch, num, offset) => {
        // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
        if (offset > 0) {
          const beforeChar = floatInit[offset - 1];
          if (beforeChar === '.' || /\d/.test(beforeChar)) {
            return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
          }
        }
        // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
        if (offset + fullMatch.length < floatInit.length) {
          const afterChar = floatInit[offset + fullMatch.length];
          if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
            return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
          }
        }
        return num + '.0';
      });
    }

    let floatIncrement = increment.trim();
    if (floatIncrement && floatIncrement.length > 0) {
      floatIncrement = floatIncrement.replace(/\b(\w+)\+\+/g, '$1 += 1.0');
      floatIncrement = floatIncrement.replace(/\+\+(\w+)/g, '$1 += 1.0');
      floatIncrement = floatIncrement.replace(/\b(\w+)--/g, '$1 -= 1.0');
      floatIncrement = floatIncrement.replace(/--(\w+)/g, '$1 -= 1.0');
    } else {
      floatIncrement = '';
    }

    // Oprav podmínku - převeď číselné konstanty na float
    let floatCondition = condition.trim();
    if (!floatCondition || floatCondition.length === 0) {
      floatCondition = 'true';
    } else {
      // Převod int(...) výrazů na float(...)
      floatCondition = floatCondition.replace(/int\s*\(/g, 'float(');
      // Převod číselných konstant v podmínce na float
      // Použijeme kontrolu s negativním lookbehind a lookahead
      // Musíme zachytit pouze samostatná celá čísla, ne součást float čísla (např. 44 v 44.00)
      floatCondition = floatCondition.replace(/\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])/g, (fullMatch, num, offset) => {
        // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
        if (offset > 0) {
          const beforeChar = floatCondition[offset - 1];
          if (beforeChar === '.' || /\d/.test(beforeChar)) {
            return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
          }
        }
        // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
        if (offset + fullMatch.length < floatCondition.length) {
          const afterChar = floatCondition[offset + fullMatch.length];
          if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
            return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
          }
        }
        return num + '.0';
      });
    }

    // Sestav for smyčku s float
    if (floatIncrement) {
      return `for(float ${varName} = ${floatInit}; ${floatCondition}; ${floatIncrement})`;
    } else {
      return `for(float ${varName} = ${floatInit}; ${floatCondition};)`;
    }
  });

  return code;
};

/**
 * Odstraní 'in' storage qualifier (GLSL ES 3.00 syntax) - není podporováno v ES 1.0
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const removeInQualifier = (code) => {
  return code.replace(/\bin\s+(float|int|vec2|vec3|vec4|mat2|mat3|mat4)\s+(\w+)/g, '$1 $2');
};

/**
 * Převod mat3x2 a mat4x2 na mat3/mat4 (GLSL ES 1.0 nepodporuje mat3x2/mat4x2)
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const fixMatrixTypes = (code) => {
  // mat3x2(-8,0,4,7,4,-7) -> mat3(-8,0,0,4,7,0,4,-7,0)
  code = code.replace(/mat3x2\s*\(([^)]+)\)/g, (match, args) => {
    const values = args.split(',').map(v => v.trim());
    if (values.length === 6) {
      return `mat3(${values[0]}, ${values[1]}, 0.0, ${values[2]}, ${values[3]}, 0.0, ${values[4]}, ${values[5]}, 0.0)`;
    }
    return match;
  });

  // mat4x2(-8,0,4,7,4,-7,0,0) -> mat4(-8,0,0,0,4,7,0,0,4,-7,0,0,0,0,0,0)
  code = code.replace(/mat4x2\s*\(([^)]+)\)/g, (match, args) => {
    const values = args.split(',').map(v => v.trim());
    if (values.length === 8) {
      return `mat4(${values[0]}, ${values[1]}, 0.0, 0.0, ${values[2]}, ${values[3]}, 0.0, 0.0, ${values[4]}, ${values[5]}, 0.0, 0.0, ${values[6]}, ${values[7]}, 0.0, 0.0)`;
    }
    return match;
  });

  return code;
};

/**
 * Opraví porovnání ve výrazech - převede číselné konstanty na float
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const fixComparisons = (code) => {
  // Oprav porovnání: float < 5 -> float < 5.0
  // Použijeme kontrolu s negativním lookbehind a lookahead
  // Regex musí zachytit pouze celá čísla, ne float čísla (např. 44.00, 28.09)
  code = code.replace(/(\w+)\s*([<>=]+)\s*\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])/g, (fullMatch, varName, op, num, offset) => {
    // Zkontroluj, zda proměnná není částí většího výrazu (např. vec2.x)
    if (varName.includes('.') || varName.includes('(') || varName.includes(')')) {
      return fullMatch;
    }
    // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
    const matchIndex = offset + varName.length + op.length + 2; // Pozice čísla
    if (matchIndex > 0 && matchIndex < code.length) {
      const beforeChar = code[matchIndex - 1];
      if (beforeChar === '.' || /\d/.test(beforeChar)) {
        return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
      }
    }
    // Zkontroluj, zda za číslem není tečka s číslicí (např. 50.0, 44.00, 28.09) nebo vědecká notace
    const numEndIndex = matchIndex + num.length;
    if (numEndIndex < code.length) {
      const afterChar = code[numEndIndex];
      if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
        return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
      }
    }
    // Pokud je to jednoduchá proměnná, převeď konstantu na float
    return varName + ' ' + op + ' ' + num + '.0';
  });

  // Oprav také porovnání opačně: 5 < float -> 5.0 < float
  code = code.replace(/\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])\s*([<>=]+)\s*(\w+)/g, (fullMatch, num, op, varName, offset) => {
    // Zkontroluj, zda proměnná není částí většího výrazu
    if (varName.includes('.') || varName.includes('(') || varName.includes(')')) {
      return fullMatch;
    }
    // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
    if (offset > 0) {
      const beforeChar = code[offset - 1];
      if (beforeChar === '.' || /\d/.test(beforeChar)) {
        return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
      }
    }
    // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
    const numEndIndex = offset + num.length;
    if (numEndIndex < code.length) {
      const afterChar = code[numEndIndex];
      if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
        return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
      }
    }
    return num + '.0 ' + op + ' ' + varName;
  });

  // Oprav čísla v aritmetických operacích jako /, *, +, - kde je potřeba float
  code = code.replace(/(\w+)\s*([-/*+])\s*\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])/g, (fullMatch, varName, op, num, offset) => {
    // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
    const matchIndex = offset + varName.length + op.length + 2; // Pozice čísla
    if (matchIndex > 0 && matchIndex < code.length) {
      const beforeChar = code[matchIndex - 1];
      if (beforeChar === '.' || /\d/.test(beforeChar)) {
        return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
      }
    }
    // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
    const numEndIndex = matchIndex + num.length;
    if (numEndIndex < code.length) {
      const afterChar = code[numEndIndex];
      if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
        return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
      }
    }
    // Pokud je to jednoduchá proměnná a operátor, převeď číslo na float
    if (varName.includes('.') || varName.includes('(') || varName.includes(')')) {
      return fullMatch;
    }
    return varName + ' ' + op + ' ' + num + '.0';
  });

  // Oprav také opačně: 0 / var -> 0.0 / var
  code = code.replace(/\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])\s*([-/*+])\s*(\w+)/g, (fullMatch, num, op, varName, offset) => {
    // Zkontroluj, zda před číslem není tečka nebo číslice (např. .5 v 0.5, nebo 4 v 44.00)
    if (offset > 0) {
      const beforeChar = code[offset - 1];
      if (beforeChar === '.' || /\d/.test(beforeChar)) {
        return fullMatch; // Je to část float čísla (např. .5, nebo 4 v 44.00)
      }
    }
    // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
    const numEndIndex = offset + num.length;
    if (numEndIndex < code.length) {
      const afterChar = code[numEndIndex];
      if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
        return fullMatch; // Už je float (např. 50.0, 44.00) nebo vědecká notace (např. 5e2)
      }
    }
    // Zkontroluj, zda proměnná není částí většího výrazu
    if (varName.includes('.') || varName.includes('(') || varName.includes(')')) {
      return fullMatch;
    }
    return num + '.0 ' + op + ' ' + varName;
  });

  return code;
};

/**
 * Odstraní #define makra - nejsou podporována v GLSL ES 1.0 stejným způsobem
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const removeDefineMacros = (code) => {
  // Odstraň #define makra
  code = code.replace(/^#define\s+\w+.*$/gm, '');
  // Odstraň prázdné řádky po odstranění #define
  code = code.replace(/\n\s*\n\s*\n/g, '\n\n');
  return code;
};

/**
 * Opraví přiřazení int hodnot k float proměnným
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const fixIntToFloatAssignments = (code) => {
  // Oprav přiřazení: float var = 0; -> float var = 0.0;
  // Pattern: float var = integer; nebo float var = integer;
  code = code.replace(/\bfloat\s+(\w+)\s*=\s*\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])/g, (fullMatch, varName, num, offset) => {
    // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
    const numEndIndex = offset + varName.length + ' = '.length + num.length;
    if (numEndIndex < code.length) {
      const afterChar = code[numEndIndex];
      if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
        return fullMatch; // Už je float (např. 50.0) nebo vědecká notace (např. 5e2)
      }
    }
    return `float ${varName} = ${num}.0`;
  });

  // Oprav přiřazení: vec2 var = vec2(0, 1); -> vec2 var = vec2(0.0, 1.0);
  code = code.replace(/\b(vec2|vec3|vec4)\s+(\w+)\s*=\s*\b(vec2|vec3|vec4)\s*\(([^)]+)\)/g, (fullMatch, type, varName, constructorType, args, offset) => {
    // Převod čísel v argumentech na float
    const convertedArgs = args.split(',').map(arg => {
      const trimmedArg = arg.trim();
      // Pokud je to celé číslo, převeď na float
      if (trimmedArg.match(/^\d+$/)) {
        return trimmedArg + '.0';
      }
      // Pokud je to číslo s negativním znaménkem
      if (trimmedArg.match(/^-\d+$/)) {
        return trimmedArg + '.0';
      }
      return trimmedArg;
    }).join(', ');
    return `${type} ${varName} = ${constructorType}(${convertedArgs})`;
  });

  // Oprav přiřazení: var = 0; kde var je float proměnná
  // Musíme být opatrní - detekujeme pouze jednoduchá přiřazení, ne komplexní výrazy
  code = code.replace(/\b(\w+)\s*=\s*\b(\d+)(?!\.\d)(?![eE])(?![a-zA-Z_])\s*;/g, (fullMatch, varName, num, offset) => {
    // Zkontroluj, zda proměnná není klíčové slovo (např. if, for, return)
    const keywords = ['if', 'for', 'while', 'return', 'break', 'continue', 'discard', 'precision', 'uniform', 'varying', 'attribute', 'const', 'in', 'out'];
    if (keywords.includes(varName)) {
      return fullMatch;
    }
    // Zkontroluj, zda před přiřazením není tečka nebo číslice
    if (offset > 0) {
      const beforeChar = code[offset - 1];
      if (beforeChar === '.' || /\d/.test(beforeChar)) {
        return fullMatch; // Je to část float čísla
      }
    }
    // Zkontroluj, zda za číslem není tečka s číslicí nebo vědecká notace
    const numEndIndex = offset + varName.length + ' = '.length + num.length;
    if (numEndIndex < code.length) {
      const afterChar = code[numEndIndex];
      if (afterChar === '.' || afterChar === 'e' || afterChar === 'E') {
        return fullMatch; // Už je float
      }
    }
    return `${varName} = ${num}.0;`;
  });

  // Oprav přiřazení v konstruktorech: vec2(0, 1) -> vec2(0.0, 1.0)
  // Ale pouze pokud je to samostatné přiřazení nebo argument
  code = code.replace(/\b(vec2|vec3|vec4|mat2|mat3|mat4)\s*\(\s*([^)]+)\s*\)/g, (fullMatch, constructorType, args) => {
    // Převod čísel v argumentech na float, ale pouze pokud jsou to samostatná celá čísla
    const convertedArgs = args.split(',').map(arg => {
      const trimmedArg = arg.trim();
      // Pokud je to celé číslo (např. 0, 1, -5), převeď na float
      if (trimmedArg.match(/^-?\d+$/)) {
        return trimmedArg + '.0';
      }
      return trimmedArg;
    }).join(', ');
    return `${constructorType}(${convertedArgs})`;
  });

  return code;
};

/**
 * Opraví dimension mismatch při přiřazení (např. vec4 -> float, vec4 -> vec3)
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const fixDimensionMismatch = (code) => {
  // Oprav přiřazení: float var = vec4(...); -> float var = vec4(...).r; nebo float var = vec4(...).x;
  // Pattern: float var = vec4(...);
  code = code.replace(/\bfloat\s+(\w+)\s*=\s*\b(vec4|vec3|vec2)\s*\(([^)]+)\)\s*;/g, (fullMatch, varName, vecType, args) => {
    // Pokud je to vec4 přiřazeno k float, vezmi první komponentu
    if (vecType === 'vec4') {
      return `float ${varName} = vec4(${args}).r;`;
    }
    // Pokud je to vec3 přiřazeno k float, vezmi první komponentu
    if (vecType === 'vec3') {
      return `float ${varName} = vec3(${args}).r;`;
    }
    // Pokud je to vec2 přiřazeno k float, vezmi první komponentu
    if (vecType === 'vec2') {
      return `float ${varName} = vec2(${args}).x;`;
    }
    return fullMatch;
  });

  // Oprav přiřazení: vec3 var = vec4(...); -> vec3 var = vec4(...).rgb; nebo vec3 var = vec4(...).xyz;
  // Pattern: vec3 var = vec4(...);
  code = code.replace(/\bvec3\s+(\w+)\s*=\s*\bvec4\s*\(([^)]+)\)\s*;/g, (fullMatch, varName, args) => {
    // Pokud je to vec4 přiřazeno k vec3, vezmi první tři komponenty
    return `vec3 ${varName} = vec4(${args}).rgb;`;
  });

  // Oprav přiřazení: vec2 var = vec4(...); -> vec2 var = vec4(...).xy; nebo vec2 var = vec4(...).rg;
  // Pattern: vec2 var = vec4(...);
  code = code.replace(/\bvec2\s+(\w+)\s*=\s*\bvec4\s*\(([^)]+)\)\s*;/g, (fullMatch, varName, args) => {
    // Pokud je to vec4 přiřazeno k vec2, vezmi první dvě komponenty
    return `vec2 ${varName} = vec4(${args}).xy;`;
  });

  // Oprav přiřazení: vec2 var = vec3(...); -> vec2 var = vec3(...).xy; nebo vec2 var = vec3(...).rg;
  // Pattern: vec2 var = vec3(...);
  code = code.replace(/\bvec2\s+(\w+)\s*=\s*\bvec3\s*\(([^)]+)\)\s*;/g, (fullMatch, varName, args) => {
    // Pokud je to vec3 přiřazeno k vec2, vezmi první dvě komponenty
    return `vec2 ${varName} = vec3(${args}).xy;`;
  });

  // Oprav také přiřazení bez deklarace typu: var = vec4(...); kde var je float
  // Musíme být opatrní - detekujeme pouze jednoduchá přiřazení
  // Toto je složitější, protože nevíme typ proměnné - musíme se spoléhat na kontext
  // Prozatím to přeskočíme, protože je to riskantní

  return code;
};

/**
 * Aplikuje všechny syntax opravy
 * @param {string} code - GLSL kód
 * @returns {string} Opravený kód
 */
export const applyAllFixes = (code) => {
  code = removeDefineMacros(code);
  code = removeInQualifier(code);
  code = fixMatrixTypes(code);
  code = fixForLoops(code);
  code = fixComparisons(code);
  code = fixIntToFloatAssignments(code);
  code = fixDimensionMismatch(code);
  return code;
};

