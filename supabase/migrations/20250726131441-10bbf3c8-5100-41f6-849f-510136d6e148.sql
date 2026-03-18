-- Inserir o resource 'producao-prioridades' na tabela interface_resources
INSERT INTO public.interface_resources (
  resource_key, 
  resource_name, 
  route_path, 
  icon_name, 
  parent_key, 
  is_submenu, 
  order_index
) VALUES (
  'producao-prioridades', 
  'Prioridades de Fabricação', 
  '/producao/prioridades', 
  'PriorityHigh', 
  'producao', 
  true, 
  2
);

-- Buscar o privilege_id do admin (assumindo que existe um privilege padrão para admin)
DO $$
DECLARE
    admin_privilege_id UUID;
BEGIN
    -- Tentar encontrar um privilege de admin existente
    SELECT id INTO admin_privilege_id 
    FROM public.privileges 
    WHERE name ILIKE '%admin%' 
    LIMIT 1;
    
    -- Se não encontrou, criar um privilege de admin
    IF admin_privilege_id IS NULL THEN
        INSERT INTO public.privileges (name, description, permissions)
        VALUES (
            'Administrador', 
            'Acesso completo ao sistema', 
            '{"can_admin": true, "can_create_update_delete": true, "can_create_only": false, "can_view_only": false}'::jsonb
        )
        RETURNING id INTO admin_privilege_id;
    END IF;
    
    -- Inserir a relação privilege_interface_resources para admin
    INSERT INTO public.privilege_interface_resources (privilege_id, resource_key)
    VALUES (admin_privilege_id, 'producao-prioridades')
    ON CONFLICT (privilege_id, resource_key) DO NOTHING;
    
    RAISE NOTICE 'Resource producao-prioridades criado e associado ao privilege admin: %', admin_privilege_id;
END $$;