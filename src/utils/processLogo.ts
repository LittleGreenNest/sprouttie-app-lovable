import { supabase } from '@/integrations/supabase/client';

export async function processAndFlipLogo(imageUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('process-logo', {
    body: { imageUrl }
  });

  if (error) throw error;
  
  // Convert base64 to blob and return object URL
  const base64Data = data.imageUrl.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });
  
  return URL.createObjectURL(blob);
}
