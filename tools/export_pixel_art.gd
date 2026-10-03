extends SceneTree
## Rebuild the checked-in original sprites without third-party image assets.
## Run with the project's writable XDG directories and Godot --headless.

const Art = preload("res://scripts/pixel_art.gd")
const DIRECTIONS: Array[String] = ["south", "north", "east", "west"]
const NPCS: Array[String] = ["cen", "afu", "xiaohe"]
const ENEMIES: Array[String] = ["lamp_moth", "mist_beast", "vine_root", "wood_guard", "marsh_spider", "drowned_shadow", "ruin_sentinel", "cracked_statue", "hollow_patrol", "dusk_archer"]
const BOSSES: Array[String] = ["gate_guardian", "mist_hunter", "rune_colossus", "night_warden", "root_heart"]
const PROPS: Array[String] = ["lamp", "chest", "note", "lens", "rune", "shield", "anchor", "crystal", "potion", "campfire", "grass", "flower", "door", "bell"]
const PORTRAITS: Array[String] = ["lynn", "cen", "afu", "xiaohe"]
const EMOTIONS: Array[String] = ["neutral", "worried", "determined", "relieved"]

var _entries: Array[Dictionary] = []
var _failed: bool = false
var _sample_images: Array[Image] = []


func _initialize() -> void:
	var frame_counts: Dictionary = {"idle": 4, "walk": 6, "attack": 6, "dash": 4, "pulse": 6, "hit": 3, "death": 6, "interact": 4}
	var frame_rates: Dictionary = {"idle": 6, "walk": 10, "attack": 14, "dash": 16, "pulse": 12, "hit": 10, "death": 8, "interact": 8}
	for direction: String in DIRECTIONS:
		for action: String in frame_counts:
			var count: int = int(frame_counts[action])
			var sheet: Image = Image.create(32 * count, 48, false, Image.FORMAT_RGBA8)
			sheet.fill(Color.TRANSPARENT)
			for frame: int in range(count):
				var texture: Texture2D = Art.hero_direction(direction, frame, action)
				_validate(texture, Vector2i(32, 48), "hero/%s/%s/%d" % [direction, action, frame])
				_validate_ground(texture, 44, "hero/%s/%s/%d" % [direction, action, frame])
				sheet.blit_rect(texture.get_image(), Rect2i(0, 0, 32, 48), Vector2i(frame * 32, 0))
			_save("characters/lynn/lynn_%s_%s_sheet.png" % [action, direction], sheet, {
				"cell": [32, 48], "frames": count, "fps": int(frame_rates[action]),
				"anchor": [16, 44], "loop": action in ["idle", "walk"],
				"direction": direction, "action": action,
			})
		_sample_images.append(Art.hero_direction(direction).get_image())
	# Equipment must not be baked as a mirrored image.
	var east: Image = Art.hero_direction("east").get_image()
	var west: Image = Art.hero_direction("west").get_image()
	east.flip_x()
	if east.get_data() == west.get_data():
		_fail("Side directions incorrectly share a simple horizontal mirror")
	for person: String in NPCS:
		for frame: int in range(2):
			var texture: Texture2D = Art.npc(person, frame)
			_validate(texture, Vector2i(32, 48), "npc/%s" % person)
			_validate_ground(texture, 44, "npc/%s" % person)
			_save("characters/npc_%s/npc_%s_idle_%02d.png" % [person, person, frame], texture.get_image(), {"anchor": [16, 44], "fps": 4})
		_sample_images.append(Art.npc(person).get_image())
	for species: String in ENEMIES:
		for frame: int in range(2):
			var texture: Texture2D = Art.enemy(species, frame)
			_validate(texture, Vector2i(40, 48), "enemy/%s" % species)
			_validate_ground(texture, 44, "enemy/%s" % species)
			_save("enemies/%s/%s_idle_%02d.png" % [species, species, frame], texture.get_image(), {"anchor": [20, 44], "fps": 4})
		_sample_images.append(Art.enemy(species).get_image())
	for species: String in BOSSES:
		for frame: int in range(2):
			var texture: Texture2D = Art.boss(species, frame)
			var size: Vector2i = Vector2i(texture.get_size())
			_validate(texture, size, "boss/%s" % species)
			_validate_ground(texture, size.y - 4, "boss/%s" % species)
			_save("bosses/%s/%s_idle_%02d.png" % [species, species, frame], texture.get_image(), {"anchor": [int(size.x / 2.0), size.y - 4], "fps": 4})
		_sample_images.append(Art.boss(species).get_image())
	for item: String in PROPS:
		for frame: int in range(2):
			var texture: Texture2D = Art.prop(item, frame)
			var size: Vector2i = Vector2i(texture.get_size())
			_validate(texture, size, "prop/%s" % item)
			_save("props/%s/%s_%02d.png" % [item, item, frame], texture.get_image(), {"anchor": [int(size.x / 2.0), size.y - 4], "ground_plane": item == "rune"})
		_sample_images.append(Art.prop(item).get_image())
	for variation: int in range(2):
		var texture: Texture2D = Art.tree(variation)
		_validate(texture, Vector2i(64, 96), "tree")
		_validate_ground(texture, 92, "tree")
		_save("environments/forest/forest_tree_%02d.png" % variation, texture.get_image(), {"anchor": [32, 92]})
		_sample_images.append(texture.get_image())
	_save("vfx/player/sword_slash.png", Art.sword_slash().get_image(), {"origin": [22, 32], "direction": "east"})
	for person: String in PORTRAITS:
		for emotion: String in EMOTIONS:
			var texture: Texture2D = Art.portrait(person, emotion)
			_validate(texture, Vector2i(128, 128), "portrait/%s/%s" % [person, emotion])
			_save("ui/portraits/%s_%s.png" % [person, emotion], texture.get_image(), {"character": person, "emotion": emotion})
	if Art.hero_direction() != Art.hero_direction():
		_fail("Texture cache did not reuse a hero texture")
	if Art.hero_direction("south", 0, "idle").get_image().get_data() == Art.hero_direction("south", 2, "idle").get_image().get_data():
		_fail("Idle animation has no breathing change")
	if Art.hero_direction("south", 0, "walk").get_image().get_data() == Art.hero_direction("south", 2, "walk").get_image().get_data():
		_fail("Walk animation has no stride change")
	_make_contact_sheet()
	_make_portrait_sheet()
	var catalog_path: String = "res://assets/art/catalog.json"
	var catalog: FileAccess = FileAccess.open(catalog_path, FileAccess.WRITE)
	if catalog == null:
		_fail("Cannot write art catalog")
	else:
		catalog.store_string(JSON.stringify({
			"schema": 1, "authoring": "Original Godot Image pixel drawings",
			"source": "scripts/pixel_art.gd", "renderer": "nearest",
			"hero_foot_anchor": [16, 44], "assets": _entries,
		}, "\t"))
	print("PIXEL ART: %d PNG exports; four-direction/equipment/alpha/cache checks %s" % [_entries.size(), "PASS" if not _failed else "FAIL"])
	quit(1 if _failed else 0)


