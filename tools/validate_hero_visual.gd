extends SceneTree
## Validate the actual imported atlas API, pixels and ground edge in Godot.
const Hero = preload("res://scripts/hero_visual.gd")
var failed: bool = false

func _initialize() -> void:
	var checked: int = 0
	for direction: String in ["south", "north", "east", "west"]:
		for action: String in Hero.COUNTS:
			var distinct: Dictionary = {}
			var source_path: String = ProjectSettings.globalize_path(Hero.ROOT + "lynn_" + action + "_" + direction + "_sheet.png")
			var source: Image = Image.load_from_file(source_path)
			for index: int in range(int(Hero.COUNTS[action])):
				var texture: Texture2D = Hero.frame(direction, index, action)
				if texture == null or texture.get_size() != Vector2(64, 96):
					_fail("Invalid imported frame %s/%s/%d" % [direction, action, index])
					continue
				var picture: Image = texture.get_image()
				var original_frame: Image = source.get_region(Rect2i(index * 64, 0, 64, 96))
				var pixels_match: bool = true
				# Godot fixes hidden RGB beside alpha-zero borders during import;
				# compare every alpha and the actual visible RGBA pixels.
				for y: int in range(96):
					for x: int in range(64):
						var actual: Color = picture.get_pixel(x, y)
						var expected: Color = original_frame.get_pixel(x, y)
						if actual.a != expected.a or (expected.a > 0.0 and actual != expected):
							pixels_match = false
				if not pixels_match:
					_fail("Imported visible pixels are stale: %s/%s/%d" % [direction, action, index])
				distinct[picture.get_data().hex_encode().sha256_text()] = true
				if picture.get_used_rect().size == Vector2i.ZERO:
					_fail("Empty frame")
				for y: int in range(88, 96):
					for x: int in range(64):
						if picture.get_pixel(x, y).a != 0.0:
							_fail("Pixels below foot anchor")
				checked += 1
			if distinct.size() < 2:
				_fail("Animation has no differing pixels: " + direction + "/" + action)
	if Hero.frame("south", 0, "walk") != Hero.frame("south", 6, "walk"):
		_fail("Frame wrap/cache changed texture identity")
	if Hero.frame("invalid", 0, "invalid") != Hero.frame("south", 0, "idle"):
		_fail("Invalid inputs do not fall back to idle south")
	print("HeroVisual Godot: %d imported frames; source parity/atlas size/alpha/motion/cache %s" % [checked, "FAIL" if failed else "PASS"])
	quit(1 if failed else 0)

func _fail(message: String) -> void:
	failed = true
	push_error(message)
