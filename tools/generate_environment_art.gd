extends SceneTree
## Original environment art drawn from a deterministic periodic field and
## hand-defined plant silhouettes. It never reads or edits reference images.

const OUTPUT: String = "res://assets/environments/textures/"
const SIZE: int = 512
const GREEN_DARK: Color = Color("#284740")
const GREEN_MID: Color = Color("#496c55")
const GREEN_LIGHT: Color = Color("#849771")
const STEM: Color = Color("#627753")

var _records: Array[Dictionary] = []
var _error: bool = false


func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUTPUT))
	var ground: Image = _terrain("ground", 24117)
	var path: Image = _terrain("path", 35819)
	var stone: Image = _terrain("stone", 91307)
	_check_tile(ground, "ground")
	_check_tile(path, "path")
	_check_tile(stone, "stone")
	_save("forest_ground.png", ground, {"kind": "seamless_ground", "repeat_metres": [4.0, 6.0], "filter": "linear_with_mipmaps"})
	_save("forest_path.png", path, {"kind": "seamless_path", "repeat_metres": [3.0, 4.0], "filter": "linear_with_mipmaps"})
	_save("forest_stone.png", stone, {"kind": "seamless_stone", "repeat_metres": [2.0, 3.0], "filter": "linear_with_mipmaps"})
	var fern: Image = _fern()
	var grass: Image = _grass()
	var shrub: Image = _shrub()
	var litter: Image = _litter()
	_check_plant(fern, "fern")
	_check_plant(grass, "grass")
	_check_plant(shrub, "shrub")
	_check_plant(litter, "litter")
	_save("forest_fern.png", fern, {"kind": "billboard_plant", "anchor_px": [64, 120], "anchor_uv": [0.5, 0.9375], "height_metres": [0.75, 1.1], "filter": "nearest_or_linear_with_mipmaps"})
	_save("forest_grass.png", grass, {"kind": "billboard_plant", "anchor_px": [64, 120], "anchor_uv": [0.5, 0.9375], "height_metres": [0.35, 0.65], "filter": "nearest_or_linear_with_mipmaps"})
	_save("forest_shrub.png", shrub, {"kind": "billboard_plant", "anchor_px": [64, 152], "anchor_uv": [0.5, 0.95], "height_metres": [0.85, 1.25], "filter": "nearest_or_linear_with_mipmaps"})
	_save("forest_litter.png", litter, {"kind": "ground_decal", "anchor_px": [64, 48], "anchor_uv": [0.5, 0.5], "width_metres": [0.5, 0.9], "filter": "linear_with_mipmaps"})
	var tile_preview: Image = Image.create(1536, 512, false, Image.FORMAT_RGBA8)
	tile_preview.blit_rect(ground, Rect2i(0, 0, 512, 512), Vector2i(0, 0))
	tile_preview.blit_rect(path, Rect2i(0, 0, 512, 512), Vector2i(512, 0))
	tile_preview.blit_rect(stone, Rect2i(0, 0, 512, 512), Vector2i(1024, 0))
	_save("preview_terrain.png", tile_preview, {"kind": "review_only", "order": ["ground", "path", "stone"]})
	var plants_preview: Image = Image.create(1024, 320, false, Image.FORMAT_RGBA8)
	plants_preview.fill(Color("#203a40"))
	var plants: Array[Image] = [grass, fern, shrub, litter]
	for index: int in range(plants.size()):
		var picture: Image = plants[index].duplicate() as Image
		picture.resize(picture.get_width() * 2, picture.get_height() * 2, Image.INTERPOLATE_NEAREST)
		plants_preview.blend_rect(picture, Rect2i(0, 0, picture.get_width(), picture.get_height()), Vector2i(index * 256, 320 - picture.get_height()))
	_save("preview_plants.png", plants_preview, {"kind": "review_only", "order": ["grass", "fern", "shrub", "litter"]})
	var manifest: FileAccess = FileAccess.open(OUTPUT + "environment_art.json", FileAccess.WRITE)
	manifest.store_string(JSON.stringify({
		"schema": 1, "provenance": "Original deterministic Godot Image drawings",
		"generator": "tools/generate_environment_art.gd", "assets": _records,
		"notes": "No photographs, downloaded artwork, game assets or reference-image pixels are used.",
	}, "\t"))
	print("ENVIRONMENT ART: %d PNGs, wrapped tiles / transparent plants %s" % [_records.size(), "PASS" if not _error else "FAIL"])
	quit(1 if _error else 0)


