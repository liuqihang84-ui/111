extends Node3D
## A small three-dimensional stage for each campaign map. Rendering never owns
## game rules: visible trees and solid props use the model's collision positions.

const Art = preload("res://scripts/pixel_art.gd")
const UI_FONT = preload("res://assets/fonts/lumenfall-ui-full.otf")
const GROUND_SHADER = preload("res://shaders/campaign_ground.gdshader")
const HERO_PIXEL_SIZE: float = 0.034
const GOLD: Color = Color("ffe3a3")
const DANGER: Color = Color("ed6685")
const ROUTE_STEP: float = 0.65
const FOREST_TREE_PATH: String = "res://assets/environments/forest_ancient_tree.png"
const FOREST_TREE_FOOT_RATIO: Vector2 = Vector2(0.546875, 0.8984375)

var camera: Camera3D
var player_sprite: Sprite3D
var _model: Variant
var _revision: int = -1
var _map_id: String = ""
var _stage: Node3D
var _ground_material: ShaderMaterial
var _actors: Node3D
var _effects: Node3D
var _environment: Environment
var _sun: DirectionalLight3D
var _player_shadow: MeshInstance3D
var _player_light: OmniLight3D
var _blade: MeshInstance3D
var _pulse: MeshInstance3D
var _shield: MeshInstance3D
var _exit_ring: MeshInstance3D
var _camp_fire: Sprite3D
var _enemy_nodes: Dictionary = {}
var _projectile_nodes: Array[Node3D] = []
var _hazard_nodes: Array[Node3D] = []
var _object_nodes: Array[Dictionary] = []
var _boss_node: Dictionary = {}
var _occluders: Array[Dictionary] = []
var _solid_occluders: Array[Dictionary] = []
var _path_segments: Array[Dictionary] = []
var _decor_lights: Array[OmniLight3D] = []
var _decor_plants: Array[Sprite3D] = []
var _minor_stones: Array[MeshInstance3D] = []
var _bounds: Rect2 = Rect2(-12.0, -9.0, 24.0, 18.0)
var _region: String = "forest"
var _palette: Dictionary = {}
var _visual_time: float = 0.0
var _ending_lit: bool = false
var _lantern_ring: MeshInstance3D
var _quality: String = "standard"
var _forest_tree_texture: Texture2D
var _forest_tree_rect: Rect2i = Rect2i()
var _forest_tree_foot: Vector2 = Vector2.ZERO


func build(model: Variant) -> void:
	_model = model
	if camera == null:
		_create_environment()
	_rebuild_map(model)
	sync(model, 0.0)


func sync(model: Variant, delta: float) -> void:
	_model = model
	if camera == null:
		build(model)
		return
	if _map_id != str(model.map_id) or _revision != int(model.map_revision):
		_rebuild_map(model)
	_visual_time += maxf(delta, 0.0)
	var player_position: Vector2 = model.player_position
	var player_point: Vector3 = _point(player_position, 0.04)
	player_sprite.position = player_point
	_player_shadow.position = _point(player_position, 0.045)
	_player_light.position = player_point + Vector3(0.0, 0.7, 0.0)
	var direction: Vector2 = model.last_direction
	var action: String = "idle"
	if float(model.attack_for) > 0.0:
		action = "attack"
	elif bool(model.moving):
		action = "walk"
	elif float(model.shield_for) > 0.0:
		action = "pulse"
	var frame: int = int(float(model.elapsed) * (10.0 if action == "walk" else 6.0))
	player_sprite.texture = Art.hero_direction(_screen_direction(direction), frame, action)
	player_sprite.modulate = Color(1.0, 1.0, 1.0, 0.45 if float(model.invulnerable_for) > 0.0 and int(_visual_time * 12.0) % 2 == 0 else 1.0)
	_sync_camera(player_position, delta)
	_sync_enemies(model)
	_sync_travelling_effects(model)
	_sync_objects(model, player_position)
	_sync_boss(model)
	_sync_player_effects(model, player_position, direction)
	_sync_occlusion(delta)
	if _camp_fire != null:
		_camp_fire.texture = Art.campfire(int(_visual_time * 7.0))
	for index: int in range(_decor_lights.size()):
		_decor_lights[index].light_energy = 1.15 + sin(_visual_time * 3.0 + float(index)) * 0.045
	var ending: bool = bool(model.flags.get("ending", false))
	if ending != _ending_lit:
		_ending_lit = ending
		_environment.ambient_light_color = Color("dfd0a9") if ending else _palette["ambient"]
		_environment.ambient_light_energy = 1.0 if ending else 0.82
		var exit_material: StandardMaterial3D = _exit_ring.material_override as StandardMaterial3D
		exit_material.albedo_color = GOLD if ending else Color("90c8b3")


func apply_settings(settings: Dictionary) -> void:
	_quality = String(settings.get("quality", "standard"))
	if _sun != null:
		_sun.shadow_enabled = _quality != "low"
	if camera != null:
		camera.far = 75.0 if _quality == "low" else 100.0
	if _player_light != null:
		_player_light.visible = _quality != "low"
	for index: int in range(_decor_plants.size()):
		_decor_plants[index].visible = _quality != "low" or index % 3 == 0
	for pebble: MeshInstance3D in _minor_stones:
		pebble.visible = _quality != "low"


func _create_environment() -> void:
	var world_environment: WorldEnvironment = WorldEnvironment.new()
	_environment = Environment.new()
	_environment.background_mode = Environment.BG_COLOR
	_environment.background_color = Color("102632")
	_environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_environment.ambient_light_color = Color("a1bbb0")
	_environment.ambient_light_energy = 0.82
	_environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	# Atmospheric depth comes from palette and layers, not unsupported effects.
	_environment.fog_enabled = false
	world_environment.environment = _environment
	add_child(world_environment)
	_sun = DirectionalLight3D.new()
	_sun.rotation_degrees = Vector3(-55.0, -35.0, 0.0)
	_sun.light_color = Color("d9d4b3")
	_sun.light_energy = 0.82
	_sun.shadow_enabled = true
	_sun.directional_shadow_max_distance = 45.0
	add_child(_sun)
	camera = Camera3D.new()
	camera.name = "CampaignCamera"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 12.4
	camera.near = 0.05
	camera.far = 100.0
	camera.position = Vector3(11.5, 16.3, 11.5)
	add_child(camera)
	camera.look_at(Vector3.ZERO, Vector3.UP)
	camera.current = true


func _rebuild_map(model: Variant) -> void:
	_map_id = str(model.map_id)
	_revision = int(model.map_revision)
	for old_root: Node3D in [_stage, _actors, _effects]:
		if old_root != null:
			remove_child(old_root)
			old_root.queue_free()
	_stage = Node3D.new()
	_stage.name = "Stage_" + _map_id
	add_child(_stage)
	_actors = Node3D.new()
	_actors.name = "Actors"
	add_child(_actors)
	_effects = Node3D.new()
	_effects.name = "Effects"
	add_child(_effects)
	_enemy_nodes.clear()
	_projectile_nodes.clear()
	_hazard_nodes.clear()
	_object_nodes.clear()
	_boss_node.clear()
	_occluders.clear()
	_solid_occluders.clear()
	_path_segments.clear()
	_decor_lights.clear()
	_decor_plants.clear()
	_minor_stones.clear()
	var info: Dictionary = model.map_info()
	_bounds = info["bounds"]
	_region = String(info.get("region", "forest"))
	if _region == "sanctum":
		_region = "sanctuary"
	_palette = _region_palette(_region)
	if _region == "forest":
		_load_forest_tree()
	_environment.background_color = _palette["backdrop"]
	_environment.ambient_light_color = _palette["ambient"]
	_ending_lit = false
	_create_ground(info)
	_create_paths(info, model.objects)
	_create_collision_scenery(info)
	_create_surroundings(info)
	_create_camp_and_exit(info)
	_create_map_objects(model.objects)
	_create_characters(model)
	_create_player_effects()
	var initial_position: Vector2 = model.player_position
	camera.position = _point(initial_position) + Vector3(11.5, 16.3, 11.5)
	camera.look_at(_point(initial_position, 0.5), Vector3.UP)


