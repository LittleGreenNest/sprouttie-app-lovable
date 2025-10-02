import { useState } from 'react';
import { processAndFlipLogo } from '@/utils/processLogo';

export default function ProcessLogo() {
  const [processing, setProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleProcess = async () => {
    setProcessing(true);
    setError('');
    
    try {
      // Use the original image URL
      const imageUrl = window.location.origin + '/images/sprouttie-original.png';
      const result = await processAndFlipLogo(imageUrl);
      setProcessedUrl(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process logo');
      console.error('Error processing logo:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    
    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = 'sprouttie-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Process Logo</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Original Logo</h2>
            <img 
              src="/images/sprouttie-original.png" 
              alt="Original logo" 
              className="max-w-xs border rounded"
            />
          </div>

          <button 
            onClick={handleProcess} 
            disabled={processing}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Flip & Remove Background'}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {processedUrl && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Processed Logo</h2>
              <img 
                src={processedUrl} 
                alt="Processed logo" 
                className="max-w-xs border rounded bg-gray-100"
              />
              <button 
                onClick={handleDownload}
                className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Download Processed Logo
              </button>
              <p className="mt-2 text-sm text-gray-600">
                Download this image and replace /public/images/sprouttie-logo.png with it
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
