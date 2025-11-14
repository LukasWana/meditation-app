/**
 * WebGL Program Manager
 * Handles shader compilation, linking, and caching
 * Inspirováno VJ Shader projektem
 */

/**
 * Compiles a shader (vertex or fragment)
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
 * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param {string} source - Shader source code
 * @param {Function} onError - Error callback
 * @returns {WebGLShader|null} Compiled shader or null
 */
function compileShader(gl, type, source, onError) {
  const shader = gl.createShader(type);
  if (!shader) {
    onError('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  const log = gl.getShaderInfoLog(shader);
  const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
  onError(`Error compiling ${shaderType} shader:\n${log}`);
  gl.deleteShader(shader);
  return null;
}

/**
 * Links vertex and fragment shaders into a program
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
 * @param {WebGLShader} vertexShader - Compiled vertex shader
 * @param {WebGLShader} fragmentShader - Compiled fragment shader
 * @param {Function} onError - Error callback
 * @returns {WebGLProgram|null} Linked program or null
 */
function linkProgram(gl, vertexShader, fragmentShader, onError) {
  const program = gl.createProgram();
  if (!program) {
    onError('Failed to create program');
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Shaders can be deleted after linking
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    onError(`Error linking program:\n${log}`);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Extracts uniform and attribute locations from a program
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
 * @param {WebGLProgram} program - Linked program
 * @returns {Object} Program info with uniforms and attributes
 */
function extractLocations(gl, program) {
  return {
    program,
    uniforms: {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_mouse: gl.getUniformLocation(program, 'u_mouse'),
      u_intensity: gl.getUniformLocation(program, 'u_intensity'),
      u_breathPhase: gl.getUniformLocation(program, 'u_breathPhase'),
      u_breathProgress: gl.getUniformLocation(program, 'u_breathProgress'),
      // Audio uniformy
      u_audioAmplitude: gl.getUniformLocation(program, 'u_audioAmplitude'),
      u_audioBass: gl.getUniformLocation(program, 'u_audioBass'),
      u_audioMid: gl.getUniformLocation(program, 'u_audioMid'),
      u_audioTreble: gl.getUniformLocation(program, 'u_audioTreble'),
      u_audioFrequencies: gl.getUniformLocation(program, 'u_audioFrequencies'),
      // Quality uniform pro náročné shadery
      u_quality: gl.getUniformLocation(program, 'u_quality'),
    },
    attribs: {
      a_position: gl.getAttribLocation(program, 'a_position'),
    },
  };
}

/**
 * Creates a program manager for caching shader programs
 * @returns {Object} Program manager with methods
 */
export function createProgramManager() {
  const state = {
    programs: {}, // Key: string, Value: { program, uniforms, attribs, lastUsed, useCount }
    stats: {
      hits: 0,
      misses: 0,
      total: 0
    }
  };

  return {
    /**
     * Gets or creates a WebGL program
     * Returns cached program if available, otherwise compiles and caches
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
     * @param {string} key - Unique key for the shader (e.g., 'meditation', 'mini-ShaderName')
     * @param {string} vertexSource - Vertex shader source
     * @param {string} fragmentSource - Fragment shader source
     * @param {Function} onError - Error callback (key, message | null)
     * @returns {Object|null} Program info with program, uniforms, attribs or null
     */
    getProgram(gl, key, vertexSource, fragmentSource, onError) {
      // Check cache
      const cached = state.programs[key];
      if (cached) {
        // Verify program is still valid
        if (gl.isProgram(cached.program)) {
          // Aktualizuj statistiky a tracking použití
          cached.lastUsed = Date.now();
          cached.useCount = (cached.useCount || 0) + 1;
          state.stats.hits++;
          state.stats.total++;
          onError(key, null); // Clear any previous errors
          return cached;
        } else {
          // Program was lost (context lost), remove from cache
          delete state.programs[key];
        }
      }

      // Cache miss
      state.stats.misses++;
      state.stats.total++;

      // Compile shaders
      const vertexShader = compileShader(
        gl,
        gl.VERTEX_SHADER,
        vertexSource,
        (msg) => onError(key, msg)
      );
      const fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentSource,
        (msg) => onError(key, msg)
      );

      if (!vertexShader || !fragmentShader) {
        return null;
      }

      // Link program
      const program = linkProgram(
        gl,
        vertexShader,
        fragmentShader,
        (msg) => onError(key, msg)
      );

      if (!program) {
        return null;
      }

      // Extract locations and cache
      const programInfo = extractLocations(gl, program);
      // Přidej tracking informace
      programInfo.lastUsed = Date.now();
      programInfo.useCount = 1;
      state.programs[key] = programInfo;
      onError(key, null); // Clear errors on success

      return programInfo;
    },

    /**
     * Deletes a specific program
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
     * @param {string} key - Program key
     */
    deleteProgram(gl, key) {
      const programInfo = state.programs[key];
      if (programInfo) {
        if (gl.isProgram(programInfo.program)) {
          gl.deleteProgram(programInfo.program);
        }
        delete state.programs[key];
      }
    },

    /**
     * Cleans up all cached programs
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
     */
    cleanup(gl) {
      Object.keys(state.programs).forEach((key) => {
        this.deleteProgram(gl, key);
      });
    },

    /**
     * Gets the current state (for debugging)
     * @returns {Object} Current state
     */
    getState() {
      return state;
    },

    /**
     * Gets cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
      const hitRate = state.stats.total > 0
        ? (state.stats.hits / state.stats.total * 100).toFixed(2)
        : 0;

      return {
        programCount: Object.keys(state.programs).length,
        hits: state.stats.hits,
        misses: state.stats.misses,
        total: state.stats.total,
        hitRate: `${hitRate}%`,
        programs: Object.entries(state.programs).map(([key, value]) => ({
          key,
          useCount: value.useCount || 0,
          lastUsed: Date.now() - (value.lastUsed || Date.now()),
          age: Date.now() - (value.createdAt || Date.now())
        }))
      };
    },

    /**
     * Cleans up least recently used programs (LRU)
     * @param {number} maxSize - Maximum number of programs to keep
     */
    cleanupLRU(maxSize = 20) {
      const entries = Object.entries(state.programs);
      if (entries.length <= maxSize) {
        return;
      }

      // Seřaď podle posledního použití
      entries.sort((a, b) => (a[1].lastUsed || 0) - (b[1].lastUsed || 0));

      // Odstraň nejstarší programy
      const toRemove = entries.length - maxSize;
      for (let i = 0; i < toRemove; i++) {
        const [key] = entries[i];
        delete state.programs[key];
      }

      console.log(`🧹 cleanupLRU: Vyčištěno ${toRemove} programů z cache`);
    },
  };
}


