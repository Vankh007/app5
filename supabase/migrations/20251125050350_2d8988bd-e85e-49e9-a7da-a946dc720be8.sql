-- Create storage bucket for featured content images
insert into storage.buckets (id, name, public)
values ('featured-images', 'featured-images', true)
on conflict (id) do nothing;

-- Create RLS policies for featured-images bucket
create policy "Public can view featured images"
on storage.objects for select
using (bucket_id = 'featured-images');

create policy "Admins can upload featured images"
on storage.objects for insert
with check (
  bucket_id = 'featured-images' AND
  (select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'admin'
  ))
);

create policy "Admins can update featured images"
on storage.objects for update
using (
  bucket_id = 'featured-images' AND
  (select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'admin'
  ))
);

create policy "Admins can delete featured images"
on storage.objects for delete
using (
  bucket_id = 'featured-images' AND
  (select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'admin'
  ))
);