func _region_palette(region: String) -> Dictionary:
	match region:
		"village":
			return {"ground": Color("374750"), "path": Color("4b5f63"), "stone": Color("667a80"), "wood": Color("745741"), "foliage": Color("7fa99b"), "backdrop": Color("22363b"), "ambient": Color("95b4bc")}
		"marsh":
			return {"ground": Color("244047"), "path": Color("34545a"), "stone": Color("637d80"), "wood": Color("645e49"), "foliage": Color("779f94"), "backdrop": Color("283c45"), "ambient": Color("9eb5c3")}
		"ruins":
			return {"ground": Color("2a394b"), "path": Color("445466"), "stone": Color("728998"), "wood": Color("565b54"), "foliage": Color("668c7c"), "backdrop": Color("222e42"), "ambient": Color("a6bccd")}
		"city":
			return {"ground": Color("333541"), "path": Color("4a4b5b"), "stone": Color("777482"), "wood": Color("61535b"), "foliage": Color("738b84"), "backdrop": Color("28283c"), "ambient": Color("b3b0c8")}
		"sanctuary":
			return {"ground": Color("39364c"), "path": Color("524658"), "stone": Color("81768b"), "wood": Color("49384b"), "foliage": Color("87808f"), "backdrop": Color("231f37"), "ambient": Color("b9adc5")}
		_:
			return {"ground": Color("18383f"), "path": Color("29474d"), "stone": Color("48656b"), "wood": Color("4c514c"), "foliage": Color("7baca5"), "backdrop": Color("102732"), "ambient": Color("91b6c4")}


func _create_ground(info: Dictionary) -> void:
	var center: Vector2 = _bounds.get_center()
	var ground: MeshInstance3D = _box(_stage, _point(center, -0.26), Vector3(_bounds.size.x, 0.5, _bounds.size.y), _palette["ground"])
	ground.name = "TraversableGround"
	var terrain_material: ShaderMaterial = ShaderMaterial.new()
	terrain_material.shader = GROUND_SHADER
	terrain_material.set_shader_parameter("ground_color", _palette["ground"])
	terrain_material.set_shader_parameter("path_color", _palette["path"])
	terrain_material.set_shader_parameter("map_origin", _bounds.position)
	terrain_material.set_shader_parameter("map_size", _bounds.size)
	terrain_material.set_shader_parameter("variation", 0.025)
	ground.material_override = terrain_material
	_ground_material = terrain_material
	# A lower perimeter gives the stage thickness and keeps the horizon quiet.
	_box(_stage, _point(center, -0.72), Vector3(_bounds.size.x + 12.0, 0.4, _bounds.size.y + 12.0), Color(_palette["ground"]).darkened(0.3))
	if _region == "marsh" or _region == "forest":
		var water_color: Color = Color("335c67") if _region == "marsh" else Color("3d7278")
		_box(_stage, Vector3(center.x, -0.4, _bounds.end.y + 2.8), Vector3(_bounds.size.x + 6.0, 0.08, 4.8), water_color)
	var spawn: Vector2 = info["spawn"]
	var exit_position: Vector2 = info["exit"]
	_create_lamp(_stage, spawn + Vector2(-1.2, 0.0), 1.65)
	_create_lamp(_stage, exit_position + Vector2(1.0, 0.0), 1.9)


func _create_paths(info: Dictionary, objects: Array) -> void:
	var grid: AStarGrid2D = AStarGrid2D.new()
	var grid_size: Vector2i = Vector2i(int(_bounds.size.x / ROUTE_STEP) + 1, int(_bounds.size.y / ROUTE_STEP) + 1)
	grid.region = Rect2i(Vector2i.ZERO, grid_size)
	grid.cell_size = Vector2(ROUTE_STEP, ROUTE_STEP)
	grid.offset = _bounds.position
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	grid.update()
	var trees: Array = info.get("trees", [])
	var obstacles: Array = info.get("obstacles", [])
	for grid_y: int in range(grid_size.y):
		for grid_x: int in range(grid_size.x):
			var cell: Vector2i = Vector2i(grid_x, grid_y)
			var point: Vector2 = grid.get_point_position(cell)
			var blocked: bool = false
			for tree: Vector2 in trees:
				if point.distance_squared_to(tree) < 0.78 * 0.78:
					blocked = true
					break
			if not blocked:
				for obstacle: Dictionary in obstacles:
					var obstacle_position: Vector2 = obstacle["position"]
					var safe_radius: float = float(obstacle["radius"]) + 0.3
					if point.distance_squared_to(obstacle_position) < safe_radius * safe_radius:
						blocked = true
						break
			grid.set_point_solid(cell, blocked)
	var targets: Array[Vector2] = [info["spawn"], info["camp"]]
	for object: Dictionary in objects:
		if String(object.get("type", "")) != "npc" and not bool(object.get("hidden", false)):
			var object_position: Vector2 = object["position"]
			targets.append(object_position)
	targets.append(info["exit"])
	for index: int in range(targets.size() - 1):
		var from_id: Vector2i = _nearest_route_cell(grid, targets[index], grid_size)
		var to_id: Vector2i = _nearest_route_cell(grid, targets[index + 1], grid_size)
		var cells: Array[Vector2i] = grid.get_id_path(from_id, to_id)
		if cells.size() < 2:
			continue
		var route: Array[Vector2] = []
		for cell: Vector2i in cells:
			route.append(grid.get_point_position(cell))
		var start: Vector2 = route[0]
		var previous_direction: Vector2 = (route[1] - start).normalized()
		for route_index: int in range(2, route.size()):
			var next_direction: Vector2 = (route[route_index] - route[route_index - 1]).normalized()
			if next_direction.distance_squared_to(previous_direction) > 0.001:
				_add_path_segment(start, route[route_index - 1])
				start = route[route_index - 1]
			previous_direction = next_direction
		_add_path_segment(start, route[-1])
	_create_route_mask()


func _nearest_route_cell(grid: AStarGrid2D, point: Vector2, grid_size: Vector2i) -> Vector2i:
	var relative: Vector2 = (point - _bounds.position) / ROUTE_STEP
	var cell: Vector2i = Vector2i(clampi(int(roundf(relative.x)), 0, grid_size.x - 1), clampi(int(roundf(relative.y)), 0, grid_size.y - 1))
	if not grid.is_point_solid(cell):
		return cell
	for radius: int in range(1, 6):
		for y: int in range(-radius, radius + 1):
			for x: int in range(-radius, radius + 1):
				var candidate: Vector2i = cell + Vector2i(x, y)
				if grid.is_in_boundsv(candidate) and not grid.is_point_solid(candidate):
					return candidate
	return cell


func _add_path_segment(start: Vector2, end: Vector2) -> void:
	if start.distance_squared_to(end) < 0.01:
		return
	_path_segments.append({"start": start, "end": end})


func _create_route_mask() -> void:
	# Paint the union of navigation ribbons into one floor material. This avoids
	# coplanar strips, transparent sorting over sprites, and visible polygon joins.
	const RESOLUTION: int = 256
	var image: Image = Image.create(RESOLUTION, RESOLUTION, false, Image.FORMAT_R8)
	image.fill(Color.BLACK)
	var width: float = 1.2 if _region != "village" else 1.85
	var margin: float = width * 0.5 + 0.16
	var pixels_per_world: Vector2 = Vector2(RESOLUTION, RESOLUTION) / _bounds.size
	for segment: Dictionary in _path_segments:
		var start: Vector2 = segment["start"]
		var end: Vector2 = segment["end"]
		var minimum: Vector2 = (start.min(end) - Vector2.ONE * margin - _bounds.position) * pixels_per_world
		var maximum: Vector2 = (start.max(end) + Vector2.ONE * margin - _bounds.position) * pixels_per_world
		for pixel_y: int in range(clampi(int(floorf(minimum.y)), 0, RESOLUTION - 1), clampi(int(ceilf(maximum.y)) + 1, 0, RESOLUTION)):
			for pixel_x: int in range(clampi(int(floorf(minimum.x)), 0, RESOLUTION - 1), clampi(int(ceilf(maximum.x)) + 1, 0, RESOLUTION)):
				var point: Vector2 = _bounds.position + (Vector2(pixel_x, pixel_y) + Vector2.ONE * 0.5) / pixels_per_world
				var distance: float = Geometry2D.get_closest_point_to_segment(point, start, end).distance_to(point)
				var coverage: float = 1.0 - smoothstep(width * 0.29, width * 0.5 + 0.11, distance)
				if coverage > image.get_pixel(pixel_x, pixel_y).r:
					image.set_pixel(pixel_x, pixel_y, Color(coverage, coverage, coverage, 1.0))
	_ground_material.set_shader_parameter("route_mask", ImageTexture.create_from_image(image))


func _create_collision_scenery(info: Dictionary) -> void:
	var trees: Array = info.get("trees", [])
	for index: int in range(trees.size()):
		var position: Vector2 = trees[index]
		_create_tree(position, index, 1.0)
	var obstacles: Array = info.get("obstacles", [])
	for index: int in range(obstacles.size()):
		var obstacle: Dictionary = obstacles[index]
		var position: Vector2 = obstacle["position"]
		var radius: float = float(obstacle["radius"])
		var visual_type: String = String(obstacle.get("visual_type", ""))
		var first_child: int = _stage.get_child_count()
		var height: float = 1.0
		if visual_type == "house":
			_create_small_house(position, radius, index)
			height = 2.6
		elif visual_type == "pillar" or (_region == "ruins" and visual_type.is_empty()):
			_create_pillar(position, radius, 1.6 + float(index % 3) * 0.45)
			height = 1.6 + float(index % 3) * 0.45
		elif visual_type == "root" or (_region == "sanctuary" and visual_type.is_empty()):
			var root: MeshInstance3D = _cylinder(_stage, _point(position, 0.4), radius, 0.85, _palette["wood"])
			root.scale.x = 0.8
			root.scale.z = 0.95
		else:
			_create_rock(position, radius, index)
		var pieces: Array[Dictionary] = []
		for child_index: int in range(first_child, _stage.get_child_count()):
			var piece: MeshInstance3D = _stage.get_child(child_index) as MeshInstance3D
			if piece != null:
				var material: StandardMaterial3D = piece.material_override as StandardMaterial3D
				pieces.append({"node": piece, "opacity": material.albedo_color.a if material != null else 1.0})
		_solid_occluders.append({"position": position, "radius": radius, "height": height, "pieces": pieces})


