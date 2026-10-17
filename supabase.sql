create table favoritos (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  codigo     text not null unique,   -- código do país (ex.: BRA)
  nome       text not null,
  bandeira   text
);

alter table favoritos enable row level security;

create policy "leitura publica"  on favoritos for select to anon using (true);
create policy "insercao publica" on favoritos for insert to anon with check (true);
create policy "remocao publica"  on favoritos for delete to anon using (true);
