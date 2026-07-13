-- Seed a public demo share route based on:
-- https://999hkkzjvy-cell.github.io/citywalk/routes/nanjing-mochou-tongjun
--
-- This script is intentionally idempotent. It only touches the fixed demo
-- owner, route, stops, and share code below.

do $$
declare
  seed_owner_id uuid := '00000000-0000-4000-8000-000000000101';
  seed_route_id uuid := '00000000-0000-4000-8000-000000000201';
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    seed_owner_id,
    'authenticated',
    'authenticated',
    'seed+culture-city-walk@example.invalid',
    now(),
    '{"provider":"email","providers":["email"],"seed":true}'::jsonb,
    '{"display_name":"Cultural Citywalk Seed"}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update
  set
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  insert into public.profiles (id, display_name)
  values (seed_owner_id, 'Cultural Citywalk Seed')
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    updated_at = now();

  delete from public.route_stops where route_id = seed_route_id;
  delete from public.route_shares where share_code = 'nanjing-minguo';

  insert into public.routes (
    id,
    owner_id,
    explore_mode,
    title,
    city,
    start_time,
    end_time,
    status,
    visibility,
    theme_filters,
    preferences,
    generation_summary,
    version
  )
  values (
    seed_route_id,
    seed_owner_id,
    'complete',
    '金陵城南 · 民国记忆',
    '南京',
    '09:00',
    '14:30',
    'ready',
    'shared',
    '["历史","建筑","美食","书店"]'::jsonb,
    '{
      "dateLabel": "半日漫步",
      "durationHours": 4.5,
      "walkingRangeKm": "约 4 km",
      "pace": "轻松漫步",
      "distanceKm": 4,
      "budget": "人均约 ¥130",
      "legacySlug": "nanjing-mochou-tongjun",
      "legacyUrl": "https://999hkkzjvy-cell.github.io/citywalk/routes/nanjing-mochou-tongjun",
      "mustVisits": ["童寯故居", "甘熙故居", "太平南路民国建筑群"],
      "routeIntro": "手巧馄饨 → 童寯故居 → 甘熙故居 → 瓶子菜馆",
      "completionTitle": "金陵城南记忆守护者"
    }'::jsonb,
    '{
      "source": "legacy_citywalk",
      "summary": "水西门、升州路、太平南路、文昌巷与熙南里串起的南京城南半日路线。",
      "stats": ["全程约 4 km", "6 个站点", "15+ 处保护建筑", "人均预算约 ¥130"]
    }'::jsonb,
    1
  )
  on conflict (id) do update
  set
    title = excluded.title,
    city = excluded.city,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    status = excluded.status,
    visibility = excluded.visibility,
    theme_filters = excluded.theme_filters,
    preferences = excluded.preferences,
    generation_summary = excluded.generation_summary,
    updated_at = now();

  insert into public.route_stops (
    id,
    route_id,
    sort_order,
    arrival_time,
    stay_minutes,
    constraint_type,
    source_type,
    title_snapshot,
    note,
    walking_from_previous
  )
  values
    (
      '00000000-0000-4000-8000-000000000401',
      seed_route_id,
      0,
      '09:00',
      30,
      'start',
      'imported',
      '手巧馄饨（莫愁新村店）',
      '{
        "text": "南湖烟火 · 舌尖密码。建邺区南湖路莫愁新村22号。老南京馄饨讲究皮薄不破、馅满不腻；一碗红汤辣油馄饨配锅贴，是南湖老街坊的早餐标配。",
        "area": "南湖",
        "address": "建邺区南湖路莫愁新村22号",
        "badge": "南湖美食",
        "task": "点一碗馄饨 + 一只烧饼，拍照记录，标记“南湖烟火”。"
      }'::jsonb,
      null
    ),
    (
      '00000000-0000-4000-8000-000000000402',
      seed_route_id,
      1,
      '09:45',
      25,
      'recommended',
      'imported',
      '水西门遗址广场',
      '{
        "text": "城门旧梦 · 水陆沧桑。水西门大街与凤台南路交叉口。这里曾是南京城西的重要水陆门户，遗址广场适合对照旧城门想象三山门与瓮城的形制。",
        "area": "水西门",
        "address": "水西门大街与凤台南路交叉口",
        "badge": "遗址公园",
        "task": "寻找“三山门”铭牌，对照遗址想象当年福船形瓮城的形状，拍一张古今对照照片。"
      }'::jsonb,
      '{"minutes":15,"distanceMeters":900,"label":"步行约15分钟"}'::jsonb
    ),
    (
      '00000000-0000-4000-8000-000000000403',
      seed_route_id,
      2,
      '10:30',
      40,
      'recommended',
      'imported',
      '太平南路民国建筑群',
      '{
        "text": "十里洋场 · 书店旧事。升州路、建康路一路走到太平南路，沿线可看中华书局旧址、圣保罗教堂、中南银行南京分行等民国建筑。",
        "area": "太平南路",
        "address": "太平南路沿线",
        "badge": "历史街区",
        "task": "在古籍书店门口拍照，留意浙江庆和昌记支店的马赛克拼贴店名和老广告。"
      }'::jsonb,
      '{"minutes":20,"distanceMeters":1300,"label":"步行约20分钟（升州路→建康路→太平南路）"}'::jsonb
    ),
    (
      '00000000-0000-4000-8000-000000000404',
      seed_route_id,
      3,
      '11:25',
      45,
      'must_visit',
      'imported',
      '童寯故居 · 童寯建筑馆',
      '{
        "text": "大师书房 · 建筑的体温。秦淮区文昌巷52号。童寯先生亲自设计的二层小楼，红砖清水墙、毛石墙基与斜屋顶里藏着建筑师的克制和温度。",
        "area": "文昌巷",
        "address": "秦淮区文昌巷52号",
        "badge": "省级文保",
        "task": "提前预约；在故居前留影，寻找二楼探客小窗和南院小门。"
      }'::jsonb,
      '{"minutes":5,"distanceMeters":350,"label":"步行约5分钟，拐进文昌巷"}'::jsonb
    ),
    (
      '00000000-0000-4000-8000-000000000405',
      seed_route_id,
      4,
      '12:40',
      60,
      'must_visit',
      'imported',
      '甘熙故居 · 熙南里',
      '{
        "text": "九十九间半 · 金陵大宅门。秦淮区中山南路400号。甘熙故居是南京保存完整的清代民居建筑群之一，青砖小瓦马头墙把城南生活折进院落里。",
        "area": "熙南里",
        "address": "秦淮区中山南路400号",
        "badge": "全国重点文保",
        "task": "避开周一闭馆；找到津逮楼和友恭堂，在庭院里拍一张马头墙与蓝天的合影。"
      }'::jsonb,
      '{"minutes":20,"distanceMeters":1200,"label":"步行约20分钟，回到熙南里"}'::jsonb
    ),
    (
      '00000000-0000-4000-8000-000000000406',
      seed_route_id,
      5,
      '14:00',
      60,
      'meal',
      'imported',
      '瓶子菜馆（熙南里店）',
      '{
        "text": "淮扬新韵 · 收官之宴。秦淮区中山南路400号熙南里10号。青砖黛瓦之间吃一餐创意淮扬菜，让一路的民国记忆、市井烟火和建筑光影沉下来。",
        "area": "熙南里",
        "address": "秦淮区中山南路400号熙南里10号",
        "badge": "创意淮扬",
        "task": "点一壶茶或一杯酒，举杯敬今天走过的路。"
      }'::jsonb,
      '{"minutes":2,"distanceMeters":150,"label":"步行约2分钟，熙南里内"}'::jsonb
    );

  insert into public.route_shares (
    id,
    route_id,
    share_code,
    route_version,
    allow_copy,
    expires_at,
    revoked_at,
    created_by
  )
  values (
    '00000000-0000-4000-8000-000000000301',
    seed_route_id,
    'nanjing-minguo',
    1,
    true,
    null,
    null,
    seed_owner_id
  )
  on conflict (share_code) do update
  set
    route_id = excluded.route_id,
    route_version = excluded.route_version,
    allow_copy = excluded.allow_copy,
    expires_at = null,
    revoked_at = null;
end $$;