func _create_surroundings(info: Dictionary) -> void:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = int(_map_id.hash()) + 419
	var center: Vector2 = _bounds.get_center()
	if _region in ["village", "city"]:
		for side: int in [-1, 1]:
			for index: int in range(4):
				var house_position: Vector2 = Vector2(center.x + float(side) * (_bounds.size.x * 0.5 + 2.3), _bounds.position.y + 2.0 + float(index) * (_bounds.size.y - 4.0) / 3.0)
				_create_house(house_position, side, _region == "city")
		_create_arch(info["exit"], _region == "city")
	elif _region == "ruins":
		for index: int in range(7):
			var ruin_position: Vector2 = Vector2(_bounds.position.x - 1.8 if index % 2 == 0 else _bounds.end.x + 1.8, _bounds.position.y + 1.0 + float(index) * _bounds.size.y / 7.0)
			_create_pillar(ruin_position, 0.7, 2.0 + float(index % 3) * 0.6)
		_create_arch(info["exit"], true)
	elif _region == "sanctuary":
		_create_ancient_tree(Vector2(center.x, _bounds.position.y - 3.0))
		for index: int in range(10):
			var angle: float = float(index) * TAU / 10.0
			var rim_position: Vector2 = center + Vector2(cos(angle) * (_bounds.size.x * 0.5 + 2.2), sin(angle) * (_bounds.size.y * 0.5 + 2.2))
			_create_rock(rim_position, 0.9, index)
	else:
		for index: int in range(24):
			var side: int = index % 4
			var rim_position: Vector2
			match side:
				0: rim_position = Vector2(rng.randf_range(_bounds.position.x - 2.0, _bounds.end.x + 2.0), _bounds.position.y - rng.randf_range(1.5, 4.0))
				1: rim_position = Vector2(_bounds.position.x - rng.randf_range(1.5, 3.5), rng.randf_range(_bounds.position.y, _bounds.end.y))
				2: rim_position = Vector2(_bounds.end.x + rng.randf_range(1.5, 3.5), rng.randf_range(_bounds.position.y, _bounds.end.y))
				_: rim_position = Vector2(rng.randf_range(_bounds.position.x, _bounds.end.x), _bounds.end.y + rng.randf_range(2.0, 4.0))
			_create_tree(rim_position, index + 40, rng.randf_range(0.8, 1.25))
		_create_bridge(Vector2(center.x, _bounds.end.y + 2.0))
	# Small tufts stay out of the navigation ribbon and do not imply solid walls.
	var plant_count: int = 340 if _region in ["forest", "marsh", "sanctuary"] else 130
	for index: int in range(plant_count):
		var plant_position: Vector2 = Vector2(rng.randf_range(_bounds.position.x + 0.6, _bounds.end.x - 0.6), rng.randf_range(_bounds.position.y + 0.6, _bounds.end.y - 0.6))
		if _near_route(plant_position, 1.15):
			continue
		var plant: Sprite3D = _sprite(_stage, Art.flower() if index % 9 == 0 else Art.grass(), _point(plant_position, 0.03), 0.033)
		plant.visible = _quality != "low" or _decor_plants.size() % 3 == 0
		_decor_plants.append(plant)
		plant.modulate = _palette["foliage"]
		if _region == "marsh":
			plant.scale.y = 1.4
		if index % 4 == 0:
			var pebble: MeshInstance3D = _cylinder(_stage, _point(plant_position + Vector2(0.18, -0.12), 0.032), 0.10 + float(index % 3) * 0.022, 0.064, Color(_palette["stone"]).darkened(0.15), 5)
			pebble.scale.z = 0.7
			pebble.visible = _quality != "low"
			_minor_stones.append(pebble)


func _near_route(position: Vector2, distance: float) -> bool:
	for segment: Dictionary in _path_segments:
		var start: Vector2 = segment["start"]
		var end: Vector2 = segment["end"]
		if Geometry2D.get_closest_point_to_segment(position, start, end).distance_squared_to(position) < distance * distance:
			return true
	return false


func _load_forest_tree() -> void:
	if _forest_tree_texture != null:
		return
	if not ResourceLoader.exists(FOREST_TREE_PATH) and not FileAccess.file_exists(FOREST_TREE_PATH):
		return
	if ResourceLoader.exists(FOREST_TREE_PATH):
		_forest_tree_texture = ResourceLoader.load(FOREST_TREE_PATH) as Texture2D
	if _forest_tree_texture == null and FileAccess.file_exists(FOREST_TREE_PATH):
		var source: Image = Image.load_from_file(FOREST_TREE_PATH)
		if source != null and not source.is_empty():
			_forest_tree_texture = ImageTexture.create_from_image(source)
	if _forest_tree_texture == null:
		return
	var image: Image = _forest_tree_texture.get_image()
	if image == null or image.is_empty():
		_forest_tree_texture = null
		return
	_forest_tree_rect = image.get_used_rect()
	if _forest_tree_rect.size.x <= 0 or _forest_tree_rect.size.y <= 0:
		_forest_tree_texture = null
		return
	# Use the documented trunk/root center. The front root tips extend below it
	# and belong in front of the trunk; they do not move its collision anchor.
	_forest_tree_foot = Vector2(image.get_width(), image.get_height()) * FOREST_TREE_FOOT_RATIO


func _create_tree(position: Vector2, index: int, scale_factor: float) -> void:
	var painted: bool = _region == "forest" and _forest_tree_texture != null and index % 3 == 0
	var trunk: MeshInstance3D = _cylinder(_stage, _point(position, 0.3 * scale_factor), 0.23 * scale_factor, 0.6 * scale_factor, _palette["wood"])
	# Forest sprites already contain a complete trunk. Their collision circle
	# remains model-owned; a second visible stump would duplicate the tree foot.
	trunk.visible = _region != "forest"
	var texture: Texture2D = _forest_tree_texture if painted else Art.tree(index)
	var pixel_size: float = 0.044 * scale_factor
	var foot: Vector2 = Vector2(float(texture.get_width()) * 0.5, float(texture.get_height() - 4))
	var used_rect: Rect2 = Rect2(Vector2.ZERO, Vector2(texture.get_width(), texture.get_height() - 4))
	var tint: Color = Color(_palette["foliage"]).lightened(0.12)
	if painted:
		foot = _forest_tree_foot
		used_rect = Rect2(_forest_tree_rect)
		var height: float = (6.5 if index >= 40 else 5.4 + float(index % 3) * 0.25) * scale_factor
		pixel_size = height / maxf(1.0, foot.y - used_rect.position.y)
		tint = Color(0.86, 0.97, 1.0) if index % 3 == 0 else Color(0.78, 0.9, 0.96) if index % 3 == 1 else Color(0.93, 0.98, 1.0)
		trunk.visible = false
	elif _region == "city" or _region == "sanctuary":
		tint = Color("9f929d")
	var tree: Sprite3D = _sprite(_stage, texture, _point(position, 0.04), pixel_size)
	tree.name = "PaintedAncientTree" if painted else "PixelTree"
	tree.offset = Vector2(float(texture.get_width()) * 0.5 - foot.x, foot.y - float(texture.get_height()) * 0.5)
	if painted:
		tree.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
		tree.flip_h = index % 2 == 0
		if tree.flip_h:
			tree.offset.x = foot.x - float(texture.get_width()) * 0.5
	tree.modulate = tint
	_shadow(_stage, position, (1.4 if painted else 1.1) * scale_factor, 0.14 if painted else 0.18)
	if painted:
		_shadow(_stage, position + Vector2(0.15, 0.12), 0.7 * scale_factor, 0.16)
	_occluders.append({"sprite": tree, "tint": tint, "trunk": trunk, "height": (foot.y - used_rect.position.y) * pixel_size, "width": used_rect.size.x * pixel_size, "painted": painted})


func _create_rock(position: Vector2, radius: float, index: int) -> void:
	var rock: MeshInstance3D = MeshInstance3D.new()
	var mesh: SphereMesh = SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 1.4
	mesh.radial_segments = 7
	mesh.rings = 3
	rock.mesh = mesh
	rock.material_override = _material(Color(_palette["stone"]).lightened(float(index % 3) * 0.045))
	rock.position = _point(position, radius * 0.48)
	rock.rotation.y = float(index) * 0.72
	_stage.add_child(rock)
	_shadow(_stage, position, radius * 1.06, 0.18)


