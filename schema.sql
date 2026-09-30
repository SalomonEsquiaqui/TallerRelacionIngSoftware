-- Tu esquema ya existe: NO necesitas crear tablas.
-- Ejecuta esto solo para activar tiempo real (y acceso anon si tienes RLS activado).
do $$ declare t text; begin
  foreach t in array array['cliente','producto','venta','detalle_venta'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_all on %I', t);
    execute format('create policy demo_all on %I for all to anon using (true) with check (true)', t);
  end loop; end $$;
