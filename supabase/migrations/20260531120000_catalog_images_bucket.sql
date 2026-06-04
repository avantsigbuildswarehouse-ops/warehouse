-- Catalog images for vehicle models and spare codes (max ~2MB, public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images',
  'catalog-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read
CREATE POLICY "catalog_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'catalog-images');

-- Authenticated upload/update/delete
CREATE POLICY "catalog_images_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'catalog-images');

CREATE POLICY "catalog_images_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'catalog-images')
WITH CHECK (bucket_id = 'catalog-images');

CREATE POLICY "catalog_images_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'catalog-images');

-- Service role full access (server uploads)
CREATE POLICY "catalog_images_service_all"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'catalog-images')
WITH CHECK (bucket_id = 'catalog-images');