func _create_pillar(position: Vector2, radius: float, height: float) -> void:
	_cylinder(_stage, _point(position, height * 0.5), radius, height, _palette["stone"], 8)
	_cylinder(_stage, _point(position, 0.09), radius, 0.18, Color(_palette["stone"]).darkened(0.15), 8)
	_cylinder(_stage, _point(position, height - 0.12), radius * 0.98, 0.2, Color(_palette["stone"]).lightened(0.13), 8)


func _create_house(position: Vector2, side: int, ruined: bool) -> void:
	var wall_color: Color = Color("827d66") if not ruined else Color("665c70")
	_box(_stage, _point(position, 1.2), Vector3(3.0, 2.4, 2.6), wall_color)
	for post_x: float in [-1.4, 1.4]:
		_box(_stage, _point(position + Vector2(post_x, 0.0), 1.2), Vector3(0.15, 2.45, 2.65), _palette["wood"])
	_gable_roof(_stage, _point(position, 2.4), 3.4, 3.0, 0.75, Color("455a5d") if not ruined else Color("403848"))
	_box(_stage, _point(position + Vector2(-float(side) * 1.51, 0.0), 0.72), Vector3(0.06, 1.4, 0.7), Color("2b3538"))
	for window_z: float in [-0.8, 0.8]:
		var window: MeshInstance3D = _box(_stage, _point(position + Vector2(-float(side) * 1.54, window_z), 1.5), Vector3(0.04, 0.55, 0.42), GOLD if not ruined else Color("6b6572"), not ruined)
		window.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if not ruined:
		_create_lamp(_stage, position + Vector2(-float(side) * 1.7, 1.0), 1.65)


func _create_small_house(position: Vector2, radius: float, index: int) -> void:
	# Every overhang stays within the same circle used by model.can_stand().
	var width: float = radius * 1.2
	var depth: float = radius * 1.15
	var height: float = 1.65 + float(index % 3) * 0.2
	_box(_stage, _point(position, height * 0.5), Vector3(width, height, depth), Color("8c8066") if _region == "village" else Color("665c70"))
	_gable_roof(_stage, _point(position, height), radius * 1.4, radius * 1.2, 0.6, Color("425761") if _region == "village" else Color("4d405a"))
	for side: int in [-1, 1]:
		_box(_stage, _point(position + Vector2(float(side) * (width * 0.5 - 0.05), 0.0), height * 0.5), Vector3(0.12, height, depth), _palette["wood"])
	_box(_stage, _point(position + Vector2(0.0, depth * 0.5 + 0.02), 0.5), Vector3(width * 0.32, 1.0, 0.035), Color("283637"))
	_box(_stage, _point(position + Vector2(width * 0.31, depth * 0.5 + 0.03), 1.12), Vector3(width * 0.25, 0.4, 0.035), GOLD if _region == "village" else Color("526273"), _region == "village")


func _gable_roof(parent: Node3D, position: Vector3, width: float, depth: float, height: float, color: Color) -> MeshInstance3D:
	var points: Array[Vector3] = [Vector3(-width * 0.5, 0.0, -depth * 0.5), Vector3(width * 0.5, 0.0, -depth * 0.5), Vector3(0.0, height, -depth * 0.5), Vector3(-width * 0.5, 0.0, depth * 0.5), Vector3(width * 0.5, 0.0, depth * 0.5), Vector3(0.0, height, depth * 0.5)]
	var faces: Array[Vector3i] = [Vector3i(0, 3, 5), Vector3i(0, 5, 2), Vector3i(2, 5, 4), Vector3i(2, 4, 1), Vector3i(0, 2, 1), Vector3i(3, 4, 5), Vector3i(0, 1, 4), Vector3i(0, 4, 3)]
	var surface: SurfaceTool = SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for face: Vector3i in faces:
		var normal: Vector3 = (points[face.y] - points[face.x]).cross(points[face.z] - points[face.x]).normalized()
		for point_index: int in [face.x, face.y, face.z]:
			surface.set_normal(normal)
			surface.add_vertex(points[point_index])
	var node: MeshInstance3D = MeshInstance3D.new()
	node.mesh = surface.commit()
	node.material_override = _material(color)
	node.position = position
	parent.add_child(node)
	return node


func _create_arch(position: Vector2, ruined: bool) -> void:
	# Architecture without a model obstacle stays beyond the playable boundary.
	position.y = minf(position.y, _bounds.position.y - 2.2)
	for side: int in [-1, 1]:
		_create_pillar(position + Vector2(float(side) * 1.4, 0.0), 0.42, 2.6 if ruined else 2.25)
	_box(_stage, _point(position, 2.45 if ruined else 2.15), Vector3(3.3, 0.4, 0.7), _palette["stone"])


func _create_bridge(position: Vector2) -> void:
	for index: int in range(11):
		_box(_stage, _point(position + Vector2(0.0, float(index - 5) * 0.33), 0.06), Vector3(1.9, 0.11, 0.3), Color("928568") if index % 2 == 0 else Color("81715b"))
	for side: int in [-1, 1]:
		for index: int in range(3):
			_box(_stage, _point(position + Vector2(float(side) * 1.03, float(index - 1) * 1.65), 0.5), Vector3(0.13, 1.0, 0.13), _palette["wood"])
		_box(_stage, _point(position + Vector2(float(side) * 1.03, 0.0), 0.72), Vector3(0.1, 0.12, 3.6), _palette["wood"])


func _create_ancient_tree(position: Vector2) -> void:
	var trunk: MeshInstance3D = _cylinder(_stage, _point(position, 3.6), 1.55, 7.2, Color("473449"), 9)
	trunk.rotation.z = -0.09
	for index: int in range(7):
		var angle: float = float(index) * TAU / 7.0
		var root: MeshInstance3D = _cylinder(_stage, _point(position + Vector2(cos(angle), sin(angle)) * 1.8, 0.7), 0.55, 4.0, Color("594357"), 7)
		root.rotation.z = 1.05
		root.rotation.y = angle
	var canopy: Sprite3D = _sprite(_stage, Art.tree(0), _point(position, 1.6), 0.095)
	canopy.modulate = Color("a19aaf")


func _create_lamp(parent: Node3D, position: Vector2, height: float) -> void:
	_box(parent, _point(position, height * 0.5), Vector3(0.12, height, 0.12), _palette["wood"])
	_box(parent, _point(position, height), Vector3(0.46, 0.12, 0.25), _palette["wood"])
	_sprite(parent, Art.prop("lamp"), _point(position, height - 0.43), 0.026)


func _create_camp_and_exit(info: Dictionary) -> void:
	var camp: Vector2 = info["camp"]
	_camp_fire = _sprite(_stage, Art.campfire(), _point(camp, 0.03), 0.036)
	var camp_ring: MeshInstance3D = _ring(_stage, camp, 0.85, Color("b9a881"), false)
	camp_ring.position.y = 0.038
	_label(_stage, "篝火 · 保存与补给", _point(camp, 1.08), GOLD, 27)
	_add_warm_light(camp, 1.0, 5.0)
	var exit_position: Vector2 = info["exit"]
	_exit_ring = _ring(_stage, exit_position, 1.0, Color("90c8b3"), true)
	_sprite(_stage, Art.prop("anchor"), _point(exit_position, 0.04), 0.039)
	_label(_stage, "前往下一段旅途", _point(exit_position, 1.3), Color("c4dec8"), 27)
	_add_warm_light(exit_position, 1.35, 4.0)


func _add_warm_light(position: Vector2, height: float, light_range: float) -> void:
	var light: OmniLight3D = OmniLight3D.new()
	light.position = _point(position, height)
	light.light_color = Color("ffd990")
	light.light_energy = 0.75
	light.omni_range = light_range
	light.shadow_enabled = false
	_stage.add_child(light)
	_decor_lights.append(light)


