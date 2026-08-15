# Supabase

Las migraciones SQL del proyecto se guardan en `migrations/`. Todas las tablas tienen Row Level Security y políticas explícitas antes de recibir acceso desde la aplicación.

## Primera configuración

1. Abrir **SQL Editor** en el proyecto `Juegos de Vocabulario`.
2. Copiar y ejecutar `migrations/202608140001_initial_access.sql`.
3. Crear el usuario del profesor en **Authentication → Users**. No habilitar registro público.
4. Copiar su UUID y ejecutar:

```sql
insert into public.teacher_profiles (user_id, display_name)
values ('UUID_DEL_USUARIO', 'Miguel Iglesias');
```

5. Copiar la clave **Publishable** desde **Project Settings → API Keys** y añadirla como variable `VITE_SUPABASE_PUBLISHABLE_KEY` en el despliegue.

La clave `service_role` y la contraseña de la base de datos nunca deben añadirse a GitHub ni al navegador.