func _validate(texture: Texture2D, expected_size: Vector2i, label: String) -> void:
	if texture == null or Vector2i(texture.get_size()) != expected_size:
		_fail("Unexpected texture size: " + label)
		return
	var picture: Image = texture.get_image()
	if picture.get_format() != Image.FORMAT_RGBA8:
		_fail("Expected RGBA8: " + label)
	var has_transparent: bool = false
	var has_visible: bool = false
	for y: int in range(picture.get_height()):
		for x: int in range(picture.get_width()):
			var alpha: float = picture.get_pixel(x, y).a
			has_transparent = has_transparent or alpha == 0.0
			has_visible = has_visible or alpha > 0.5
	if not has_transparent or not has_visible:
		_fail("Expected visible subject on transparent background: " + label)


func _save(relative_path: String, picture: Image, metadata: Dictionary) -> void:
	var path: String = "res://assets/art/" + relative_path
	var folder: String = ProjectSettings.globalize_path(path.get_base_dir())
	var directory_error: Error = DirAccess.make_dir_recursive_absolute(folder)
	if directory_error != OK:
		_fail("Cannot create " + folder)
		return
	var save_error: Error = picture.save_png(path)
	if save_error != OK:
		_fail("Cannot save " + path)
		return
	var entry: Dictionary = metadata.duplicate(true)
	entry["path"] = "assets/art/" + relative_path
	entry["width"] = picture.get_width()
	entry["height"] = picture.get_height()
	entry["provenance"] = "original_programmatic_pixel_art"
	_entries.append(entry)


func _validate_ground(texture: Texture2D, foot_y: int, label: String) -> void:
	var picture: Image = texture.get_image()
	for y: int in range(foot_y, picture.get_height()):
		for x: int in range(picture.get_width()):
			if picture.get_pixel(x, y).a > 0.0:
				_fail("Subject crosses the declared foot anchor: " + label)
				return


func _make_contact_sheet() -> void:
	var columns: int = 8
	var rows: int = ceili(float(_sample_images.size()) / float(columns))
	var sheet: Image = Image.create(columns * 96, rows * 112, false, Image.FORMAT_RGBA8)
	sheet.fill(Color("#152b37"))
	for index: int in range(_sample_images.size()):
		var picture: Image = _sample_images[index]
		var cell_x: int = (index % columns) * 96
		var cell_y: int = int(index / float(columns)) * 112
		var placement: Vector2i = Vector2i(cell_x + int((96 - picture.get_width()) / 2.0), cell_y + 104 - picture.get_height())
		sheet.blend_rect(picture, Rect2i(0, 0, picture.get_width(), picture.get_height()), placement)
	sheet.resize(sheet.get_width() * 2, sheet.get_height() * 2, Image.INTERPOLATE_NEAREST)
	_save("preview/sprite_catalog.png", sheet, {"purpose": "Original art review contact sheet", "scale": 2})


func _make_portrait_sheet() -> void:
	var sheet: Image = Image.create(512, 128, false, Image.FORMAT_RGBA8)
	sheet.fill(Color("#152b37"))
	for index: int in range(PORTRAITS.size()):
		var picture: Image = Art.portrait(PORTRAITS[index]).get_image()
		sheet.blend_rect(picture, Rect2i(0, 0, 128, 128), Vector2i(index * 128, 0))
	_save("preview/portrait_catalog.png", sheet, {"purpose": "Original portrait review", "characters": PORTRAITS})


func _fail(message: String) -> void:
	_failed = true
	push_error(message)