func _create_map_objects(objects: Array) -> void:
	for object: Dictionary in objects:
		var position: Vector2 = object["position"]
		var type: String = String(object.get("type", "note"))
		if type == "camp":
			# The stage already owns the animated camp and its persistent label.
			_object_nodes.append({})
			continue
		if type == "lamp" and _decor_lights.size() < 4:
			_add_warm_light(position, 0.85, 2.9)
		var texture: Texture2D
		var pixel_size: float = 0.04
		if object.has("npc_key"):
			texture = Art.npc(String(object.get("npc_key", "afu")))
			pixel_size = HERO_PIXEL_SIZE
		else:
			var prop_key: String = type
			if type == "side":
				prop_key = "note"
			elif type == "puzzle":
				prop_key = "rune"
			elif type == "camp":
				prop_key = "campfire"
			texture = Art.prop(prop_key)
		var sprite: Sprite3D = _sprite(_actors, texture, _point(position, 0.04), pixel_size)
		if type in ["rune", "puzzle"]:
			sprite.billboard = BaseMaterial3D.BILLBOARD_DISABLED
			sprite.rotation_degrees.x = -90.0
			sprite.offset = Vector2.ZERO
		var label: Label3D = _label(_actors, String(object.get("title", "旅途线索")), _point(position, 1.32 if type == "npc" else 1.0), GOLD if type != "npc" else Color("b9e1d4"), 27)
		var marker: MeshInstance3D = _ring(_actors, position, 0.49 if type != "npc" else 0.36, Color("b7d3b9"), false)
		if type == "puzzle":
			var puzzle_material: StandardMaterial3D = marker.material_override as StandardMaterial3D
			puzzle_material.albedo_color = Color("9bc9e1")
		marker.position.y = 0.048
		var shadow: MeshInstance3D = _shadow(_actors, position, 0.27 if type != "npc" else 0.31, 0.22)
		_object_nodes.append({"sprite": sprite, "label": label, "marker": marker, "shadow": shadow, "type": type})


func _create_characters(model: Variant) -> void:
	player_sprite = _sprite(_actors, Art.hero_direction("south", 0, "idle"), _point(model.player_position, 0.04), HERO_PIXEL_SIZE)
	player_sprite.name = "Lynn"
	_player_shadow = _shadow(_actors, model.player_position, 0.33, 0.27)
	_player_light = OmniLight3D.new()
	_player_light.light_color = Color("ffda8e")
	_player_light.light_energy = 0.7
	_player_light.omni_range = 3.5
	_player_light.shadow_enabled = false
	_actors.add_child(_player_light)
	_player_light.visible = _quality != "low"
	for enemy: Dictionary in model.enemies:
		var enemy_id: String = String(enemy["id"])
		var enemy_position: Vector2 = enemy["position"]
		_enemy_nodes[enemy_id] = _create_actor(Art.enemy(String(enemy["type"])), enemy_position, 0.037, 0.38, String(enemy.get("name", "")))
	var boss: Dictionary = model.boss
	if not boss.is_empty():
		_boss_node = _create_actor(Art.boss(String(boss["type"])), boss["position"], 0.044, 0.75, String(boss.get("name", "守护者")))
		var boss_sprite: Sprite3D = _boss_node["sprite"] as Sprite3D
		boss_sprite.name = "ChapterBoss"
		var core_ring: MeshInstance3D = _ring(_actors, boss["position"], 1.1, Color("95d8dd"), true)
		_boss_node["core_ring"] = core_ring
		var puzzles: Array[Dictionary] = []
		for puzzle: Dictionary in boss.get("puzzle_nodes", []):
			var puzzle_position: Vector2 = puzzle["position"]
			var puzzle_root: Node3D = Node3D.new()
			puzzle_root.position = _point(puzzle_position, 0.08)
			_actors.add_child(puzzle_root)
			var rune: Sprite3D = _sprite(puzzle_root, Art.prop("rune"), Vector3.ZERO, 0.025)
			rune.billboard = BaseMaterial3D.BILLBOARD_DISABLED
			rune.rotation_degrees.x = -90.0
			rune.offset = Vector2.ZERO
			var ring: MeshInstance3D = _ring(puzzle_root, Vector2.ZERO, 0.84, GOLD, true)
			var label: Label3D = _label(puzzle_root, String(puzzle.get("title", "回响端点")), Vector3(0.0, 0.9, 0.0), GOLD, 27)
			puzzles.append({"root": puzzle_root, "sprite": rune, "ring": ring, "label": label})
		_boss_node["puzzles"] = puzzles


func _create_actor(texture: Texture2D, position: Vector2, pixel_size: float, shadow_size: float, title: String) -> Dictionary:
	var sprite: Sprite3D = _sprite(_actors, texture, _point(position, 0.04), pixel_size)
	var shadow: MeshInstance3D = _shadow(_actors, position, shadow_size, 0.26)
	var warning: Node3D = Node3D.new()
	warning.name = "LockedAttackArea"
	_actors.add_child(warning)
	var warning_fill: MeshInstance3D = _disc(warning, Vector2.ZERO, 1.0, Color(DANGER, 0.12))
	var warning_rim: MeshInstance3D = _ring(warning, Vector2.ZERO, 1.0, DANGER, true)
	warning_fill.position.y = 0.01
	warning_rim.position.y = 0.018
	var warning_line: Node3D = Node3D.new()
	warning.add_child(warning_line)
	_box(warning_line, Vector3(0.0, 0.015, 0.5), Vector3(2.0, 0.006, 1.0), Color(DANGER, 0.14), true)
	for side: int in [-1, 1]:
		_box(warning_line, Vector3(float(side), 0.025, 0.5), Vector3(0.04, 0.008, 1.0), DANGER, true)
	for end: float in [0.0, 1.0]:
		_box(warning_line, Vector3(0.0, 0.025, end), Vector3(2.0, 0.008, 0.025), DANGER, true)
	var warning_end_fill: MeshInstance3D = _disc(warning, Vector2.ZERO, 1.0, Color(DANGER, 0.12))
	var warning_end_rim: MeshInstance3D = _ring(warning, Vector2.ZERO, 1.0, DANGER, true)
	warning_line.visible = false
	warning_end_fill.visible = false
	warning_end_rim.visible = false
	var warning_fan_left: Node3D = warning_line.duplicate() as Node3D
	var warning_fan_right: Node3D = warning_line.duplicate() as Node3D
	warning.add_child(warning_fan_left)
	warning.add_child(warning_fan_right)
	warning_fan_left.visible = false
	warning_fan_right.visible = false
	var warning_sector: Node3D = Node3D.new()
	warning.add_child(warning_sector)
	var sector_fill: MeshInstance3D = MeshInstance3D.new()
	sector_fill.mesh = _arc_mesh(0.0, 1.0, 2.0 * acos(0.3), 32)
	sector_fill.material_override = _material(Color(DANGER, 0.14), true)
	sector_fill.position.y = 0.01
	warning_sector.add_child(sector_fill)
	var sector_rim: MeshInstance3D = MeshInstance3D.new()
	sector_rim.mesh = _arc_mesh(0.955, 1.0, 2.0 * acos(0.3), 32)
	sector_rim.material_override = _material(DANGER, true)
	sector_rim.position.y = 0.024
	warning_sector.add_child(sector_rim)
	for side: float in [-1.0, 1.0]:
		var border: MeshInstance3D = _box(warning_sector, Vector3(cos(acos(0.3) * side), 0.025, sin(acos(0.3) * side)) * 0.5, Vector3(1.0, 0.008, 0.025), DANGER, true)
		border.rotation.y = -acos(0.3) * side
	warning_sector.visible = false
	var front_guard: MeshInstance3D = MeshInstance3D.new()
	front_guard.mesh = _arc_mesh(0.51, 0.59, 2.0 * acos(0.25), 24)
	front_guard.material_override = _material(Color("bbd9c7"), true)
	_actors.add_child(front_guard)
	front_guard.visible = false
	warning.visible = false
	var health_bar: Node3D = Node3D.new()
	_actors.add_child(health_bar)
	var health_back: MeshInstance3D = MeshInstance3D.new()
	var back_mesh: QuadMesh = QuadMesh.new()
	back_mesh.size = Vector2(0.95, 0.085)
	health_back.mesh = back_mesh
	health_back.material_override = _material(Color("24343a"), true)
	health_bar.add_child(health_back)
	var health_fill: MeshInstance3D = MeshInstance3D.new()
	var fill_mesh: QuadMesh = QuadMesh.new()
	fill_mesh.size = Vector2(0.89, 0.043)
	health_fill.mesh = fill_mesh
	health_fill.material_override = _material(Color("e78b82"), true)
	health_fill.position.z = 0.005
	health_bar.add_child(health_fill)
	health_bar.visible = false
	var label: Label3D = _label(_actors, title, _point(position, float(texture.get_height() - 4) * pixel_size + 0.24), Color("edc9b0"), 25)
	label.visible = not title.is_empty()
	return {"sprite": sprite, "shadow": shadow, "warning": warning, "fill": warning_fill, "rim": warning_rim, "line": warning_line, "fan_left": warning_fan_left, "fan_right": warning_fan_right, "sector": warning_sector, "end_fill": warning_end_fill, "end_rim": warning_end_rim, "front_guard": front_guard, "bar": health_bar, "bar_fill": health_fill, "label": label, "pixel_size": pixel_size}


func _create_player_effects() -> void:
	_blade = MeshInstance3D.new()
	_blade.mesh = _arc_mesh(0.7, 1.5, deg_to_rad(120.0), 18)
	_blade.material_override = _material(Color("ffe3a3"), true)
	_effects.add_child(_blade)
	_blade.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_blade.visible = false
	_pulse = _ring(_effects, Vector2.ZERO, 1.0, Color("ffdf92"), false)
	_pulse.visible = false
	_shield = _ring(_effects, Vector2.ZERO, 0.88, Color("acede4"), true)
	_shield.visible = false
	_lantern_ring = _ring(_effects, Vector2.ZERO, 4.0, Color(1.0, 0.86, 0.52, 0.2), true)
	_lantern_ring.visible = false


