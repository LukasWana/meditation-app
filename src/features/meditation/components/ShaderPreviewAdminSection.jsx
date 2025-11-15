import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ExternalLink, Layers, Loader2 } from 'lucide-react';

const BUILTIN_SHADERS = [
  { id: 'default', name: 'Default', variant: 'default' },
  { id: 'meditace', name: 'Meditace', variant: 'meditace' },
  { id: 'dychani', name: 'Dýchání', variant: 'dychani' },
  { id: 'hudba', name: 'Hudba', variant: 'hudba' },
  { id: 'settings', name: 'Settings', variant: 'settings' }
];

const STATUS_COLORS = {
  ready: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  queued: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  missing: 'bg-gray-200 text-gray-600'
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('cs-CZ', {
    hour12: false
  });
};

const ShaderPreviewAdminSection = () => {
  const [service, setService] = useState(null);
  const [shaderList, setShaderList] = useState([]);
  const [previews, setPreviews] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const load = async () => {
      try {
        const [{ realtimeShaderPreviewService }, { getShaderList }] = await Promise.all([
          import('@services/realtimeShaderPreviewService'),
          import('@utils/shaderLoader')
        ]);

        if (!isMounted) return;

        setService(realtimeShaderPreviewService);

        const shaderEntries = getShaderList()
          .map((shader) => ({
            id: shader.id.replace(/^shader-/, ''),
            name: shader.name,
            path: shader.path,
            variant: null
          }));

        setShaderList([
          ...shaderEntries,
          ...BUILTIN_SHADERS
        ]);

        const initial = await realtimeShaderPreviewService.fetchAll();
        if (!isMounted) return;

        setPreviews(initial || {});
        setIsLoading(false);

        unsubscribe = realtimeShaderPreviewService.subscribeAll((data) => {
          if (!isMounted) return;
          setPreviews(data || {});
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Nepodařilo se načíst data');
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleRegenerate = async (shaderKey) => {
    if (!service) return;

    setPendingKey(shaderKey);
    try {
      await service.requestRegeneration([shaderKey], { requestedBy: 'simple-admin-ui' });
    } catch (err) {
      setError(err.message || 'Nepodařilo se požadavek odeslat');
    } finally {
      setPendingKey(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!service || shaderList.length === 0) return;
    setIsRegeneratingAll(true);
    try {
      await service.requestRegeneration(shaderList.map((shader) => shader.id), {
        requestedBy: 'simple-admin-ui',
        requestedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Nepodařilo se odeslat hromadnou regeneraci');
    } finally {
      setIsRegeneratingAll(false);
    }
  };

  const handleOpenGallery = (shaderKey) => {
    const url = `/shader-selection?shader=${encodeURIComponent(shaderKey)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const rows = useMemo(() => {
    return shaderList.map((shader) => {
      const meta = previews?.[shader.id] || {};
      return {
        key: shader.id,
        name: shader.name || shader.id,
        status: meta.status || 'missing',
        generatedAt: meta.generatedAt,
        webglVersion: meta.webglVersion || '—',
        source: meta.generationSource || '—',
        previewUrl: meta.previewUrl,
        thumbnailUrl: meta.thumbnailUrl,
        etag: meta.etag || '—',
        errorMessage: meta.errorMessage || '',
        variant: shader.variant,
        path: shader.path
      };
    });
  }, [shaderList, previews]);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-gray-600 text-sm">
          <Loader2 className="animate-spin h-4 w-4" />
          <span>Načítám náhledy shaderů…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-gray-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Shader náhledy
            </h2>
            <p className="text-sm text-gray-500">
              Realtime metadata pro předgenerované náhledy uložené v Firebase.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRegenerateAll}
          disabled={isRegeneratingAll || !service}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {isRegeneratingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerovat všechno
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shader</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generováno</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WebGL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zdroj</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Náhled</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {row.path ? row.path : `Built-in · ${row.variant}`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">etag: {row.etag}</div>
                  {row.errorMessage && (
                    <div className="text-xs text-red-600 mt-1">
                      {row.errorMessage}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || STATUS_COLORS.missing}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDate(row.generatedAt)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.webglVersion}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.source}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.previewUrl ? (
                    <img
                      src={`${row.previewUrl}${row.etag ? `?v=${row.etag}` : ''}`}
                      alt={row.name}
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Chybí náhled</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenGallery(row.key)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Otevřít v galerii
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerate(row.key)}
                      disabled={pendingKey === row.key || isRegeneratingAll || !service}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                      {pendingKey === row.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Regenerovat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShaderPreviewAdminSection;

