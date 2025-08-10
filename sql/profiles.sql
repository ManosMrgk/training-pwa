create table profiles (
  id uuid primary key references auth.users(id),
  role text default 'user'
);

alter table profiles enable row level security;

select id, role from profiles where role = 'admin';

create policy "Allow users to select their profile" on profiles
  for select
  using ( auth.uid() = id );