func _sync_camera(player_position: Vector2, delta: float) -> void:
	var focus: Vector2 = player_position.clamp(_bounds.position + Vector2(5.5, 5.5), _bounds.end - Vector2(5.5, 5.5))
	var camera_target: Vector3 = _point(focus, 0.5)
	var offset: Vector3 = Vector3(11.5, 16.3, 11.5)
	var weight: float = 1.0 - exp(-8.0 * delta) if delta > 0.0 else 1.0
	camera.position = camera.position.lerp(camera_target + offset, weight)
	camera.look_at(camera.position - offset, Vector3.UP)
	var target_size: float = 12.4
	if not _boss_node.is_empty():
		var boss_sprite: Sprite3D = _boss_node["sprite"] as Sprite3D
		if boss_sprite.position.distance_to(_point(player_position)) < 5.5:
			target_size = 16.8
	camera.size = lerpf(camera.size, target_size, weight * 0.55)


func _screen_direction(direction: Vector2) -> String:
	var world_direction: Vector3 = Vector3(direction.x, 0.0, direction.y)
	var horizontal: float = world_direction.dot(camera.global_basis.x)
	var vertical: float = world_direction.dot(camera.global_basis.y)
	if absf(horizontal) > absf(vertical):
		return "east" if horizontal > 0.0 else "west"
	return "north" if vertical > 0.0 else "south"


func _sync_enemies(model: Variant) -> void:
	for enemy: Dictionary in model.enemies:
		var enemy_id: String = String(enemy["id"])
		if not _enemy_nodes.has(enemy_id):
			continue
		var actor: Dictionary = _enemy_nodes[enemy_id]
		var position: Vector2 = enemy["position"]
		var alive: bool = bool(enemy["alive"])
		var body_visible: bool = alive and bool(enemy.get("visible", true))
		var phase: String = String(enemy.get("phase", "patrol"))
		var sprite: Sprite3D = actor["sprite"] as Sprite3D
		var shadow: MeshInstance3D = actor["shadow"] as MeshInstance3D
		sprite.position = _point(position, 0.04)
		sprite.visible = body_visible
		shadow.position = _point(position, 0.045)
		shadow.visible = body_visible
		sprite.modulate = Color("ffbdc2") if phase == "attack" else Color.WHITE
		var warning: Node3D = actor["warning"] as Node3D
		warning.visible = alive and phase in ["telegraph", "attack"]
		var target: Vector2 = enemy.get("attack_target", position)
		var origin: Vector2 = enemy.get("attack_origin", position)
		var behavior: String = String(enemy.get("behavior", "orbit"))
		var facing: Vector2 = enemy.get("facing", Vector2.RIGHT)
		match behavior:
			"ranged":
				_sync_warning(actor, origin, target, "capsule", 0.43, 8.0)
			"fan":
				var fan_direction: Vector2 = enemy.get("fan_direction", (target - origin).normalized())
				_sync_fan_warning(actor, origin, fan_direction, float(enemy.get("fan_angle", 0.32)), float(enemy.get("projectile_width", 0.43)), 8.0, false)
			"guard", "combo":
				_sync_warning(actor, position, position + facing, "sector", 1.8)
			"root", "web", "ambush":
				_sync_warning(actor, target, target, "ring", 1.3)
			"stomp":
				_sync_warning(actor, position, position, "ring", 2.3)
			"charge":
				if phase == "attack":
					_sync_warning(actor, position, position, "ring", 0.9)
				else:
					_sync_warning(actor, origin, target, "capsule", 0.9, minf(origin.distance_to(target), 2.8))
			_:
				_sync_warning(actor, position, position, "ring", 1.6)
		var rim: MeshInstance3D = actor["rim"] as MeshInstance3D
		var material: StandardMaterial3D = rim.material_override as StandardMaterial3D
		material.albedo_color = Color("ffbc8a") if phase == "attack" else DANGER
		var guard: MeshInstance3D = actor["front_guard"] as MeshInstance3D
		guard.visible = body_visible and behavior == "guard" and phase not in ["attack", "recover"]
		guard.position = _point(position, 0.12)
		guard.rotation.y = -atan2(facing.y, facing.x)
		_sync_health_bar(actor, position, float(enemy["health"]), float(enemy["max_health"]), body_visible and (phase != "patrol" or float(enemy["health"]) < float(enemy["max_health"])))
		var label: Label3D = actor["label"] as Label3D
		label.visible = body_visible and position.distance_to(model.player_position) < 3.0 and not label.text.is_empty()
		label.position = _point(position, float(sprite.texture.get_height() - 4) * float(actor["pixel_size"]) + 0.3)


func _sync_travelling_effects(model: Variant) -> void:
	var projectiles: Array = model.projectiles
	while _projectile_nodes.size() < projectiles.size():
		var projectile_root: Node3D = Node3D.new()
		projectile_root.name = "MovingProjectile"
		_effects.add_child(projectile_root)
		var body: MeshInstance3D = MeshInstance3D.new()
		var sphere: SphereMesh = SphereMesh.new()
		sphere.radius = 0.18
		sphere.height = 0.36
		sphere.radial_segments = 8
		sphere.rings = 4
		body.mesh = sphere
		body.material_override = _material(Color("ffd1c8"), true)
		body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		projectile_root.add_child(body)
		_box(projectile_root, Vector3(0.0, 0.0, -0.38), Vector3(0.11, 0.07, 0.63), Color("e685a0"), true)
		_projectile_nodes.append(projectile_root)
	for index: int in range(_projectile_nodes.size()):
		var projectile_root: Node3D = _projectile_nodes[index]
		projectile_root.visible = index < projectiles.size()
		if not projectile_root.visible:
			continue
		var projectile: Dictionary = projectiles[index]
		var direction: Vector2 = projectile["direction"]
		projectile_root.position = _point(projectile["position"], 0.3)
		projectile_root.rotation.y = atan2(direction.x, direction.y)
		projectile_root.scale = Vector3.ONE * (float(projectile.get("radius", 0.18)) / 0.18)
	var hazards: Array = model.hazards
	while _hazard_nodes.size() < hazards.size():
		var hazard_root: Node3D = Node3D.new()
		hazard_root.name = "SlowingWeb"
		_effects.add_child(hazard_root)
		_disc(hazard_root, Vector2.ZERO, 1.0, Color(0.57, 0.6, 0.83, 0.10))
		_ring(hazard_root, Vector2.ZERO, 1.0, Color(0.7, 0.71, 0.92, 0.64), false)
		_ring(hazard_root, Vector2.ZERO, 0.56, Color(0.7, 0.71, 0.92, 0.48), false)
		for spoke: int in range(8):
			var angle: float = float(spoke) * TAU / 8.0
			var strand: MeshInstance3D = _box(hazard_root, Vector3(cos(angle) * 0.5, 0.055, sin(angle) * 0.5), Vector3(1.0, 0.006, 0.012), Color(0.7, 0.71, 0.92, 0.65), true)
			strand.rotation.y = -angle
		_hazard_nodes.append(hazard_root)
	for index: int in range(_hazard_nodes.size()):
		var hazard_root: Node3D = _hazard_nodes[index]
		hazard_root.visible = index < hazards.size()
		if not hazard_root.visible:
			continue
		var hazard: Dictionary = hazards[index]
		var radius: float = float(hazard.get("radius", 1.3))
		hazard_root.position = _point(hazard["position"], 0.065)
		hazard_root.scale = Vector3(radius, 1.0, radius)


func _sync_health_bar(actor: Dictionary, position: Vector2, health: float, maximum: float, active: bool) -> void:
	var bar: Node3D = actor["bar"] as Node3D
	var fill: MeshInstance3D = actor["bar_fill"] as MeshInstance3D
	var sprite: Sprite3D = actor["sprite"] as Sprite3D
	bar.position = _point(position, float(sprite.texture.get_height() - 4) * float(actor["pixel_size"]) + 0.14)
	bar.basis = camera.global_basis
	bar.visible = active
	var ratio: float = clampf(health / maxf(maximum, 1.0), 0.0, 1.0)
	fill.scale.x = maxf(0.001, ratio)
	fill.position.x = -0.445 * (1.0 - ratio)


