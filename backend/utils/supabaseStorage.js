const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ylluxulqxkjircffndxg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Uploads a local file path or Buffer directly to a Supabase Storage Bucket.
 * @param {string|Buffer} fileSource - Local file path or Buffer.
 * @param {string} fileName - Destination path inside bucket (e.g. 'events/PAASCU/file.pdf')
 * @param {string} mimeType - Content type (e.g. 'application/pdf')
 * @param {string} bucket - Bucket name (default: 'proof-documents')
 * @returns {Promise<{ success: boolean, publicUrl: string, path: string }>}
 */
async function uploadToSupabaseBucket(fileSource, fileName, mimeType, bucket = 'proof-documents') {
  const currentKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || supabaseKey;
  if (!currentKey) {
    throw new Error('Supabase Storage key missing in backend/.env! Please add SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const client = supabase || createClient(supabaseUrl, currentKey);

  // 1. Ensure bucket exists & is public
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets && buckets.some(b => b.name === bucket);
    if (!exists) {
      await client.storage.createBucket(bucket, { public: true });
    }
  } catch (err) {
    console.warn('Bucket check warning (will attempt upload anyway):', err.message);
  }

  // 2. Read buffer
  let fileBuffer;
  if (Buffer.isBuffer(fileSource)) {
    fileBuffer = fileSource;
  } else if (typeof fileSource === 'string' && fs.existsSync(fileSource)) {
    fileBuffer = fs.readFileSync(fileSource);
  } else {
    throw new Error('Invalid file source for Supabase upload');
  }

  // 3. Upload
  const cleanPath = fileName.replace(/^\//, '');
  const { data, error } = await client.storage.from(bucket).upload(cleanPath, fileBuffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: true
  });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw error;
  }

  // 4. Get public URL
  const { data: urlData } = client.storage.from(bucket).getPublicUrl(cleanPath);
  const publicUrl = urlData.publicUrl;

  return {
    success: true,
    path: cleanPath,
    publicUrl: publicUrl
  };
}

/**
 * Deletes a file from Supabase Storage Bucket.
 */
async function deleteFromSupabaseBucket(filePath, bucket = 'proof-documents') {
  const currentKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || supabaseKey;
  if (!currentKey || !filePath) return;
  const client = supabase || createClient(supabaseUrl, currentKey);
  const cleanPath = filePath.replace(/^\//, '').replace(/^.*\/storage\/v1\/object\/public\/[^\/]+\//, '');
  try {
    await client.storage.from(bucket).remove([cleanPath]);
  } catch (err) {
    console.warn('Supabase Storage delete warning:', err.message);
  }
}

module.exports = {
  supabase,
  uploadToSupabaseBucket,
  deleteFromSupabaseBucket
};