func _terrain(kind: String, seed: int) -> Image:
	var image: Image = Image.create(SIZE, SIZE, false, Image.FORMAT_RGBA8)
	var soil: Color = Color("#4a5950")
	var moss: Color = Color("#3d6658")
	var shade: Color = Color("#354b47")
	if kind == "path":
		soil = Color("#857c65")
		moss = Color("#6c725d")
		shade = Color("#6b6558")
	elif kind == "stone":
		soil = Color("#707e7d")
		moss = Color("#5d7067")
		shade = Color("#546363")
	for y: int in range(SIZE):
		for x: int in range(SIZE):
			var nx: float = float(x) / float(SIZE)
			var ny: float = float(y) / float(SIZE)
			var broad: float = _noise(nx, ny, 4, seed)
			var medium: float = _noise(nx, ny, 13, seed + 7)
			var fine: float = _noise(nx, ny, 39, seed + 19)
			var grain: float = _hash(x, y, seed + 37) - 0.5
			var growth: float = smoothstep(0.31, 0.74, broad * 0.75 + medium * 0.25)
			var color: Color = soil.lerp(moss, growth * (0.73 if kind == "ground" else 0.28))
			color = color.lerp(shade, (1.0 - medium) * 0.18)
			var light: float = (fine - 0.5) * 0.035 + grain * 0.016
			color = Color(color.r + light, color.g + light, color.b + light * 0.85, 1.0)
			image.set_pixel(x, y, color)
	var random: RandomNumberGenerator = RandomNumberGenerator.new()
	random.seed = seed
	# Sparse irregular stones and curled leaves replace a repeating tiled grid.
	var stone_count: int = 85 if kind == "path" else 46
	if kind == "stone":
		stone_count = 24
	for index: int in range(stone_count):
		var centre: Vector2 = Vector2(random.randf_range(0.0, 512.0), random.randf_range(0.0, 512.0))
		var radius: float = random.randf_range(2.0, 7.0) if kind != "stone" else random.randf_range(7.0, 17.0)
		_stone_chip(image, centre, radius, random, true, 0.42 if kind == "ground" else 0.56)
	if kind != "stone":
		var leaf_count: int = 63 if kind == "ground" else 28
		for index: int in range(leaf_count):
			var base: Vector2 = Vector2(random.randf_range(0.0, 512.0), random.randf_range(0.0, 512.0))
			var angle: float = random.randf_range(0.0, TAU)
			var length: float = random.randf_range(8.0, 20.0)
			var tip: Vector2 = base + Vector2.from_angle(angle) * length
			var leaf_color: Color = Color("#7b8060") if index % 3 == 0 else Color("#64745a")
			if index % 3 == 2:
				leaf_color = Color("#7b6e56")
			_leaf(image, base, tip, length * 0.23, leaf_color, true, 0.38)
		for index: int in range(32 if kind == "ground" else 12):
			var base: Vector2 = Vector2(random.randf_range(0.0, 512.0), random.randf_range(0.0, 512.0))
			var length: float = random.randf_range(12.0, 28.0)
			var tip: Vector2 = base + Vector2.from_angle(random.randf_range(0.0, TAU)) * length
			_line(image, base, tip, Color("#536953"), 1, true, 0.25)
			for bud: int in range(3):
				var place: Vector2 = base.lerp(tip, 0.25 + float(bud) * 0.2)
				_leaf(image, place, place + Vector2(-5.0, -4.0).rotated(float(index)), 2.0, Color("#6c8060"), true, 0.25)
	else:
		# A few restrained branching fissures, not an even stone-brick pattern.
		for index: int in range(18):
			var base: Vector2 = Vector2(random.randf_range(0.0, 512.0), random.randf_range(0.0, 512.0))
			var current: Vector2 = base
			var angle: float = random.randf_range(0.0, TAU)
			for part: int in range(4):
				var next: Vector2 = current + Vector2.from_angle(angle + random.randf_range(-0.45, 0.45)) * random.randf_range(10.0, 23.0)
				_line(image, current, next, Color("#43595b"), 1, true, 0.21)
				current = next
	return image