func _sync_warning(actor: Dictionary, origin: Vector2, target: Vector2, kind: String, radius: float, length: float = 0.0) -> void:
	var warning: Node3D = actor["warning"] as Node3D
	var fill: MeshInstance3D = actor["fill"] as MeshInstance3D
	var rim: MeshInstance3D = actor["rim"] as MeshInstance3D
	var line: Node3D = actor["line"] as Node3D
	var end_fill: MeshInstance3D = actor["end_fill"] as MeshInstance3D
	var end_rim: MeshInstance3D = actor["end_rim"] as MeshInstance3D
	var fan_left: Node3D = actor["fan_left"] as Node3D
	var fan_right: Node3D = actor["fan_right"] as Node3D
	var sector: Node3D = actor["sector"] as Node3D
	fan_left.visible = false
	fan_right.visible = false
	sector.visible = kind == "sector"
	var direction: Vector2 = (target - origin).normalized()
	var line_mode: bool = kind in ["line", "capsule"] and not direction.is_zero_approx() and length > 0.0
	warning.position = _point(origin, 0.075)
	warning.scale = Vector3.ONE
	warning.rotation.y = atan2(direction.x, direction.y) if line_mode else 0.0
	fill.visible = (not line_mode or kind == "capsule") and kind != "sector"
	rim.visible = fill.visible
	fill.scale = Vector3(radius, 1.0, radius)
	rim.scale = fill.scale
	line.visible = line_mode
	line.scale = Vector3(radius, 1.0, length + (0.3 if kind == "line" else 0.0))
	line.position.z = -0.3 if kind == "line" else 0.0
	end_fill.visible = line_mode and kind == "capsule"
	end_rim.visible = end_fill.visible
	end_fill.position = Vector3(0.0, 0.01, length)
	end_rim.position = Vector3(0.0, 0.018, length)
	end_fill.scale = Vector3(radius, 1.0, radius)
	end_rim.scale = end_fill.scale
	sector.scale = Vector3(radius, 1.0, radius)
	sector.rotation.y = -atan2(direction.y, direction.x)


func _sync_fan_warning(actor: Dictionary, origin: Vector2, direction: Vector2, spread: float, width: float, length: float, backward_extension: bool = true) -> void:
	_sync_warning(actor, origin, origin + direction, "line", width, length)
	var line: Node3D = actor["line"] as Node3D
	var extension: float = 0.3 if backward_extension else 0.0
	line.scale.z = length + extension
	line.position.z = -extension
	for item: Dictionary in [{"key": "fan_left", "angle": -spread}, {"key": "fan_right", "angle": spread}]:
		var ray: Node3D = actor[String(item["key"])] as Node3D
		var angle: float = float(item["angle"])
		ray.visible = true
		ray.rotation.y = angle
		ray.scale = Vector3(width, 1.0, length + extension)
		ray.position = Vector3(-sin(angle) * extension, 0.0, -cos(angle) * extension)


func _sync_boss(model: Variant) -> void:
	if _boss_node.is_empty() or model.boss.is_empty():
		return
	var boss: Dictionary = model.boss
	var position: Vector2 = boss["position"]
	var state: String = String(boss.get("state", "dormant"))
	var alive: bool = float(boss["health"]) > 0.0 and state != "defeated"
	var sprite: Sprite3D = _boss_node["sprite"] as Sprite3D
	var shadow: MeshInstance3D = _boss_node["shadow"] as MeshInstance3D
	sprite.position = _point(position, 0.04)
	sprite.visible = alive
	sprite.modulate = Color("c0c5bd") if state == "dormant" else Color("ffdfd0") if state == "attack" else Color.WHITE
	shadow.position = _point(position, 0.046)
	shadow.visible = alive
	var warning: Node3D = _boss_node["warning"] as Node3D
	warning.visible = alive and state in ["telegraph", "attack"]
	var target: Vector2 = boss.get("attack_target", position)
	var origin: Vector2 = boss.get("attack_origin", position)
	var pattern: String = String(boss.get("pattern", "ring"))
	match pattern:
		"charge":
			if state == "attack":
				_sync_warning(_boss_node, position, position, "ring", 1.1)
			else:
				_sync_warning(_boss_node, origin, target, "capsule", 1.1, float(boss.get("charge_distance", 5.0)))
		"thrust":
			_sync_warning(_boss_node, origin, target, "line", 0.65, 5.0)
		"fan":
			_sync_fan_warning(_boss_node, origin, (target - origin).normalized(), 0.4, 0.65, 10.0)
		"sword":
			_sync_warning(_boss_node, target, target, "ring", 2.1)
		_:
			_sync_warning(_boss_node, target, target, "ring", float(boss.get("radius", 2.7)))
	var rim: MeshInstance3D = _boss_node["rim"] as MeshInstance3D
	var material: StandardMaterial3D = rim.material_override as StandardMaterial3D
	material.albedo_color = Color("ffbc8a") if state == "attack" else DANGER
	_sync_health_bar(_boss_node, position, float(boss["health"]), float(boss["max_health"]), alive and state != "dormant")
	var label: Label3D = _boss_node["label"] as Label3D
	label.visible = alive
	var shielded: bool = bool(boss.get("shielded", false))
	var exposed: bool = float(boss.get("exposure_for", 0.0)) > 0.0
	label.text = String(boss.get("name", "守护者")) + (" · 护核闭合" if shielded else " · 核心敞开" if exposed else "")
	label.position = _point(position, float(sprite.texture.get_height() - 4) * float(_boss_node["pixel_size"]) + 0.35)
	var core_ring: MeshInstance3D = _boss_node["core_ring"] as MeshInstance3D
	core_ring.position = _point(position, 0.11)
	core_ring.visible = alive and state != "dormant" and (shielded or exposed)
	var core_material: StandardMaterial3D = core_ring.material_override as StandardMaterial3D
	core_material.albedo_color = Color("96d2dc") if shielded else GOLD
	var puzzle_nodes: Array = boss.get("puzzle_nodes", [])
	var puzzle_views: Array = _boss_node.get("puzzles", [])
	for index: int in range(mini(puzzle_nodes.size(), puzzle_views.size())):
		var puzzle: Dictionary = puzzle_nodes[index]
		var nodes: Dictionary = puzzle_views[index]
		var puzzle_root: Node3D = nodes["root"] as Node3D
		puzzle_root.position = _point(puzzle["position"], 0.08)
		puzzle_root.visible = alive and bool(puzzle.get("visible", true))
		var active: bool = bool(puzzle.get("active", false))
		var completed: bool = bool(puzzle.get("completed", false))
		var puzzle_sprite: Sprite3D = nodes["sprite"] as Sprite3D
		puzzle_sprite.modulate = Color("a7d9c0") if completed else GOLD if active else Color("798895")
		var puzzle_ring: MeshInstance3D = nodes["ring"] as MeshInstance3D
		puzzle_ring.visible = active or completed
		puzzle_ring.scale = Vector3.ONE * (1.0 + sin(_visual_time * 3.5) * 0.035 if active else 1.0)
		var puzzle_label: Label3D = nodes["label"] as Label3D
		puzzle_label.text = ("✓ " if completed else "✦ " if active else "") + String(puzzle.get("title", "回响端点"))
		puzzle_label.visible = active or completed or model.player_position.distance_to(puzzle["position"]) < 3.5


func _sync_objects(model: Variant, player_position: Vector2) -> void:
	for index: int in range(mini(model.objects.size(), _object_nodes.size())):
		var object: Dictionary = model.objects[index]
		var nodes: Dictionary = _object_nodes[index]
		if nodes.is_empty():
			continue
		var position: Vector2 = object["position"]
		var type: String = String(nodes["type"])
		var completed: bool = bool(object.get("completed", false))
		var sprite: Sprite3D = nodes["sprite"] as Sprite3D
		var label: Label3D = nodes["label"] as Label3D
		var marker: MeshInstance3D = nodes["marker"] as MeshInstance3D
		var shadow: MeshInstance3D = nodes["shadow"] as MeshInstance3D
		var hidden: bool = bool(object.get("hidden", false))
		var visible: bool = not hidden or completed or ("lens" in model.abilities and float(model.lantern_for) > 0.0 and player_position.distance_to(position) <= float(object.get("reveal_radius", 4.0)))
		if type == "crystal" and completed:
			visible = false
		sprite.visible = visible
		shadow.visible = visible
		sprite.position = _point(position, 0.04)
		if type == "crystal" and not completed:
			sprite.position.y += sin(_visual_time * 2.7 + float(index)) * 0.045 + 0.09
		sprite.modulate = Color("84948e") if completed and type != "npc" else Color.WHITE
		if String(object.get("ability", "")) == "echo" and not completed and float(model.lantern_for) <= 0.0:
			sprite.modulate.a = 0.28
		label.visible = visible and player_position.distance_to(position) < 3.6
		label.text = ("✓ " if completed and type != "npc" else "") + String(object.get("title", "旅途线索"))
		marker.visible = visible and not completed
		marker.scale = Vector3.ONE * (1.0 + sin(_visual_time * 2.0 + float(index)) * 0.035)