func _fern() -> Image:
	var image: Image = _transparent(128, 128)
	var root: Vector2 = Vector2(64.0, 120.0)
	var tips: Array[Vector2] = [Vector2(11, 73), Vector2(22, 42), Vector2(41, 20), Vector2(65, 9), Vector2(84, 24), Vector2(108, 46), Vector2(119, 79)]
	for index: int in range(tips.size()):
		var tip: Vector2 = tips[index]
		var control: Vector2 = Vector2(tip.x, root.y - 44.0)
		var tint: Color = GREEN_MID.lerp(GREEN_LIGHT, 0.22 if index < 4 else 0.06)
		var previous: Vector2 = root
		for step: int in range(1, 25):
			var position: Vector2 = _bezier(root, control, tip, float(step) / 24.0)
			_line(image, previous, position, STEM, 2)
			previous = position
		for pair: int in range(2, 12):
			var ratio: float = float(pair) / 13.0
			var position: Vector2 = _bezier(root, control, tip, ratio)
			var tangent: Vector2 = ((control - root) * (1.0 - ratio) + (tip - control) * ratio).normalized()
			var normal: Vector2 = Vector2(-tangent.y, tangent.x)
			var length: float = (7.0 + 14.0 * sin(ratio * PI)) * (0.8 if index in [0, 6] else 1.0)
			for side: int in [-1, 1]:
				var end: Vector2 = position + normal * float(side) * length + tangent * length * 0.25
				_leaf(image, position, end, length * 0.18, tint.lerp(GREEN_DARK, 0.11 if side == 1 else 0.0))
		_leaf(image, _bezier(root, control, tip, 0.88), tip, 2.4, tint)
	_reserve_root(image, 120)
	_dilate_hidden_colors(image)
	return image


func _grass() -> Image:
	var image: Image = _transparent(128, 128)
	var random: RandomNumberGenerator = RandomNumberGenerator.new()
	random.seed = 7731
	# Each blade is broad at the base, curved, and pointed. Three groups share
	# a root mass instead of appearing as separately scattered single pixels.
	for layer: int in range(3):
		for blade: int in range(8):
			var base: Vector2 = Vector2(64.0 + random.randf_range(-17.0, 17.0), 119.0 - float(layer))
			var tip: Vector2 = Vector2(base.x + random.randf_range(-32.0, 32.0), random.randf_range(30.0, 83.0) + float(layer) * 8.0)
			var control: Vector2 = Vector2(base.x + (tip.x - base.x) * 0.7, tip.y + 29.0)
			var width: float = random.randf_range(3.0, 6.0)
			var color: Color = GREEN_DARK.lerp(GREEN_MID, float(layer) * 0.29 + 0.16)
			_blade(image, base, control, tip, width, color)
			if blade % 3 == 0:
				_line(image, base, _bezier(base, control, tip, 0.75), GREEN_LIGHT, 1, false, 0.65)
	for sprig: int in range(6):
		var base: Vector2 = Vector2(52 + sprig * 4, 116)
		_leaf(image, base, base + Vector2(-13 + sprig * 5, -16 - sprig % 2 * 5), 3.3, Color("#6d865f"))
	_reserve_root(image, 120)
	_dilate_hidden_colors(image)
	return image


func _shrub() -> Image:
	var image: Image = _transparent(128, 160)
	var random: RandomNumberGenerator = RandomNumberGenerator.new()
	random.seed = 57733
	var root: Vector2 = Vector2(64, 152)
	var ends: Array[Vector2] = [Vector2(19, 79), Vector2(35, 44), Vector2(55, 21), Vector2(76, 31), Vector2(98, 51), Vector2(115, 88)]
	for index: int in range(ends.size()):
		var end: Vector2 = ends[index]
		_line(image, root, end, Color("#54664d"), 3)
		for cluster: int in range(8):
			var ratio: float = 0.25 + float(cluster) * 0.085
			var base: Vector2 = root.lerp(end, ratio)
			var leaf_length: float = random.randf_range(12.0, 21.0)
			var side: float = -1.0 if cluster % 2 == 0 else 1.0
			var tip: Vector2 = base + Vector2(side * leaf_length * 0.8, -leaf_length * 0.45)
			var tint: Color = GREEN_DARK.lerp(GREEN_MID, random.randf_range(0.15, 0.7))
			_leaf(image, base, tip, leaf_length * 0.34, tint)
			var secondary: Vector2 = base + Vector2(-side * leaf_length * 0.6, -leaf_length * 0.6)
			_leaf(image, base, secondary, leaf_length * 0.28, tint.lerp(GREEN_LIGHT, 0.2))
		_leaf(image, end + Vector2(0, 7), end + Vector2(-4, -6), 5.0, GREEN_MID.lerp(GREEN_LIGHT, 0.28))
	_reserve_root(image, 152)
	_dilate_hidden_colors(image)
	return image


func _litter() -> Image:
	var image: Image = _transparent(128, 96)
	var random: RandomNumberGenerator = RandomNumberGenerator.new()
	random.seed = 9847
	for index: int in range(27):
		var angle: float = random.randf_range(0.0, TAU)
		var radius: float = random.randf_range(8.0, 40.0)
		var base: Vector2 = Vector2(64, 48) + Vector2(cos(angle) * radius, sin(angle) * radius * 0.55)
		var direction: float = random.randf_range(0.0, TAU)
		var length: float = random.randf_range(10.0, 22.0)
		var tip: Vector2 = base + Vector2.from_angle(direction) * length
		var tint: Color = Color("#706a4d") if index % 3 == 0 else Color("#536b50")
		if index % 3 == 2:
			tint = Color("#8b7955")
		_leaf(image, base, tip, length * 0.29, tint)
	for index: int in range(9):
		var centre: Vector2 = Vector2(random.randf_range(28.0, 96.0), random.randf_range(34.0, 74.0))
		_stone_chip(image, centre, random.randf_range(3.0, 7.0), random, false, 1.0)
	_line(image, Vector2(29, 58), Vector2(83, 31), Color("#796e54"), 2)
	_line(image, Vector2(63, 41), Vector2(68, 29), Color("#796e54"), 1)
	_dilate_hidden_colors(image)
	return image


func _blade(image: Image, base: Vector2, control: Vector2, tip: Vector2, width: float, color: Color) -> void:
	var points: PackedVector2Array = PackedVector2Array()
	for side: int in [-1, 1]:
		for index: int in range(13):
			var ratio: float = float(index if side == -1 else 12 - index) / 12.0
			var position: Vector2 = _bezier(base, control, tip, ratio)
			var tangent: Vector2 = ((control - base) * (1.0 - ratio) + (tip - control) * ratio).normalized()
			var normal: Vector2 = Vector2(-tangent.y, tangent.x)
			points.append(position + normal * float(side) * width * (1.0 - ratio) * 0.5)
	_polygon(image, points, color)
	var ridge: Vector2 = _bezier(base, control, tip, 0.72)
	_line(image, base, ridge, color.lerp(GREEN_LIGHT, 0.35), 1)


func _leaf(image: Image, base: Vector2, tip: Vector2, width: float, color: Color, wrap: bool = false, opacity: float = 1.0) -> void:
	var tangent: Vector2 = (tip - base).normalized()
	var normal: Vector2 = Vector2(-tangent.y, tangent.x)
	var shoulder: Vector2 = base.lerp(tip, 0.36)
	var belly: Vector2 = base.lerp(tip, 0.68)
	var points: PackedVector2Array = PackedVector2Array([
		base, shoulder + normal * width, belly + normal * width * 0.68,
		tip, belly - normal * width * 0.65, shoulder - normal * width * 0.9,
	])
	_polygon(image, points, color, wrap, opacity)
	_polygon(image, PackedVector2Array([base, shoulder - normal * width * 0.9, belly - normal * width * 0.65, tip]), color.lerp(GREEN_DARK, 0.22), wrap, opacity)
	_line(image, base, tip, color.lerp(GREEN_LIGHT, 0.38), 1, wrap, opacity * 0.65)


func _stone_chip(image: Image, centre: Vector2, radius: float, random: RandomNumberGenerator, wrap: bool, opacity: float) -> void:
	var points: PackedVector2Array = PackedVector2Array()
	for index: int in range(6):
		var angle: float = float(index) * TAU / 6.0
		var distance: float = radius * random.randf_range(0.72, 1.1)
		points.append(centre + Vector2(cos(angle) * distance, sin(angle) * distance * 0.62))
	var shadow: PackedVector2Array = PackedVector2Array()
	for point: Vector2 in points:
		shadow.append(point + Vector2(1, 2))
	_polygon(image, shadow, Color("#364c48"), wrap, opacity * 0.33)
	_polygon(image, points, Color("#6c7b72"), wrap, opacity)
	_polygon(image, PackedVector2Array([points[3], points[4], points[5], centre]), Color("#919580"), wrap, opacity * 0.55)


func _noise(x: float, y: float, period: int, seed: int) -> float:
	var px: float = x * float(period)
	var py: float = y * float(period)
	var ix: int = floori(px)
	var iy: int = floori(py)
	var fx: float = smoothstep(0.0, 1.0, px - float(ix))
	var fy: float = smoothstep(0.0, 1.0, py - float(iy))
	var upper: float = lerpf(_hash(posmod(ix, period), posmod(iy, period), seed), _hash(posmod(ix + 1, period), posmod(iy, period), seed), fx)
	var lower: float = lerpf(_hash(posmod(ix, period), posmod(iy + 1, period), seed), _hash(posmod(ix + 1, period), posmod(iy + 1, period), seed), fx)
	return lerpf(upper, lower, fy)


func _hash(x: int, y: int, seed: int) -> float:
	var number: int = (x * 374761393 + y * 668265263 + seed * 982451653) & 0x7fffffff
	number = ((number ^ (number >> 13)) * 1274126177) & 0x7fffffff
	return float((number ^ (number >> 16)) & 65535) / 65535.0


func _bezier(start: Vector2, control: Vector2, end: Vector2, ratio: float) -> Vector2:
	return start * (1.0 - ratio) * (1.0 - ratio) + control * 2.0 * (1.0 - ratio) * ratio + end * ratio * ratio


func _transparent(width: int, height: int) -> Image:
	var image: Image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(Color(0.28, 0.4, 0.3, 0.0))
	return image


func _over(image: Image, x: int, y: int, color: Color, opacity: float, wrap: bool = false) -> void:
	if wrap:
		x = posmod(x, image.get_width())
		y = posmod(y, image.get_height())
	elif x < 0 or y < 0 or x >= image.get_width() or y >= image.get_height():
		return
	var previous: Color = image.get_pixel(x, y)
	var mixed: Color = previous.lerp(color, opacity)
	mixed.a = maxf(previous.a, opacity)
	image.set_pixel(x, y, mixed)


func _line(image: Image, from: Vector2, to: Vector2, color: Color, width: int = 1, wrap: bool = false, opacity: float = 1.0) -> void:
	var steps: int = maxi(1, ceili(from.distance_to(to)))
	for step: int in range(steps + 1):
		var place: Vector2 = from.lerp(to, float(step) / float(steps))
		for oy: int in range(width):
			for ox: int in range(width):
				_over(image, roundi(place.x) + ox, roundi(place.y) + oy, color, opacity, wrap)


func _polygon(image: Image, points: PackedVector2Array, color: Color, wrap: bool = false, opacity: float = 1.0) -> void:
	var minimum: float = INF
	var maximum: float = -INF
	for point: Vector2 in points:
		minimum = minf(minimum, point.y)
		maximum = maxf(maximum, point.y)
	for y: int in range(floori(minimum), ceili(maximum) + 1):
		var scan: float = float(y) + 0.5
		var crossings: Array[float] = []
		for index: int in range(points.size()):
			var a: Vector2 = points[index]
			var b: Vector2 = points[(index + 1) % points.size()]
			if (a.y <= scan and b.y > scan) or (b.y <= scan and a.y > scan):
				crossings.append(a.x + (scan - a.y) * (b.x - a.x) / (b.y - a.y))
		crossings.sort()
		for index: int in range(0, crossings.size() - 1, 2):
			for x: int in range(ceili(crossings[index] - 0.5), floori(crossings[index + 1] - 0.5) + 1):
				_over(image, x, y, color, opacity, wrap)


func _dilate_hidden_colors(image: Image) -> void:
	# RGB in zero-alpha edge texels receives leaf color, preventing black
	# fringes with linear filtering. Alpha is never expanded or blurred.
	for pass_index: int in range(3):
		var source: Image = image.duplicate() as Image
		for y: int in range(1, image.get_height() - 1):
			for x: int in range(1, image.get_width() - 1):
				if source.get_pixel(x, y).a > 0.0:
					continue
				for offset: Vector2i in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
					var near: Color = source.get_pixel(x + offset.x, y + offset.y)
					if near.a > 0.0:
						near.a = 0.0
						image.set_pixel(x, y, near)
						break


func _reserve_root(image: Image, anchor_y: int) -> void:
	for y: int in range(anchor_y, image.get_height()):
		for x: int in range(image.get_width()):
			var color: Color = image.get_pixel(x, y)
			color.a = 0.0
			image.set_pixel(x, y, color)


func _check_tile(image: Image, name: String) -> void:
	var edge_error: float = 0.0
	for index: int in range(SIZE):
		var horizontal: Color = image.get_pixel(0, index) - image.get_pixel(SIZE - 1, index)
		var vertical: Color = image.get_pixel(index, 0) - image.get_pixel(index, SIZE - 1)
		edge_error += absf(horizontal.r) + absf(horizontal.g) + absf(horizontal.b)
		edge_error += absf(vertical.r) + absf(vertical.g) + absf(vertical.b)
	var mean_error: float = edge_error / float(SIZE * 6)
	if mean_error > 0.02:
		_error = true
		push_error("Tile has a visible mean edge jump: " + name)
	print("Tile %s: mean wrap-edge delta %.4f" % [name, mean_error])


func _check_plant(image: Image, name: String) -> void:
	var visible: bool = false
	for y: int in range(image.get_height()):
		for x: int in range(image.get_width()):
			var color: Color = image.get_pixel(x, y)
			if color.a > 0.5:
				visible = true
				if maxf(color.r, maxf(color.g, color.b)) < 0.1:
					_error = true
					push_error("Unexpected black pixels in plant: " + name)
	if not visible or image.get_pixel(0, 0).a != 0.0:
		_error = true
		push_error("Expected visible plant on transparent background: " + name)


func _save(name: String, image: Image, metadata: Dictionary) -> void:
	var result: Error = image.save_png(OUTPUT + name)
	if result != OK:
		_error = true
		push_error("Unable to save environment texture " + name)
	var record: Dictionary = metadata.duplicate(true)
	record["path"] = "assets/environments/textures/" + name
	record["size"] = [image.get_width(), image.get_height()]
	record["provenance"] = "original_procedural_drawing"
	_records.append(record)