func _sync_player_effects(model: Variant, position: Vector2, direction: Vector2) -> void:
	_blade.visible = float(model.attack_for) > 0.0
	_blade.position = _point(position, 0.16)
	_blade.rotation.y = -atan2(direction.y, direction.x)
	_pulse.visible = float(model.pulse_for) > 0.0
	_pulse.position = _point(position, 0.115)
	var pulse_progress: float = 1.0 - clampf(float(model.pulse_for) / 0.3, 0.0, 1.0)
	var pulse_radius: float = lerpf(0.3, 1.8, pulse_progress)
	_pulse.scale = Vector3(pulse_radius, 1.0, pulse_radius)
	_shield.visible = float(model.shield_for) > 0.0
	_shield.position = _point(position, 0.18)
	_shield.rotation.y = _visual_time * 0.45
	_lantern_ring.visible = float(model.lantern_for) > 0.0 and _quality != "low"
	_lantern_ring.position = _point(position, 0.07)
	_player_light.light_energy = 1.15 if float(model.lantern_for) > 0.0 else 0.7


func _sync_occlusion(delta: float) -> void:
	if not is_inside_tree() or player_sprite == null:
		return
	var player_screen: Vector2 = camera.unproject_position(player_sprite.global_position + camera.global_basis.y * 0.65)
	var player_distance: float = camera.global_position.distance_squared_to(player_sprite.global_position)
	var fade_weight: float = minf(1.0, delta * 10.0) if delta > 0.0 else 1.0
	var readable_points: Array[Vector3] = []
	for actor: Dictionary in _enemy_nodes.values():
		var warning: Node3D = actor["warning"] as Node3D
		var sprite: Sprite3D = actor["sprite"] as Sprite3D
		if warning.visible and sprite.visible and warning.global_position.distance_to(player_sprite.global_position) < 6.0:
			readable_points.append(warning.global_position)
			readable_points.append(sprite.global_position + camera.global_basis.y * 0.6)
	if not _boss_node.is_empty():
		var warning: Node3D = _boss_node["warning"] as Node3D
		var sprite: Sprite3D = _boss_node["sprite"] as Sprite3D
		if warning.visible and sprite.visible:
			readable_points.append(warning.global_position)
			readable_points.append(sprite.global_position + camera.global_basis.y * 1.0)
	for nodes: Dictionary in _object_nodes:
		if nodes.is_empty():
			continue
		var label: Label3D = nodes["label"] as Label3D
		var sprite: Sprite3D = nodes["sprite"] as Sprite3D
		if label.visible and sprite.visible:
			readable_points.append(sprite.global_position + camera.global_basis.y * 0.35)
	for item: Dictionary in _occluders:
		var tree: Sprite3D = item["sprite"] as Sprite3D
		var foot_screen: Vector2 = camera.unproject_position(tree.global_position)
		var tree_height: float = float(item["height"])
		var tree_width: float = float(item["width"])
		var top_screen: Vector2 = camera.unproject_position(tree.global_position + camera.global_basis.y * tree_height)
		var side_screen: Vector2 = camera.unproject_position(tree.global_position + camera.global_basis.x * tree_width * 0.5)
		var projected_rect: Rect2 = Rect2(Vector2(foot_screen.x - absf(side_screen.x - foot_screen.x), top_screen.y), Vector2(absf(side_screen.x - foot_screen.x) * 2.0, foot_screen.y - top_screen.y))
		var occluding: bool = projected_rect.has_point(player_screen) and camera.global_position.distance_squared_to(tree.global_position) < player_distance
		if bool(item.get("painted", false)) and not occluding:
			var tree_distance: float = camera.global_position.distance_squared_to(tree.global_position)
			for point: Vector3 in readable_points:
				if projected_rect.grow(15.0).has_point(camera.unproject_position(point)) and tree_distance < camera.global_position.distance_squared_to(point):
					occluding = true
					break
		var target_alpha: float = (0.2 if bool(item.get("painted", false)) else 0.28) if occluding else 1.0
		var tint: Color = item["tint"]
		tint.a = lerpf(tree.modulate.a, target_alpha, fade_weight)
		tree.modulate = tint
	for item: Dictionary in _solid_occluders:
		var position: Vector2 = item["position"]
		var height: float = float(item["height"])
		var radius: float = float(item["radius"])
		var point: Vector3 = _point(position)
		var foot_screen: Vector2 = camera.unproject_position(point)
		var top_screen: Vector2 = camera.unproject_position(point + Vector3.UP * height)
		var side_screen: Vector2 = camera.unproject_position(point + camera.global_basis.x * radius)
		var half_width: float = absf(side_screen.x - foot_screen.x)
		var rect: Rect2 = Rect2(Vector2(foot_screen.x - half_width, top_screen.y - half_width * 0.35), Vector2(half_width * 2.0, foot_screen.y - top_screen.y + half_width * 0.7))
		var occluding: bool = rect.has_point(player_screen) and camera.global_position.distance_squared_to(point) < player_distance
		for entry: Dictionary in item["pieces"]:
			var piece: MeshInstance3D = entry["node"] as MeshInstance3D
			var material: StandardMaterial3D = piece.material_override as StandardMaterial3D
			if material == null:
				continue
			var color: Color = material.albedo_color
			var original_opacity: float = float(entry["opacity"])
			color.a = lerpf(color.a, original_opacity * 0.32 if occluding else original_opacity, fade_weight)
			material.albedo_color = color
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA if color.a < 0.995 else BaseMaterial3D.TRANSPARENCY_DISABLED


func _point(position: Vector2, height: float = 0.0) -> Vector3:
	return Vector3(position.x, height, position.y)


func _sprite(parent: Node3D, texture: Texture2D, position: Vector3, pixel_size: float) -> Sprite3D:
	var sprite: Sprite3D = Sprite3D.new()
	sprite.texture = texture
	sprite.pixel_size = pixel_size
	sprite.offset = Vector2(0.0, float(texture.get_height()) * 0.5 - 4.0)
	sprite.position = position
	sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED
	sprite.shaded = false
	sprite.no_depth_test = false
	sprite.double_sided = true
	sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(sprite)
	return sprite


func _label(parent: Node3D, text: String, position: Vector3, color: Color, font_size: int = 28) -> Label3D:
	var label: Label3D = Label3D.new()
	label.text = text
	label.font = UI_FONT
	label.font_size = font_size
	label.pixel_size = 0.006
	label.modulate = color
	label.outline_modulate = Color("18272e")
	label.outline_size = 6
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = false
	label.position = position
	parent.add_child(label)
	return label


func _material(color: Color, unshaded: bool = false) -> StandardMaterial3D:
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 1.0
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	if unshaded:
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	if color.a < 0.999:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return material


func _box(parent: Node3D, position: Vector3, size: Vector3, color: Color, unshaded: bool = false) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var mesh: BoxMesh = BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = _material(color, unshaded)
	node.position = position
	parent.add_child(node)
	return node


func _cylinder(parent: Node3D, position: Vector3, radius: float, height: float, color: Color, segments: int = 7) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var mesh: CylinderMesh = CylinderMesh.new()
	mesh.top_radius = radius * 0.94
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = segments
	node.mesh = mesh
	node.material_override = _material(color)
	node.position = position
	parent.add_child(node)
	return node


func _shadow(parent: Node3D, position: Vector2, radius: float, opacity: float) -> MeshInstance3D:
	var shadow: MeshInstance3D = _disc(parent, position, radius, Color(0.015, 0.025, 0.03, opacity))
	shadow.position.y = 0.045
	shadow.scale.z = 0.62
	return shadow


func _disc(parent: Node3D, position: Vector2, radius: float, color: Color) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	node.mesh = _arc_mesh(0.0, radius, TAU, 40)
	node.material_override = _material(color, true)
	node.position = _point(position, 0.05)
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node


func _ring(parent: Node3D, position: Vector2, radius: float, color: Color, segmented: bool) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	node.mesh = _arc_mesh(radius * 0.945, radius, TAU, 64, segmented)
	node.material_override = _material(color, true)
	node.position = _point(position, 0.06)
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node


func _arc_mesh(inner_radius: float, outer_radius: float, extent: float, steps: int, segmented: bool = false) -> ArrayMesh:
	var vertices: PackedVector3Array = PackedVector3Array()
	var normals: PackedVector3Array = PackedVector3Array()
	for index: int in range(steps):
		if segmented and index % 4 == 3:
			continue
		var first_angle: float = -extent * 0.5 + extent * float(index) / float(steps)
		var second_angle: float = -extent * 0.5 + extent * float(index + 1) / float(steps)
		var first_direction: Vector3 = Vector3(cos(first_angle), 0.0, sin(first_angle))
		var second_direction: Vector3 = Vector3(cos(second_angle), 0.0, sin(second_angle))
		vertices.append_array(PackedVector3Array([first_direction * inner_radius, second_direction * outer_radius, first_direction * outer_radius, first_direction * inner_radius, second_direction * inner_radius, second_direction * outer_radius]))
		for normal_index: int in range(6):
			normals.append(Vector3.UP)
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	var mesh: ArrayMesh = ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh
