extends RefCounted
## Original, deterministic pixel sprites. All textures keep their transparent
## background and are shared by every caller; use nearest texture filtering.

static var _cache: Dictionary = {}

const OUTLINE: Color = Color("#102332")
const TEAL_DARK: Color = Color("#174a51")
const TEAL: Color = Color("#2c847c")
const TEAL_LIGHT: Color = Color("#61b59b")
const GOLD_DARK: Color = Color("#805538")
const GOLD: Color = Color("#dba44e")
const GOLD_LIGHT: Color = Color("#ffe3a3")


static func hero(frame: int = 0) -> Texture2D:
	return hero_direction("south", frame, "walk" if frame != 0 else "idle")


static func _hero_legacy(frame: int = 0) -> Texture2D:
	var pose: int = posmod(frame, 2)
	var key: String = "hero_%d" % pose
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(32, 48)
	var shift: int = pose
	# Hiking boots and trousers, with a small alternating walking stride.
	_rect(canvas, 10, 32, 6, 10 - shift, OUTLINE)
	_rect(canvas, 17, 32, 6, 9 + shift, OUTLINE)
	_rect(canvas, 12, 32, 3, 8 - shift, Color("#456478"))
	_rect(canvas, 18, 33, 3, 8 + shift, Color("#33495e"))
	_rect(canvas, 8, 41 - shift, 8, 4, OUTLINE)
	_rect(canvas, 17, 42 + shift, 9, 3, OUTLINE)
	_rect(canvas, 9, 41 - shift, 6, 2, Color("#775345"))
	_rect(canvas, 18, 42 + shift, 6, 1, Color("#94714f"))
	# The pack sits behind the left shoulder; its clasp catches the light.
	_rect(canvas, 4, 20, 8, 13, OUTLINE)
	_rect(canvas, 5, 19, 7, 11, GOLD_DARK)
	_rect(canvas, 6, 20, 5, 10, GOLD)
	_rect(canvas, 5, 23, 6, 3, Color("#b77b3e"))
	_rect(canvas, 6, 20, 4, 2, GOLD_LIGHT)
	_rect(canvas, 8, 23, 2, 3, GOLD_LIGHT)
	_rect(canvas, 5, 30, 6, 2, GOLD_DARK)
	# A dark outline, broad shoulders, and a wind-lifted teal cloak.
	_rect(canvas, 10, 18, 12, 3, OUTLINE)
	_rect(canvas, 8, 21, 16, 8, OUTLINE)
	_rect(canvas, 7 - shift, 29, 18, 5, OUTLINE)
	_rect(canvas, 6 - shift, 33, 18, 3, OUTLINE)
	_rect(canvas, 9, 21, 13, 9, TEAL)
	_rect(canvas, 8 - shift, 29, 15, 5, TEAL)
	_rect(canvas, 7 - shift, 33, 15, 2, TEAL_DARK)
	_rect(canvas, 10, 21, 3, 11, TEAL_LIGHT)
	_rect(canvas, 11, 23, 2, 5, Color("#91d0b1"))
	_rect(canvas, 17, 23, 5, 10, TEAL_DARK)
	_rect(canvas, 20, 28, 3, 4, Color("#1b5d66"))
	_rect(canvas, 8 - shift, 32, 6, 1, TEAL_LIGHT)
	_rect(canvas, 15, 34, 4, 2, TEAL)
	# Sleeve and a visible hand on the walking stick.
	_rect(canvas, 23, 23, 3, 7, OUTLINE)
	_rect(canvas, 23, 24, 2, 4, TEAL_LIGHT)
	_rect(canvas, 25, 28, 3, 4, Color("#8c5746"))
	_rect(canvas, 25, 28, 2, 3, Color("#edbd94"))
	_rect(canvas, 28, 19, 2, 25, OUTLINE)
	_rect(canvas, 28, 20, 1, 24, Color("#ac8155"))
	_rect(canvas, 27, 18, 3, 2, GOLD)
	_px(canvas, 28, 18, GOLD_LIGHT)
	# Short, tousled ivory hair and a three-quarter face.
	_rect(canvas, 12, 4, 10, 2, OUTLINE)
	_rect(canvas, 10, 6, 14, 7, OUTLINE)
	_rect(canvas, 11, 12, 13, 5, OUTLINE)
	_rect(canvas, 13, 17, 9, 2, OUTLINE)
	_rect(canvas, 13, 11, 10, 6, Color("#c08766"))
	_rect(canvas, 16, 11, 7, 5, Color("#f0c9a0"))
	_rect(canvas, 16, 16, 5, 2, Color("#dfaa80"))
	_rect(canvas, 22, 13, 2, 3, Color("#f0c9a0"))
	_px(canvas, 21, 13, OUTLINE)
	_px(canvas, 22, 13, Color("#f9e1bc"))
	_px(canvas, 22, 16, Color("#a76a58"))
	_rect(canvas, 11, 6, 12, 5, Color("#c8bda4"))
	_rect(canvas, 12, 5, 9, 4, Color("#fff1d1"))
	_rect(canvas, 11, 8, 6, 4, Color("#eee0c2"))
	_rect(canvas, 11, 11, 3, 3, Color("#c8bda4"))
	_rect(canvas, 14, 10, 2, 2, Color("#fff1d1"))
	_rect(canvas, 17, 9, 3, 2, Color("#fff1d1"))
	_rect(canvas, 21, 6, 2, 3, Color("#eee0c2"))
	_px(canvas, 13, 4, Color("#eee0c2"))
	_px(canvas, 18, 4, Color("#fff1d1"))
	# A warm neckerchief and a brass shoulder buckle.
	_rect(canvas, 13, 18, 9, 3, Color("#824a49"))
	_rect(canvas, 14, 18, 7, 1, Color("#cc8270"))
	_rect(canvas, 18, 20, 3, 3, Color("#bd7661"))
	_rect(canvas, 10, 20, 2, 8, GOLD_DARK)
	_rect(canvas, 10, 21, 1, 6, GOLD)
	_rect(canvas, 10, 25, 2, 2, GOLD_LIGHT)
	return _finish(key, canvas)


static func tree(variant: int = 0) -> Texture2D:
	var style: int = posmod(variant, 2)
	var key: String = "tree_%d" % style
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(64, 96)
	# Bark and roots are behind the layered canopy.
	_rect(canvas, 27, 41, 11, 50, Color("#142e32"))
	_rect(canvas, 29, 44, 7, 45, Color("#665044"))
	_rect(canvas, 29, 51, 2, 38, Color("#a67c53"))
	_rect(canvas, 34, 52, 2, 36, Color("#3b3634"))
	_rect(canvas, 31, 73, 2, 9, Color("#443c38"))
	_rect(canvas, 30, 63, 1, 5, Color("#d29b61"))
	_rect(canvas, 23, 88, 20, 4, Color("#142e32"))
	_rect(canvas, 20, 90, 26, 2, Color("#142e32"))
	_rect(canvas, 25, 88, 7, 3, Color("#806045"))
	_rect(canvas, 35, 89, 5, 2, Color("#665044"))
	_line(canvas, 29, 62, 18, 53, Color("#3b3634"), 3)
	_line(canvas, 35, 55, 45, 46, Color("#3b3634"), 3)
	if style == 0:
		# Broad, stepped clusters give the tree a hand-painted silhouette.
		_ellipse(canvas, 31, 48, 28, 21, Color("#102d35"))
		_ellipse(canvas, 18, 40, 15, 19, Color("#102d35"))
		_ellipse(canvas, 45, 37, 15, 18, Color("#102d35"))
		_ellipse(canvas, 31, 24, 22, 21, Color("#102d35"))
		_ellipse(canvas, 30, 17, 15, 12, Color("#20534f"))
		_ellipse(canvas, 23, 29, 17, 15, Color("#286e60"))
		_ellipse(canvas, 43, 32, 14, 13, Color("#20534f"))
		_ellipse(canvas, 18, 43, 13, 15, Color("#286e60"))
		_ellipse(canvas, 35, 42, 20, 16, Color("#245f57"))
		_ellipse(canvas, 32, 54, 23, 12, Color("#1c4a49"))
		_ellipse(canvas, 23, 17, 8, 6, Color("#408f74"))
		_ellipse(canvas, 19, 31, 10, 6, Color("#408f74"))
		_ellipse(canvas, 15, 43, 8, 6, Color("#39846e"))
		_ellipse(canvas, 33, 37, 10, 6, Color("#337e69"))
		_ellipse(canvas, 26, 51, 12, 6, Color("#2e7562"))
		_rect(canvas, 20, 12, 8, 2, Color("#6ab08c"))
		_rect(canvas, 16, 26, 9, 2, Color("#5da485"))
		_rect(canvas, 9, 40, 7, 2, Color("#56a07e"))
		_rect(canvas, 29, 33, 8, 2, Color("#58a07d"))
		_rect(canvas, 18, 49, 9, 2, Color("#489473"))
		_rect(canvas, 42, 38, 7, 2, Color("#327565"))
		_rect(canvas, 37, 59, 6, 3, Color("#143d40"))
		_rect(canvas, 48, 45, 6, 3, Color("#173f43"))
		_px(canvas, 18, 22, Color("#79bd93"))
		_px(canvas, 29, 13, Color("#79bd93"))
		_px(canvas, 12, 46, Color("#70b18b"))
	else:
		# A slender conifer uses three overlapping boughs, each lit from left.
		_triangle(canvas, 32, 1, 16, 31, Color("#102d35"))
		_triangle(canvas, 32, 17, 23, 33, Color("#102d35"))
		_triangle(canvas, 32, 35, 30, 33, Color("#102d35"))
		_triangle(canvas, 31, 4, 12, 24, Color("#327867"))
		_triangle(canvas, 30, 21, 18, 26, Color("#286e60"))
		_triangle(canvas, 30, 39, 24, 25, Color("#205a55"))
		_triangle(canvas, 28, 11, 6, 15, Color("#46977c"))
		_triangle(canvas, 25, 27, 10, 17, Color("#408b73"))
		_triangle(canvas, 22, 45, 11, 15, Color("#337e69"))
		_rect(canvas, 23, 22, 9, 2, Color("#6aaf8b"))
		_rect(canvas, 17, 38, 12, 2, Color("#5da485"))
		_rect(canvas, 10, 56, 14, 2, Color("#4c997b"))
		_rect(canvas, 30, 27, 9, 2, Color("#194343"))
		_rect(canvas, 29, 45, 14, 2, Color("#173e40"))
		_rect(canvas, 27, 62, 22, 2, Color("#143d40"))
		_px(canvas, 29, 10, Color("#80bf96"))
		_px(canvas, 23, 29, Color("#80bf96"))
		_px(canvas, 16, 49, Color("#5da485"))
	return _finish(key, canvas)


static func crystal() -> Texture2D:
	var key: String = "crystal"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(20, 28)
	_diamond(canvas, 10, 14, 9, 13, Color(1.0, 0.7, 0.25, 0.10))
	_diamond(canvas, 10, 14, 7, 11, Color(1.0, 0.74, 0.3, 0.24))
	_diamond(canvas, 10, 14, 5, 10, Color("#965c30"))
	_diamond(canvas, 10, 13, 4, 9, Color("#ffd17a"))
	_line(canvas, 10, 5, 7, 13, Color("#fff4cd"))
	_line(canvas, 7, 13, 10, 21, Color("#ffe9a2"))
	_line(canvas, 11, 6, 14, 13, Color("#e99b48"))
	_line(canvas, 14, 13, 10, 22, Color("#ba703a"))
	_line(canvas, 10, 7, 10, 19, Color("#ffe6a3"))
	_line(canvas, 7, 13, 13, 13, Color("#fff4cd"))
	_px(canvas, 10, 4, Color("#fffdf0"))
	_px(canvas, 3, 7, Color("#ffe8a4"))
	_px(canvas, 16, 20, Color("#ffe8a4"))
	return _finish(key, canvas)


static func ghost() -> Texture2D:
	var key: String = "ghost"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(32, 36)
	_ellipse(canvas, 16, 18, 15, 16, Color(0.48, 0.49, 1.0, 0.09))
	_ellipse(canvas, 16, 16, 12, 13, Color(0.6, 0.61, 1.0, 0.2))
	_ellipse(canvas, 16, 16, 10, 13, Color("#3d3d73"))
	_rect(canvas, 6, 22, 20, 5, Color("#3d3d73"))
	_rect(canvas, 6, 27, 5, 4, Color("#3d3d73"))
	_rect(canvas, 13, 27, 5, 6, Color("#3d3d73"))
	_rect(canvas, 21, 27, 5, 3, Color("#3d3d73"))
	_ellipse(canvas, 15, 15, 8, 11, Color("#8587c5"))
	_rect(canvas, 7, 21, 16, 6, Color("#7273b2"))
	_rect(canvas, 8, 26, 2, 3, Color("#8587c5"))
	_rect(canvas, 14, 27, 3, 4, Color("#7273b2"))
	_rect(canvas, 22, 26, 2, 2, Color("#6765a3"))
	_ellipse(canvas, 13, 10, 5, 4, Color("#b2bde0"))
	_rect(canvas, 10, 6, 5, 2, Color("#d5e0ee"))
	_rect(canvas, 9, 13, 5, 5, Color("#393761"))
	_rect(canvas, 18, 13, 5, 5, Color("#393761"))
	_rect(canvas, 10, 14, 4, 3, Color("#c3f4f4"))
	_rect(canvas, 18, 14, 4, 3, Color("#c3f4f4"))
	_rect(canvas, 12, 15, 2, 2, Color("#5a4c8a"))
	_rect(canvas, 18, 15, 2, 2, Color("#5a4c8a"))
	_px(canvas, 10, 14, Color("#fbffff"))
	_px(canvas, 21, 14, Color("#fbffff"))
	_rect(canvas, 15, 21, 3, 3, Color("#4f467b"))
	_rect(canvas, 5, 21, 2, 3, Color("#999bd1"))
	_rect(canvas, 25, 19, 2, 4, Color("#6865a6"))
	return _finish(key, canvas)


static func grass() -> Texture2D:
	var key: String = "grass"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(16, 20)
	_line(canvas, 8, 19, 2, 7, Color("#1b4144"), 2)
	_line(canvas, 8, 19, 8, 3, Color("#1b4144"), 2)
	_line(canvas, 9, 19, 14, 8, Color("#1b4144"), 2)
	_line(canvas, 7, 18, 2, 6, Color("#5d9b6d"))
	_line(canvas, 8, 18, 8, 3, Color("#87ba7b"))
	_line(canvas, 9, 18, 14, 7, Color("#3e7960"))
	_line(canvas, 7, 19, 5, 12, Color("#7aab72"))
	_line(canvas, 9, 18, 11, 12, Color("#69a278"))
	_rect(canvas, 5, 18, 7, 2, Color("#2e5b4c"))
	_px(canvas, 8, 3, Color("#bed399"))
	return _finish(key, canvas)


static func flower() -> Texture2D:
	var key: String = "flower"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(12, 18)
	_ellipse(canvas, 6, 5, 5, 5, Color(1.0, 0.8, 0.45, 0.1))
	_rect(canvas, 5, 7, 2, 11, Color("#245855"))
	_rect(canvas, 5, 9, 1, 8, Color("#83ae78"))
	_rect(canvas, 2, 12, 3, 2, Color("#4d9977"))
	_px(canvas, 3, 11, Color("#72bd92"))
	_rect(canvas, 7, 10, 3, 2, Color("#4d9977"))
	_px(canvas, 8, 9, Color("#72bd92"))
	_rect(canvas, 4, 3, 4, 5, Color("#bd793e"))
	_rect(canvas, 3, 4, 6, 3, Color("#efbe70"))
	_rect(canvas, 5, 2, 2, 6, Color("#ffe9a4"))
	_rect(canvas, 3, 5, 6, 1, Color("#ffe9a4"))
	_rect(canvas, 5, 4, 2, 2, Color("#fff9d8"))
	_px(canvas, 10, 2, Color("#ffebbc"))
	return _finish(key, canvas)


static func rune() -> Texture2D:
	var key: String = "rune"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(64, 64)
	# Concentric circles use integer pixels, preserving a clear pixel edge.
	for y: int in range(64):
		for x: int in range(64):
			var dx: float = float(x) - 31.5
			var dy: float = float(y) - 31.5
			var distance: float = sqrt(dx * dx + dy * dy)
			if distance >= 26.0 and distance <= 27.5:
				_px(canvas, x, y, Color(0.98, 0.73, 0.38, 0.68))
			elif distance >= 23.0 and distance <= 24.0:
				_px(canvas, x, y, Color(1.0, 0.88, 0.59, 0.9))
			elif distance >= 15.5 and distance <= 16.5:
				_px(canvas, x, y, Color(0.9, 0.63, 0.33, 0.62))
	for index: int in range(8):
		var angle: float = TAU * float(index) / 8.0
		var start_x: int = roundi(31.5 + cos(angle) * 19.0)
		var start_y: int = roundi(31.5 + sin(angle) * 19.0)
		var end_x: int = roundi(31.5 + cos(angle) * 22.0)
		var end_y: int = roundi(31.5 + sin(angle) * 22.0)
		_line(canvas, start_x, start_y, end_x, end_y, GOLD_LIGHT)
		var star_x: int = roundi(31.5 + cos(angle) * 28.0)
		var star_y: int = roundi(31.5 + sin(angle) * 28.0)
		_diamond(canvas, star_x, star_y, 2, 2, GOLD_LIGHT)
	# The central compass and four different rune marks.
	_line(canvas, 32, 20, 32, 43, Color("#f7d787"))
	_line(canvas, 20, 32, 43, 32, Color("#f7d787"))
	_diamond(canvas, 32, 32, 7, 9, Color(0.95, 0.75, 0.4, 0.27))
	_line(canvas, 32, 23, 25, 32, GOLD_LIGHT)
	_line(canvas, 25, 32, 32, 41, GOLD_LIGHT)
	_line(canvas, 32, 41, 39, 32, GOLD_LIGHT)
	_line(canvas, 39, 32, 32, 23, GOLD_LIGHT)
	_rect(canvas, 30, 30, 4, 4, Color("#fff5c5"))
	_line(canvas, 29, 8, 29, 13, GOLD_LIGHT)
	_line(canvas, 29, 8, 34, 11, GOLD_LIGHT)
	_line(canvas, 29, 13, 34, 11, GOLD_LIGHT)
	_line(canvas, 50, 29, 55, 29, GOLD_LIGHT)
	_line(canvas, 50, 29, 52, 34, GOLD_LIGHT)
	_line(canvas, 55, 29, 52, 34, GOLD_LIGHT)
	_line(canvas, 29, 51, 35, 51, GOLD_LIGHT)
	_line(canvas, 29, 51, 32, 56, GOLD_LIGHT)
	_line(canvas, 35, 51, 32, 56, GOLD_LIGHT)
	_line(canvas, 8, 30, 13, 30, GOLD_LIGHT)
	_line(canvas, 8, 34, 13, 34, GOLD_LIGHT)
	_line(canvas, 10, 28, 10, 36, GOLD_LIGHT)
	return _finish(key, canvas)


static func keeper() -> Texture2D:
	var key: String = "keeper"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(32, 48)
	# A small lantern casts its own stepped, transparent halo.
	_ellipse(canvas, 26, 31, 5, 9, Color(1.0, 0.72, 0.3, 0.12))
	_ellipse(canvas, 26, 31, 4, 6, Color(1.0, 0.82, 0.4, 0.18))
	_rect(canvas, 10, 40, 6, 4, OUTLINE)
	_rect(canvas, 18, 40, 6, 4, OUTLINE)
	_rect(canvas, 10, 42, 5, 2, Color("#725143"))
	_rect(canvas, 19, 42, 5, 2, Color("#725143"))
	# Long ochre robes, dark folds, and embroidered golden hems.
	_rect(canvas, 11, 18, 12, 6, OUTLINE)
	_rect(canvas, 8, 24, 17, 8, OUTLINE)
	_rect(canvas, 7, 31, 19, 11, OUTLINE)
	_rect(canvas, 9, 23, 14, 10, Color("#304956"))
	_rect(canvas, 8, 31, 17, 10, Color("#243d49"))
	_rect(canvas, 9, 25, 3, 13, Color("#596e70"))
	_rect(canvas, 12, 29, 3, 10, Color("#415b65"))
	_rect(canvas, 20, 26, 3, 14, Color("#1c2e3e"))
	_rect(canvas, 16, 30, 2, 11, Color("#253e4d"))
	_rect(canvas, 8, 39, 17, 2, GOLD_DARK)
	_rect(canvas, 10, 39, 13, 1, GOLD)
	_px(canvas, 11, 38, GOLD_LIGHT)
	_px(canvas, 16, 38, GOLD_LIGHT)
	_px(canvas, 21, 38, GOLD_LIGHT)
	# One hand rests on an old staff; the other holds the gold lantern.
	_rect(canvas, 4, 18, 2, 26, OUTLINE)
	_rect(canvas, 4, 18, 1, 26, Color("#aa8051"))
	_rect(canvas, 3, 16, 3, 3, GOLD)
	_rect(canvas, 6, 26, 4, 5, Color("#e0b18b"))
	_rect(canvas, 6, 29, 2, 2, Color("#a5755a"))
	_rect(canvas, 23, 26, 4, 4, Color("#9c6b56"))
	_rect(canvas, 24, 26, 3, 3, Color("#ebc09a"))
	_line(canvas, 25, 29, 27, 29, GOLD_DARK)
	_rect(canvas, 23, 30, 7, 9, GOLD_DARK)
	_rect(canvas, 24, 31, 5, 6, Color("#edae55"))
	_rect(canvas, 25, 31, 3, 5, Color("#ffe8a1"))
	_rect(canvas, 26, 32, 1, 3, Color("#fff9d4"))
	_rect(canvas, 23, 29, 7, 2, GOLD)
	_rect(canvas, 23, 37, 7, 2, GOLD)
	_px(canvas, 26, 28, GOLD_LIGHT)
	# The elder's white hair and long beard remain readable at game scale.
	_rect(canvas, 12, 5, 9, 2, OUTLINE)
	_rect(canvas, 10, 7, 13, 9, OUTLINE)
	_rect(canvas, 11, 16, 12, 4, OUTLINE)
	_rect(canvas, 12, 8, 10, 9, Color("#c79a77"))
	_rect(canvas, 15, 9, 7, 7, Color("#e4bd94"))
	_rect(canvas, 11, 7, 11, 3, Color("#e9e0c8"))
	_rect(canvas, 12, 6, 8, 2, Color("#fff3d8"))
	_rect(canvas, 10, 10, 3, 8, Color("#b9b7a9"))
	_rect(canvas, 11, 11, 2, 5, Color("#ede6d2"))
	_rect(canvas, 14, 11, 3, 1, Color("#f7efd9"))
	_rect(canvas, 19, 11, 3, 1, Color("#f7efd9"))
	_px(canvas, 15, 13, OUTLINE)
	_px(canvas, 20, 13, OUTLINE)
	_rect(canvas, 17, 14, 2, 2, Color("#bc8868"))
	_rect(canvas, 13, 16, 9, 5, Color("#abaea2"))
	_rect(canvas, 12, 18, 10, 5, Color("#dedccc"))
	_rect(canvas, 14, 21, 7, 5, Color("#d4d5c5"))
	_rect(canvas, 15, 25, 5, 3, Color("#b9bcaf"))
	_rect(canvas, 16, 28, 3, 2, Color("#dedccc"))
	_rect(canvas, 13, 17, 3, 6, Color("#fff3d8"))
	_rect(canvas, 15, 22, 2, 4, Color("#f1ecd7"))
	_rect(canvas, 19, 18, 2, 4, Color("#939d98"))
	_rect(canvas, 16, 17, 3, 1, Color("#7b7062"))
	return _finish(key, canvas)


static func guardian(frame: int = 0) -> Texture2D:
	var pose: int = posmod(frame, 2)
	var key: String = "guardian_%d" % pose
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(64, 80)
	var stone: Color = Color("#32605d")
	var dark_stone: Color = Color("#284b50")
	var moss: Color = Color("#588665")
	var pulse: Color = GOLD_LIGHT if pose == 0 else Color("#fff5c5")
	# Separate weighty stones outline the arms, hips, and broad planted feet.
	_stone_block(canvas, 16, 51, 14, 23, dark_stone)
	_stone_block(canvas, 34, 51, 14, 23, dark_stone)
	_stone_block(canvas, 12, 69, 19, 7, stone)
	_stone_block(canvas, 34, 69, 20, 7, stone)
	_stone_block(canvas, 20, 47, 24, 13, stone)
	_stone_block(canvas, 4, 25, 21, 19, stone)
	_stone_block(canvas, 40, 25, 20, 19, dark_stone)
	_stone_block(canvas, 3, 40, 15, 21, dark_stone)
	_stone_block(canvas, 48, 40, 14, 21, dark_stone)
	_stone_block(canvas, 5, 55, 14, 9, stone)
	_stone_block(canvas, 47, 55, 14, 9, stone)
	_stone_block(canvas, 18, 24, 29, 29, stone)
	# An ancient head has a broken crown, engraved brow, and amber eyes.
	_stone_block(canvas, 20, 6, 25, 22, stone)
	_stone_block(canvas, 17, 8, 6, 13, dark_stone)
	_stone_block(canvas, 42, 8, 6, 13, dark_stone)
	_rect(canvas, 22, 4, 6, 4, Color("#547f73"))
	_rect(canvas, 29, 3, 8, 5, Color("#547f73"))
	_rect(canvas, 38, 5, 4, 3, Color("#3d6a63"))
	_rect(canvas, 23, 13, 19, 2, Color("#152f38"))
	_rect(canvas, 24, 15, 6, 3, Color("#132a35"))
	_rect(canvas, 35, 15, 6, 3, Color("#132a35"))
	_rect(canvas, 25, 15, 4, 2, pulse)
	_rect(canvas, 36, 15, 4, 2, pulse)
	_rect(canvas, 31, 16, 3, 6, Color("#6d8e7d"))
	_rect(canvas, 27, 23, 12, 1, Color("#132a35"))
	_px(canvas, 32, 10, GOLD)
	_px(canvas, 31, 9, GOLD)
	_px(canvas, 33, 9, GOLD)
	# The chest is an amber crystal held by a chipped stone bezel.
	_diamond(canvas, 32, 39, 11, 13, Color("#183d45"))
	_diamond(canvas, 32, 39, 8, 11, GOLD_DARK)
	_diamond(canvas, 32, 39, 6, 9, Color("#e8a84e"))
	_diamond(canvas, 31, 38, 4, 7, pulse)
	_line(canvas, 32, 31, 28, 39, Color("#fff5ca"))
	_line(canvas, 28, 39, 32, 47, GOLD_LIGHT)
	_line(canvas, 32, 33, 32, 43, Color("#fff9d7"))
	_rect(canvas, 31, 38, 3, 3, Color("#fffbed"))
	if pose == 1:
		_px(canvas, 24, 37, GOLD_LIGHT)
		_px(canvas, 40, 40, GOLD_LIGHT)
		_rect(canvas, 31, 29, 2, 2, Color("#fff5c5"))
	# Angular cracks and tarnished brass runes interrupt the stone planes.
	_line(canvas, 10, 31, 14, 34, Color("#1b3a40"))
	_line(canvas, 14, 34, 12, 39, Color("#1b3a40"))
	_line(canvas, 49, 29, 47, 33, Color("#152f38"))
	_line(canvas, 47, 33, 52, 35, Color("#152f38"))
	_line(canvas, 24, 58, 22, 62, Color("#152f38"))
	_line(canvas, 22, 62, 25, 66, Color("#152f38"))
	_line(canvas, 39, 62, 42, 65, Color("#152f38"))
	_rect(canvas, 9, 44, 3, 8, GOLD_DARK)
	_rect(canvas, 8, 47, 5, 1, GOLD)
	_rect(canvas, 53, 43, 3, 8, GOLD_DARK)
	_rect(canvas, 52, 46, 5, 1, GOLD)
	_rect(canvas, 21, 72, 5, 1, GOLD_DARK)
	_rect(canvas, 39, 72, 5, 1, GOLD_DARK)
	# Vines link the crown to one shoulder, ending in sharp little leaves.
	_line(canvas, 20, 8, 22, 17, Color("#305745"), 2)
	_line(canvas, 22, 17, 17, 28, Color("#305745"), 2)
	_line(canvas, 17, 28, 12, 29, Color("#305745"), 2)
	_line(canvas, 12, 29, 10, 41, Color("#305745"), 2)
	_rect(canvas, 16, 8, 7, 3, moss)
	_rect(canvas, 17, 11, 4, 2, Color("#82a77b"))
	_rect(canvas, 19, 19, 5, 3, moss)
	_rect(canvas, 15, 24, 6, 3, Color("#648f69"))
	_rect(canvas, 8, 27, 6, 3, moss)
	_rect(canvas, 7, 34, 5, 3, Color("#7ea273"))
	_rect(canvas, 10, 38, 5, 2, moss)
	_rect(canvas, 38, 6, 7, 3, Color("#557c59"))
	_rect(canvas, 39, 69, 8, 2, Color("#557c59"))
	_px(canvas, 18, 9, Color("#acc08d"))
	_px(canvas, 8, 35, Color("#acc08d"))
	return _finish(key, canvas)


static func sword_slash() -> Texture2D:
	var key: String = "sword_slash"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(64, 64)
	# A rightward crescent has transparent space behind it for easy flipping.
	for y: int in range(64):
		for x: int in range(64):
			var dx: float = float(x - 22)
			var dy: float = float(y - 32)
			var distance: float = sqrt(dx * dx + dy * dy)
			var angle: float = absf(atan2(dy, dx))
			if angle > 1.3:
				continue
			var taper: float = angle / 1.3
			var inner: float = 22.0 + taper * 7.0
			if distance >= inner - 2.0 and distance <= 31.0:
				_px(canvas, x, y, Color(1.0, 0.78, 0.35, 0.18))
			if distance >= inner and distance <= 29.5:
				var alpha: float = 0.98 - taper * 0.3
				_px(canvas, x, y, Color(1.0, 0.80, 0.42, alpha))
			if distance >= maxf(inner, 27.0) and distance <= 29.0:
				_px(canvas, x, y, Color(1.0, 0.98, 0.84, 1.0 - taper * 0.2))
			if angle < 0.85 and distance >= 17.0 + angle * 3.0 and distance <= 19.0:
				_px(canvas, x, y, Color(1.0, 0.85, 0.48, 0.3))
	_line(canvas, 53, 29, 53, 35, Color("#fff9d4"))
	_line(canvas, 50, 32, 57, 32, Color("#fff9d4"))
	_px(canvas, 59, 25, GOLD_LIGHT)
	_px(canvas, 43, 8, GOLD_LIGHT)
	_px(canvas, 42, 56, Color(1.0, 0.82, 0.4, 0.72))
	return _finish(key, canvas)


static func potion() -> Texture2D:
	var key: String = "potion"
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(20, 28)
	_ellipse(canvas, 10, 17, 9, 10, Color(0.95, 0.32, 0.32, 0.12))
	_ellipse(canvas, 10, 17, 7, 9, OUTLINE)
	_ellipse(canvas, 10, 17, 6, 8, Color("#65948e"))
	_ellipse(canvas, 10, 17, 5, 7, Color("#bb4557"))
	# A flat liquid surface and a darker right face give the bottle volume.
	_rect(canvas, 6, 13, 8, 3, Color("#ef7980"))
	_rect(canvas, 7, 14, 6, 2, Color("#ff9a93"))
	_rect(canvas, 12, 17, 2, 6, Color("#8e324c"))
	_rect(canvas, 7, 22, 6, 2, Color("#d75066"))
	_rect(canvas, 7, 5, 6, 7, OUTLINE)
	_rect(canvas, 8, 6, 4, 6, Color("#679d99"))
	_rect(canvas, 9, 7, 2, 5, Color("#bdd8c8"))
	_rect(canvas, 6, 9, 8, 3, Color("#537b79"))
	_rect(canvas, 7, 9, 6, 1, Color("#d1e3c6"))
	_rect(canvas, 7, 2, 6, 4, GOLD_DARK)
	_rect(canvas, 8, 2, 4, 3, Color("#c79358"))
	_rect(canvas, 8, 2, 3, 1, GOLD_LIGHT)
	_line(canvas, 5, 13, 5, 19, Color("#fff0d7"))
	_rect(canvas, 6, 12, 2, 2, Color("#fff0d7"))
	_px(canvas, 6, 21, Color("#cfe0cb"))
	_px(canvas, 15, 11, Color("#ffd0aa"))
	return _finish(key, canvas)


static func campfire(frame: int = 0) -> Texture2D:
	var pose: int = posmod(frame, 2)
	var key: String = "campfire_%d" % pose
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(32, 40)
	var shift: int = pose * 2
	_ellipse(canvas, 16, 23, 15, 15, Color(1.0, 0.65, 0.25, 0.1))
	_ellipse(canvas, 16, 28, 12, 8, Color("#9f493a"))
	_triangle(canvas, 16 + pose, 3 + shift, 9, 28 - shift, Color("#ca6139"))
	_triangle(canvas, 9 - pose, 14 - shift, 5, 17 + shift, Color("#dd793a"))
	_triangle(canvas, 24, 12 + shift, 5, 19 - shift, Color("#c96838"))
	_ellipse(canvas, 16, 27, 10, 6, Color("#f3a445"))
	_triangle(canvas, 15 + pose, 10 - shift, 6, 21 + shift, Color("#f8b94f"))
	_triangle(canvas, 21 - pose, 19 - shift, 4, 13 + shift, Color("#ffd477"))
	_triangle(canvas, 14, 18 + shift, 4, 13 - shift, Color("#fff0af"))
	_rect(canvas, 13, 27, 6, 5, Color("#fff7cc"))
	# Crossed charred logs sit in front, ringed by small cool stones.
	_rect(canvas, 3, 34, 6, 4, Color("#40514c"))
	_rect(canvas, 23, 34, 6, 4, Color("#40514c"))
	_rect(canvas, 9, 37, 14, 2, Color("#263c3d"))
	_line(canvas, 5, 33, 24, 36, OUTLINE, 3)
	_line(canvas, 6, 37, 25, 32, OUTLINE, 3)
	_line(canvas, 6, 33, 24, 36, Color("#8c6242"), 2)
	_line(canvas, 6, 37, 25, 32, Color("#9b7049"), 2)
	_line(canvas, 7, 33, 23, 36, Color("#c59256"))
	_line(canvas, 7, 37, 24, 32, Color("#b68751"))
	_rect(canvas, 23, 32, 3, 3, Color("#d5a46a"))
	_px(canvas, 24, 33, Color("#75523b"))
	_px(canvas, 8, 7 + shift, GOLD_LIGHT)
	_px(canvas, 23, 3 + shift, GOLD)
	_px(canvas, 27, 19 - shift, Color("#ffd58a"))
	return _finish(key, canvas)


## Canonical Lynn sprites: four independently drawn directions, fixed left
## lantern and right hip satchel. The foot anchor is (16, 44) for every action.
static func hero_direction(direction: String = "south", frame: int = 0, action: String = "idle") -> Texture2D:
	var facing: String = direction if direction in ["north", "south", "east", "west"] else "south"
	var motion: String = action if action in ["idle", "walk", "attack", "dash", "pulse", "hit", "death", "interact"] else "idle"
	var counts: Dictionary = {"idle": 4, "walk": 6, "attack": 6, "dash": 4, "pulse": 6, "hit": 3, "death": 6, "interact": 4}
	var pose: int = posmod(frame, int(counts[motion]))
	var key: String = "lynn_%s_%s_%d" % [facing, motion, pose]
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(32, 48)
	if motion == "death" and pose >= 3:
		_draw_lynn_fallen(canvas)
		return _finish(key, canvas)
	var stride: int = 0
	var bob: int = 0
	if motion == "idle":
		bob = -1 if pose == 2 else 0
	elif motion == "walk":
		var steps: Array[int] = [-1, 0, 1, 1, 0, -1]
		stride = steps[pose]
		bob = -1 if pose == 1 or pose == 4 else 0
	elif motion == "dash":
		stride = 2 if pose < 3 else 0
		bob = 1
	elif motion == "hit":
		bob = 1 if pose == 0 else 0
	elif motion == "death":
		bob = pose * 2
	var lamp_raise: int = 0
	if motion == "idle":
		lamp_raise = 1 if pose == 1 else 0
	elif motion == "pulse":
		lamp_raise = 5 if pose in [1, 2, 3] else 2
	elif motion == "interact":
		lamp_raise = 3 if pose in [1, 2] else 0
	# Boots and cropped navy trousers keep the three body masses distinct.
	var left_leg: int = 10 - stride
	var right_leg: int = 17 + stride
	_rect(canvas, left_leg, 32 + bob, 6, 9 - bob, OUTLINE)
	_rect(canvas, right_leg, 32 + bob, 6, 9 - bob, OUTLINE)
	_rect(canvas, left_leg + 1, 32 + bob, 4, 6, Color("#416775"))
	_rect(canvas, right_leg + 1, 33 + bob, 4, 5, Color("#2d4a5c"))
	_rect(canvas, left_leg, 39, 5, 2, Color("#ba9474"))
	_rect(canvas, right_leg, 39, 5, 2, Color("#ba9474"))
	_rect(canvas, left_leg - 1, 41, 7, 3, OUTLINE)
	_rect(canvas, right_leg, 41, 7, 3, OUTLINE)
	_rect(canvas, left_leg, 41, 5, 2, Color("#705344"))
	_rect(canvas, right_leg + 1, 41, 5, 2, Color("#946c4a"))
	_px(canvas, left_leg + 1, 41, GOLD)
	_px(canvas, right_leg + 2, 41, GOLD)
	if facing == "east" or facing == "west":
		_draw_lynn_side(canvas, facing, bob, lamp_raise, motion, pose)
	else:
		_draw_lynn_front_back(canvas, facing, bob, lamp_raise, motion, pose)
	_rect(canvas, 0, 44, 32, 4, Color.TRANSPARENT)
	return _finish(key, canvas)


static func _draw_lynn_front_back(canvas: Image, facing: String, bob: int, lamp_raise: int, action: String, pose: int) -> void:
	var back: bool = facing == "north"
	var lamp_x: int = 3 if back else 23
	var bag_x: int = 22 if back else 3
	# Arms belong to the cream work shirt, with rolled cuffs.
	_rect(canvas, 6, 22 + bob, 5, 9, OUTLINE)
	_rect(canvas, 22, 22 + bob, 4, 8, OUTLINE)
	_rect(canvas, 7, 23 + bob, 4, 6, Color("#d6c6a6"))
	_rect(canvas, 22, 23 + bob, 3, 5, Color("#fff0d0"))
	_rect(canvas, 7, 28 + bob, 3, 4, Color("#e6b98e"))
	_rect(canvas, 23, 28 + bob - lamp_raise, 3, 4, Color("#e6b98e"))
	_rect(canvas, 10, 19 + bob, 13, 14, OUTLINE)
	_rect(canvas, 11, 20 + bob, 11, 11, Color("#eddfbf"))
	_rect(canvas, 13, 22 + bob, 7, 8, Color("#fff2d4"))
	_rect(canvas, 16, 21 + bob, 1, 10, Color("#bda988"))
	_rect(canvas, 10, 30 + bob, 13, 3, Color("#624735"))
	_rect(canvas, 15, 30 + bob, 3, 2, GOLD)
	_px(canvas, 16, 30 + bob, GOLD_LIGHT)
	# The cape has a clear gold-trimmed point, never a floor-length skirt.
	_trap(canvas, 11, 12, 18 + bob, 5, 23, 7, OUTLINE)
	_trap(canvas, 11, 11, 19 + bob, 6, 21, 5, TEAL)
	_rect(canvas, 9, 21 + bob, 5, 2, TEAL_LIGHT)
	_rect(canvas, 20, 21 + bob, 4, 3, TEAL_DARK)
	_line(canvas, 7, 23 + bob, 12, 25 + bob, GOLD)
	_line(canvas, 19, 25 + bob, 26, 23 + bob, GOLD_DARK)
	if back:
		_trap(canvas, 7, 19, 23 + bob, 13, 7, 10, OUTLINE)
		_trap(canvas, 8, 17, 23 + bob, 14, 5, 8, TEAL)
		_line(canvas, 9, 29 + bob, 16, 32 + bob, GOLD)
		_line(canvas, 16, 32 + bob, 24, 29 + bob, GOLD)
		_rect(canvas, 12, 22 + bob, 8, 2, TEAL_DARK)
		_rect(canvas, 14, 24 + bob, 5, 2, TEAL_LIGHT)
	else:
		_rect(canvas, 12, 19 + bob, 9, 2, TEAL_DARK)
		_rect(canvas, 15, 20 + bob, 3, 2, GOLD)
		_px(canvas, 16, 20 + bob, GOLD_LIGHT)
	# The hip satchel changes visible side without mirroring the lantern.
	_draw_satchel(canvas, bag_x, 27 + bob)
	_draw_small_lantern(canvas, lamp_x, 31 + bob - lamp_raise, action == "pulse" and pose in [2, 3])
	# Head shape, cropped ivory hair, small warm eyes or a complete back crop.
	_rect(canvas, 11, 5 + bob, 11, 13, OUTLINE)
	_rect(canvas, 10, 8 + bob, 13, 7, OUTLINE)
	_rect(canvas, 12, 9 + bob, 9, 8, Color("#dfab83"))
	_rect(canvas, 13, 10 + bob, 7, 7, Color("#f3cca5"))
	_rect(canvas, 11, 5 + bob, 10, 6, Color("#c7bca5"))
	_rect(canvas, 12, 4 + bob, 8, 5, Color("#e9e0c8"))
	_rect(canvas, 13, 4 + bob, 5, 2, Color("#fff1d1"))
	_rect(canvas, 10, 8 + bob, 4, 5, Color("#e9e0c8"))
	_rect(canvas, 19, 8 + bob, 4, 5, Color("#d8cdb5"))
	_rect(canvas, 10, 13 + bob, 3, 3, Color("#a9ab9e"))
	_rect(canvas, 20, 13 + bob, 3, 3, Color("#a9ab9e"))
	_rect(canvas, 14, 8 + bob, 3, 3, Color("#fff1d1"))
	_px(canvas, 17, 10 + bob, Color("#e9e0c8"))
	_px(canvas, 9, 11 + bob, Color("#d8cdb5"))
	_px(canvas, 23, 11 + bob, Color("#d8cdb5"))
	if back:
		_rect(canvas, 12, 10 + bob, 9, 6, Color("#d8cdb5"))
		_rect(canvas, 14, 9 + bob, 5, 5, Color("#e9e0c8"))
		_rect(canvas, 14, 15 + bob, 5, 2, Color("#a9ab9e"))
		_px(canvas, 16, 16 + bob, Color("#e9e0c8"))
	else:
		_px(canvas, 13, 12 + bob, OUTLINE)
		_px(canvas, 19, 12 + bob, OUTLINE)
		_px(canvas, 14, 13 + bob, Color("#996539"))
		_px(canvas, 19, 13 + bob, Color("#996539"))
		_px(canvas, 16, 15 + bob, Color("#b77d68"))
	if action == "attack" and pose in [2, 3]:
		var hand_x: int = 24 if back else 3
		_rect(canvas, hand_x, 25 + bob, 4, 3, Color("#f3cca5"))
		_px(canvas, hand_x + 1, 24 + bob, GOLD_LIGHT)


static func _draw_lynn_side(canvas: Image, facing: String, bob: int, lamp_raise: int, action: String, pose: int) -> void:
	var right: bool = facing == "east"
	var face_x: int = 17 if right else 9
	var cloak_x: int = 6 if right else 13
	var lamp_x: int = 20 if right else 3
	var bag_x: int = 8 if right else 20
	# Side bodies are composed separately; gear never changes anatomical side.
	_rect(canvas, 12, 19 + bob, 10, 14, OUTLINE)
	_rect(canvas, 13, 20 + bob, 8, 11, Color("#eddfbf"))
	_rect(canvas, 16, 21 + bob, 4, 8, Color("#fff2d4"))
	_rect(canvas, 13, 30 + bob, 9, 3, Color("#624735"))
	_trap(canvas, 12, 9, 19 + bob, cloak_x, 14, 12, OUTLINE)
	_trap(canvas, 13, 7, 20 + bob, cloak_x + 1, 11, 9, TEAL)
	_rect(canvas, 13, 20 + bob, 5, 2, TEAL_LIGHT)
	_line(canvas, cloak_x + 1, 28 + bob, cloak_x + 10, 30 + bob, GOLD_DARK)
	if right:
		_draw_satchel(canvas, bag_x, 28 + bob)
		_rect(canvas, 19, 24 + bob, 4, 7, Color("#d6c6a6"))
		_rect(canvas, 21, 29 + bob - lamp_raise, 3, 3, Color("#f3cca5"))
		_draw_small_lantern(canvas, lamp_x, 32 + bob - lamp_raise, action == "pulse" and pose in [2, 3])
	else:
		_draw_small_lantern(canvas, lamp_x, 31 + bob - lamp_raise, action == "pulse" and pose in [2, 3])
		_rect(canvas, 9, 24 + bob, 4, 7, Color("#d6c6a6"))
		_rect(canvas, 8, 29 + bob - lamp_raise, 3, 3, Color("#f3cca5"))
		_draw_satchel(canvas, bag_x, 28 + bob)
	_rect(canvas, 11, 5 + bob, 11, 12, OUTLINE)
	_rect(canvas, face_x, 10 + bob, 6, 7, Color("#dfab83"))
	_rect(canvas, face_x + (1 if right else 0), 11 + bob, 5, 5, Color("#f3cca5"))
	_px(canvas, face_x + (5 if right else -1), 13 + bob, Color("#f3cca5"))
	_rect(canvas, 11, 5 + bob, 10, 6, Color("#c7bca5"))
	_rect(canvas, 12, 4 + bob, 7, 5, Color("#fff1d1"))
	_rect(canvas, 10 if right else 19, 9 + bob, 4, 6, Color("#e9e0c8"))
	_rect(canvas, 11 if right else 19, 14 + bob, 3, 3, Color("#a9ab9e"))
	_rect(canvas, 14 if right else 11, 9 + bob, 4, 3, Color("#e9e0c8"))
	_rect(canvas, 15 if right else 11, 10 + bob, 2, 3, Color("#fff1d1"))
	_px(canvas, 22 if right else 10, 11 + bob, Color("#d8cdb5"))
	_px(canvas, 21 if right else 10, 12 + bob, OUTLINE)
	_px(canvas, 21 if right else 10, 13 + bob, Color("#996539"))
	_px(canvas, 22 if right else 9, 16 + bob, Color("#b77d68"))
	_rect(canvas, 16, 19 + bob, 2, 2, GOLD)
	if action == "attack" and pose in [2, 3]:
		var reach: int = 26 if right else 2
		_rect(canvas, reach, 25 + bob, 4, 3, Color("#f3cca5"))
		_px(canvas, reach + 1, 24 + bob, GOLD_LIGHT)


static func _draw_lynn_fallen(canvas: Image) -> void:
	_rect(canvas, 3, 33, 11, 10, OUTLINE)
	_rect(canvas, 4, 34, 9, 6, Color("#e9e0c8"))
	_rect(canvas, 5, 34, 6, 2, Color("#fff1d1"))
	_rect(canvas, 6, 40, 6, 3, Color("#dfab83"))
	_rect(canvas, 13, 36, 12, 8, OUTLINE)
	_rect(canvas, 13, 37, 11, 6, TEAL)
	_rect(canvas, 15, 37, 6, 2, TEAL_LIGHT)
	_rect(canvas, 24, 38, 6, 5, Color("#2d4a5c"))
	_rect(canvas, 27, 41, 4, 3, Color("#705344"))
	_draw_small_lantern(canvas, 2, 23, false)


static func _draw_satchel(canvas: Image, x: int, y: int) -> void:
	_rect(canvas, x, y, 7, 8, OUTLINE)
	_rect(canvas, x + 1, y, 5, 7, Color("#8d5939"))
	_rect(canvas, x + 1, y + 1, 5, 2, Color("#c08a4f"))
	_rect(canvas, x + 2, y + 3, 2, 3, GOLD_DARK)
	_px(canvas, x + 2, y + 3, GOLD_LIGHT)
	_rect(canvas, x + 4, y - 2, 1, 3, Color("#cdd0bb"))
	_px(canvas, x + 5, y - 3, Color("#dfe1d3"))


static func _draw_small_lantern(canvas: Image, x: int, y: int, bright: bool = false) -> void:
	_rect(canvas, x + 2, y - 3, 3, 1, GOLD_DARK)
	_px(canvas, x + 1, y - 2, GOLD_DARK)
	_px(canvas, x + 5, y - 2, GOLD_DARK)
	_rect(canvas, x, y, 7, 9, OUTLINE)
	_rect(canvas, x + 1, y, 5, 1, GOLD)
	_rect(canvas, x + 1, y + 2, 5, 5, Color("#cf9240"))
	_rect(canvas, x + 2, y + 2, 3, 5, GOLD_LIGHT)
	_rect(canvas, x + 3, y + 3, 1, 3, Color("#fff9d7") if bright else Color("#fff2b8"))
	_rect(canvas, x + 1, y + 7, 5, 1, GOLD)
	_px(canvas, x + 1, y + 2, GOLD_DARK)
	_px(canvas, x + 5, y + 6, GOLD_DARK)


static func npc(key: String, frame: int = 0) -> Texture2D:
	var person: String = _npc_key(key)
	var pose: int = posmod(frame, 2)
	var cache_key: String = "npc_%s_%d" % [person, pose]
	if _cache.has(cache_key):
		return _cache[cache_key] as Texture2D
	if person == "cen":
		return _finish(cache_key, keeper().get_image())
	var canvas: Image = _canvas(32, 48)
	if person == "xiaohe":
		_rect(canvas, 10, 34, 5, 8, Color("#374b62"))
		_rect(canvas, 17, 34, 5, 8, Color("#374b62"))
		_rect(canvas, 9, 41, 7, 3, OUTLINE)
		_rect(canvas, 17, 41, 7, 3, OUTLINE)
		_rect(canvas, 10, 41, 5, 2, Color("#8a6b4d"))
		_rect(canvas, 18, 41, 5, 2, Color("#8a6b4d"))
		_rect(canvas, 9, 25, 15, 12, OUTLINE)
		_rect(canvas, 10, 25, 13, 10, Color("#d4d2b7"))
		_rect(canvas, 11, 26, 10, 5, Color("#f2e7c9"))
		_rect(canvas, 10, 33, 13, 3, Color("#809681"))
		_rect(canvas, 8, 27 + pose, 4, 7, Color("#e0b28c"))
		_rect(canvas, 22, 27 + pose, 3, 7, Color("#e0b28c"))
		_rect(canvas, 10, 14, 13, 11, OUTLINE)
		_rect(canvas, 11, 16, 11, 8, Color("#efc7a1"))
		_rect(canvas, 10, 14, 13, 5, Color("#715744"))
		_rect(canvas, 12, 13, 8, 4, Color("#a78152"))
		_rect(canvas, 12, 17, 3, 3, Color("#987347"))
		_px(canvas, 14, 21, OUTLINE)
		_px(canvas, 20, 21, OUTLINE)
		_px(canvas, 17, 23, Color("#a97f65"))
	else:
		_rect(canvas, 9, 38, 7, 6, OUTLINE)
		_rect(canvas, 19, 38, 7, 6, OUTLINE)
		_rect(canvas, 10, 41, 5, 2, Color("#946548"))
		_rect(canvas, 20, 41, 5, 2, Color("#946548"))
		_trap(canvas, 11, 12, 19, 7, 21, 22, OUTLINE)
		_trap(canvas, 12, 10, 20, 8, 19, 20, Color("#a46b4c"))
		_rect(canvas, 11, 23, 11, 8, Color("#c18759"))
		_trap(canvas, 13, 7, 29, 11, 12, 10, Color("#e6c5a1"))
		_rect(canvas, 15, 28, 4, 3, Color("#f2dfbd"))
		_rect(canvas, 10, 28, 15, 2, Color("#72513e"))
		_rect(canvas, 16, 28, 3, 2, GOLD)
		_rect(canvas, 7, 23, 4, 9, Color("#ad7352"))
		_rect(canvas, 23, 23 - pose, 4, 8, Color("#c18759"))
		_rect(canvas, 7, 30, 4, 4, Color("#d9a881"))
		_rect(canvas, 24, 29 - pose, 4, 4, Color("#efc39a"))
		_ellipse(canvas, 16, 11, 8, 9, OUTLINE)
		_ellipse(canvas, 16, 11, 7, 8, Color("#684136"))
		_rect(canvas, 11, 9, 11, 9, Color("#eac09a"))
		_rect(canvas, 10, 6, 13, 5, Color("#89503c"))
		_rect(canvas, 12, 5, 8, 3, Color("#ba7d50"))
		_rect(canvas, 10, 10, 3, 7, Color("#89503c"))
		_rect(canvas, 21, 8, 3, 10, Color("#684136"))
		_px(canvas, 15, 12, OUTLINE)
		_px(canvas, 20, 12, OUTLINE)
		_rect(canvas, 16, 16, 3, 1, Color("#a66353"))
		_px(canvas, 22, 8, GOLD_LIGHT)
	return _finish(cache_key, canvas)


static func enemy(kind: String, frame: int = 0) -> Texture2D:
	var species: String = _enemy_key(kind)
	var pose: int = posmod(frame, 2)
	var key: String = "enemy_%s_%d" % [species, pose]
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(40, 48)
	var dark: Color = Color("#213746")
	var purple: Color = Color("#797198")
	var danger: Color = Color("#dc8790")
	match species:
		"firefly":
			_ellipse(canvas, 12, 25 + pose, 8, 5, Color("#314956"))
			_ellipse(canvas, 28, 25 - pose, 8, 5, Color("#314956"))
			_line(canvas, 6, 23 + pose, 16, 27, Color("#9ba9b9"))
			_line(canvas, 24, 27, 34, 23 - pose, Color("#9ba9b9"))
			_ellipse(canvas, 20, 32, 6, 10, OUTLINE)
			_ellipse(canvas, 20, 33, 4, 8, Color("#75496a"))
			_rect(canvas, 17, 33, 7, 3, danger)
			_rect(canvas, 18, 38, 5, 2, Color("#ffc0a2"))
			_ellipse(canvas, 20, 22, 4, 4, dark)
			_px(canvas, 18, 22, Color("#ffc0a2"))
			_px(canvas, 22, 22, Color("#ffc0a2"))
			_line(canvas, 18, 19, 14, 15, purple)
			_line(canvas, 22, 19, 26, 15, purple)
		"shade":
			_ellipse(canvas, 20, 30, 14, 8, dark)
			_ellipse(canvas, 18, 28, 12, 6, Color("#4d6870"))
			_ellipse(canvas, 29, 24, 8, 8, dark)
			_ellipse(canvas, 29, 25, 6, 6, Color("#728087"))
			_triangle(canvas, 26, 12, 3, 12, dark)
			_triangle(canvas, 33, 14, 3, 12, dark)
			_rect(canvas, 11 - pose, 35, 5, 9, dark)
			_rect(canvas, 25 + pose, 34, 5, 10, dark)
			_line(canvas, 7, 28, 2, 22, purple, 2)
			_rect(canvas, 30, 24, 3, 2, danger)
			_rect(canvas, 33, 30, 5, 3, Color("#152d3b"))
			_line(canvas, 15, 26, 22, 27, Color("#8a9599"))
		"vine":
			_ellipse(canvas, 20, 40, 15, 4, OUTLINE)
			_ellipse(canvas, 20, 39, 13, 3, Color("#587656"))
			_line(canvas, 18, 39, 23, 27, Color("#31544b"), 4)
			_line(canvas, 23, 27, 18 + pose, 18, Color("#527d5c"), 4)
			_ellipse(canvas, 18 + pose, 17, 8, 7, OUTLINE)
			_ellipse(canvas, 18 + pose, 17, 6, 5, Color("#a16973"))
			_rect(canvas, 14 + pose, 16, 9, 2, Color("#ebae9c"))
			_triangle(canvas, 10, 23, 5, 10, Color("#437c5f"))
			_triangle(canvas, 30, 24, 5, 10, Color("#437c5f"))
			_line(canvas, 8, 40, 3, 35, Color("#83a176"), 2)
			_line(canvas, 30, 40, 37, 37, Color("#83a176"), 2)
		"woodguard":
			_stone_block(canvas, 11, 33, 7, 11, Color("#725d4d"))
			_stone_block(canvas, 22, 33, 7, 11, Color("#725d4d"))
			_trap(canvas, 10, 21, 16, 12, 17, 22, OUTLINE)
			_trap(canvas, 11, 19, 17, 13, 15, 20, Color("#7f6950"))
			_rect(canvas, 13, 20, 2, 14, Color("#b49663"))
			_rect(canvas, 20, 17, 2, 20, Color("#52493e"))
			_rect(canvas, 24, 20, 2, 15, Color("#b49663"))
			_rect(canvas, 13, 8, 15, 13, OUTLINE)
			_rect(canvas, 14, 9, 13, 11, Color("#826c4e"))
			_rect(canvas, 15, 14, 11, 3, Color("#354446"))
			_px(canvas, 17, 15, GOLD_LIGHT)
			_px(canvas, 24, 15, GOLD_LIGHT)
			_line(canvas, 9, 24, 5 - pose, 35, Color("#93724e"), 4)
			_line(canvas, 30, 24, 33 + pose, 35, Color("#6a5849"), 4)
			_rect(canvas, 14, 9, 7, 2, Color("#63805a"))
		"spider":
			for index: int in range(4):
				var leg_y: int = 23 + index * 4
				_line(canvas, 12, leg_y, 4, leg_y - 4 + pose, dark, 2)
				_line(canvas, 4, leg_y - 4 + pose, 2, leg_y + 6, Color("#647e7d"), 2)
				_line(canvas, 28, leg_y, 36, leg_y - 4 - pose, dark, 2)
				_line(canvas, 36, leg_y - 4 - pose, 38, leg_y + 6, Color("#647e7d"), 2)
			_ellipse(canvas, 20, 28, 10, 11, OUTLINE)
			_ellipse(canvas, 19, 27, 8, 9, Color("#47616a"))
			_ellipse(canvas, 17, 23, 4, 3, Color("#819996"))
			_ellipse(canvas, 20, 37, 6, 5, dark)
			_rect(canvas, 16, 37, 3, 2, danger)
			_rect(canvas, 22, 37, 3, 2, danger)
		"drowned":
			_ellipse(canvas, 20, 40, 14, 4, Color(0.43, 0.63, 0.64, 0.55))
			_trap(canvas, 15, 11, 15, 10, 21, 27, dark)
			_trap(canvas, 16, 9, 16, 12, 17, 24, Color("#597a81"))
			_ellipse(canvas, 20, 13, 7, 8, dark)
			_ellipse(canvas, 19, 13, 5, 6, Color("#849994"))
			_rect(canvas, 15, 12, 4, 2, Color("#cfdddd"))
			_rect(canvas, 22, 12, 3, 2, Color("#cfdddd"))
			_line(canvas, 14, 23, 7, 32 + pose, Color("#789899"), 3)
			_line(canvas, 26, 23, 32, 32 - pose, Color("#597a81"), 3)
			_rect(canvas, 15, 37, 3, 6, purple)
			_rect(canvas, 22, 39, 4, 5, Color("#597a81"))
		"sentinel", "statue":
			var cracked: bool = species == "statue"
			_stone_block(canvas, 11, 32, 7, 12, Color("#4f6576"))
			_stone_block(canvas, 22, 32, 7, 12, Color("#4f6576"))
			_stone_block(canvas, 10, 18, 20, 19, Color("#627b87"))
			_stone_block(canvas, 13, 5, 14, 15, Color("#627b87"))
			_stone_block(canvas, 5, 20, 7, 18, Color("#4f6576"))
			_stone_block(canvas, 28, 20, 7, 18, Color("#4f6576"))
			_rect(canvas, 16, 11, 8, 2, Color("#c3dddd"))
			_diamond(canvas, 20, 26, 4, 6, danger if cracked else Color("#95c5cf"))
			if cracked:
				_line(canvas, 16, 6, 19, 11, OUTLINE)
				_line(canvas, 19, 11, 16, 17, OUTLINE)
				_line(canvas, 28, 21, 25, 26, OUTLINE)
				_rect(canvas, 9, 19, 4, 4, Color.TRANSPARENT)
			else:
				_rect(canvas, 14, 21, 2, 9, GOLD_DARK)
				_rect(canvas, 24, 21, 2, 9, GOLD_DARK)
		"patrol":
			_rect(canvas, 12, 33, 6, 11, OUTLINE)
			_rect(canvas, 21, 33, 6, 11, OUTLINE)
			_trap(canvas, 13, 14, 19, 10, 20, 18, OUTLINE)
			_trap(canvas, 14, 12, 20, 11, 17, 16, Color("#655e79"))
			_rect(canvas, 14, 27, 13, 2, Color("#9a8c98"))
			_stone_block(canvas, 14, 5, 13, 15, Color("#555772"))
			_rect(canvas, 16, 12, 9, 3, Color("#172b3a"))
			_rect(canvas, 17, 13, 7, 1, danger)
			_line(canvas, 10, 22, 6, 31, purple, 3)
			_line(canvas, 29, 22, 33, 31, purple, 3)
			_rect(canvas, 3, 31, 7, 10, GOLD_DARK)
			_rect(canvas, 4, 32, 5, 8, Color("#253342"))
			_line(canvas, 33, 30, 35, 17 - pose, Color("#bfbdc1"), 2)
		"rootslinger":
			_line(canvas, 17, 32, 12, 44, Color("#675e59"), 3)
			_line(canvas, 23, 32, 28, 44, Color("#675e59"), 3)
			_trap(canvas, 16, 9, 19, 15, 11, 18, OUTLINE)
			_trap(canvas, 17, 7, 20, 16, 8, 15, Color("#777063"))
			_ellipse(canvas, 20, 13, 6, 7, Color("#5d595f"))
			_triangle(canvas, 16, 2, 3, 10, Color("#5d595f"))
			_triangle(canvas, 25, 3, 3, 11, Color("#5d595f"))
			_px(canvas, 18, 13, danger)
			_px(canvas, 23, 13, danger)
			_line(canvas, 23, 23, 31, 27, Color("#8e8269"), 3)
			_line(canvas, 31, 15, 36, 26, Color("#9f8f6c"), 2)
			_line(canvas, 36, 26, 31, 37, Color("#9f8f6c"), 2)
			_line(canvas, 31, 15, 31, 37, Color("#c1b29a"))
			_line(canvas, 25 - pose, 27, 36, 27, Color("#d8b8a5"))
	# Reserve the four pixels below the shared ground anchor.
	_rect(canvas, 0, 44, 40, 4, Color.TRANSPARENT)
	return _finish(key, canvas)


static func boss(kind: String, frame: int = 0) -> Texture2D:
	var species: String = _boss_key(kind)
	var pose: int = posmod(frame, 2)
	var key: String = "boss_%s_%d" % [species, pose]
	if _cache.has(key):
		return _cache[key] as Texture2D
	if species == "guardian":
		return guardian(pose)
	var canvas: Image = _canvas(80, 96)
	match species:
		"hunter":
			for leg: int in [24, 37, 53, 62]:
				_line(canvas, leg, 58, leg - 3 + pose, 90, Color("#354b5d"), 4)
				_rect(canvas, leg - 5 + pose, 88, 7, 4, OUTLINE)
			_ellipse(canvas, 42, 53, 25, 16, OUTLINE)
			_ellipse(canvas, 40, 51, 23, 13, Color("#526973"))
			_ellipse(canvas, 35, 46, 15, 6, Color("#82928d"))
			_trap(canvas, 52, 12, 23, 51, 17, 30, Color("#354b5d"))
			_ellipse(canvas, 61, 25, 10, 9, OUTLINE)
			_ellipse(canvas, 62, 25, 8, 7, Color("#70848a"))
			_line(canvas, 57, 19, 46, 6, Color("#afb0b0"), 3)
			_line(canvas, 46, 6, 42, 2, Color("#afb0b0"), 2)
			_line(canvas, 49, 10, 39, 11, Color("#afb0b0"), 2)
			_line(canvas, 65, 17, 69, 5, Color("#afb0b0"), 3)
			_line(canvas, 69, 5, 75, 2, Color("#afb0b0"), 2)
			_line(canvas, 70, 9, 77, 10, Color("#afb0b0"), 2)
			_rect(canvas, 65, 24, 3, 2, Color("#f8c79d"))
			_line(canvas, 17, 49, 4, 39, Color("#7b7894"), 4)
			_line(canvas, 26, 55, 43, 59, Color("#797b91"), 2)
		"colossus":
			_stone_block(canvas, 23, 63, 14, 29, Color("#485d70"))
			_stone_block(canvas, 43, 63, 14, 29, Color("#485d70"))
			_stone_block(canvas, 20, 83, 19, 9, Color("#637888"))
			_stone_block(canvas, 42, 83, 20, 9, Color("#637888"))
			_stone_block(canvas, 21, 25, 39, 42, Color("#637888"))
			_stone_block(canvas, 7, 29, 16, 43, Color("#485d70"))
			_stone_block(canvas, 59, 29, 15, 43, Color("#485d70"))
			_stone_block(canvas, 27, 6, 27, 24, Color("#637888"))
			_rect(canvas, 30, 16, 21, 3, Color("#c9dada"))
			_diamond(canvas, 41, 45, 11, 14, Color("#243e50"))
			_diamond(canvas, 41, 45, 7, 10, GOLD)
			_diamond(canvas, 40, 44, 4, 7, GOLD_LIGHT)
			for row: int in [31, 42, 53, 64]:
				_rect(canvas, 12, row, 6, 2, Color("#a7bbbd"))
				_rect(canvas, 64, row, 5, 2, Color("#a7bbbd"))
				_px(canvas, 15, row + 2, GOLD)
			_line(canvas, 30, 7, 32, 13, OUTLINE)
		"nightwatch":
			_stone_block(canvas, 25, 64, 10, 28, Color("#514f65"))
			_stone_block(canvas, 45, 64, 10, 28, Color("#514f65"))
			_trap(canvas, 23, 35, 27, 18, 46, 48, OUTLINE)
			_trap(canvas, 25, 31, 29, 21, 40, 44, Color("#514562"))
			_stone_block(canvas, 28, 25, 25, 32, Color("#777084"))
			_stone_block(canvas, 25, 6, 28, 23, Color("#777084"))
			_rect(canvas, 29, 16, 21, 6, Color("#1b293c"))
			_rect(canvas, 32, 18, 15, 2, Color("#e8b4a4"))
			_rect(canvas, 37, 7, 3, 13, Color("#a0a0a1"))
			_stone_block(canvas, 15, 29, 13, 13, Color("#6e697e"))
			_stone_block(canvas, 52, 29, 13, 13, Color("#6e697e"))
			_line(canvas, 20, 39, 13, 58, Color("#959095"), 5)
			_line(canvas, 59, 39, 65, 58, Color("#777084"), 5)
			_line(canvas, 66, 64, 69, 20, Color("#bbc1c0"), 3)
			_line(canvas, 60, 59, 74, 60, GOLD_DARK, 3)
			_rect(canvas, 5, 58, 15, 19, GOLD_DARK)
			_rect(canvas, 7, 60, 11, 15, Color("#243447"))
			_rect(canvas, 34, 50, 12, 3, GOLD_DARK)
		"rootheart":
			for side: int in [-1, 1]:
				_line(canvas, 40, 77, 40 + side * 25, 86, Color("#443246"), 9)
				_line(canvas, 40 + side * 25, 86, 40 + side * 36, 91, Color("#685066"), 5)
				_line(canvas, 39, 29, 40 + side * 24, 16, Color("#443246"), 7)
				_line(canvas, 40 + side * 24, 16, 40 + side * 31, 3, Color("#685066"), 4)
				_line(canvas, 40 + side * 23, 16, 40 + side * 37, 21, Color("#685066"), 3)
			_trap(canvas, 31, 20, 16, 21, 39, 69, OUTLINE)
			_trap(canvas, 32, 18, 17, 23, 35, 66, Color("#4d385b"))
			_rect(canvas, 28, 39, 4, 40, Color("#82617b"))
			_rect(canvas, 49, 28, 4, 44, Color("#2f2c43"))
			_line(canvas, 36, 22, 31, 38, Color("#2f2c43"), 3)
			_line(canvas, 31, 38, 35, 51, Color("#2f2c43"), 3)
			_diamond(canvas, 41, 52, 14, 19, Color("#1b2434"))
			_diamond(canvas, 41, 52, 10, 15, Color("#bb7547"))
			_diamond(canvas, 40, 51, 7, 12, GOLD)
			_diamond(canvas, 39, 50, 4, 8, GOLD_LIGHT)
			_line(canvas, 30, 72, 17, 77, Color("#a28790"), 2)
			_line(canvas, 48, 74, 62, 81, Color("#a28790"), 2)
	if pose == 1:
		_px(canvas, 40, 31, GOLD_LIGHT)
		_px(canvas, 34, 43, GOLD_LIGHT)
	_rect(canvas, 0, 92, 80, 4, Color.TRANSPARENT)
	return _finish(key, canvas)


static func prop(kind: String, frame: int = 0) -> Texture2D:
	var item: String = kind.to_lower()
	match item:
		"rune": return rune()
		"potion", "heal": return potion()
		"crystal", "shard": return crystal()
		"campfire", "fire", "camp": return campfire(frame)
		"grass": return grass()
		"flower": return flower()
	var key: String = "prop_%s_%d" % [item, posmod(frame, 2)]
	if _cache.has(key):
		return _cache[key] as Texture2D
	var canvas: Image = _canvas(32, 40)
	match item:
		"lamp", "lantern":
			_rect(canvas, 15, 6, 3, 30, OUTLINE)
			_rect(canvas, 15, 7, 1, 28, Color("#8e744c"))
			_rect(canvas, 12, 33, 9, 3, Color("#526660"))
			_line(canvas, 16, 6, 24, 6, GOLD_DARK, 2)
			_draw_small_lantern(canvas, 20, 10, frame % 2 == 0)
		"chest":
			_rect(canvas, 4, 19, 25, 17, OUTLINE)
			_rect(canvas, 5, 20, 23, 15, Color("#795641"))
			_rect(canvas, 5, 20, 23, 6, Color("#ab8151"))
			_rect(canvas, 6, 22, 21, 2, Color("#c79a60"))
			_rect(canvas, 5, 27, 23, 2, Color("#4f4239"))
			_rect(canvas, 8, 20, 2, 15, GOLD_DARK)
			_rect(canvas, 24, 20, 2, 15, GOLD_DARK)
			_rect(canvas, 15, 26, 5, 5, GOLD)
			_rect(canvas, 17, 28, 1, 2, OUTLINE)
			if frame % 2 == 1:
				_rect(canvas, 6, 25, 21, 5, Color("#213545"))
				_px(canvas, 15, 27, GOLD_LIGHT)
		"note", "record", "side":
			_rect(canvas, 8, 9, 16, 26, OUTLINE)
			_rect(canvas, 9, 10, 14, 24, Color("#c8b391"))
			_rect(canvas, 10, 10, 12, 22, Color("#f0dfb9"))
			_rect(canvas, 10, 11, 11, 2, Color("#fff0ce"))
			for row: int in [17, 21, 25]:
				_rect(canvas, 12, row, 8, 1, Color("#9e8c75"))
			_diamond(canvas, 16, 29, 2, 2, Color("#b97851"))
		"lens", "mirror":
			_ellipse(canvas, 16, 18, 10, 11, GOLD_DARK)
			_ellipse(canvas, 16, 18, 8, 9, Color("#6bafb1"))
			_ellipse(canvas, 16, 18, 6, 7, Color("#a4dad1"))
			_line(canvas, 12, 20, 19, 12, Color("#edffe2"), 2)
			_rect(canvas, 14, 29, 5, 7, GOLD_DARK)
			_rect(canvas, 15, 29, 2, 6, GOLD)
		"shield":
			_trap(canvas, 6, 22, 8, 13, 8, 27, GOLD_DARK)
			_trap(canvas, 7, 20, 9, 14, 6, 24, Color("#4f7082"))
			_trap(canvas, 9, 16, 11, 15, 4, 20, Color("#789da5"))
			_line(canvas, 17, 11, 17, 29, GOLD)
			_line(canvas, 11, 19, 23, 19, GOLD)
			_diamond(canvas, 17, 19, 3, 4, GOLD_LIGHT)
		"anchor", "node", "altar":
			_stone_block(canvas, 4, 29, 25, 7, Color("#526b77"))
			_stone_block(canvas, 10, 18, 14, 15, Color("#6a8286"))
			_diamond(canvas, 17, 16, 7, 11, GOLD_DARK)
			_diamond(canvas, 17, 15, 5, 8, GOLD)
			_diamond(canvas, 16, 14, 2, 4, GOLD_LIGHT)
		"door", "gate":
			_stone_block(canvas, 2, 3, 7, 33, Color("#576c75"))
			_stone_block(canvas, 24, 3, 7, 33, Color("#576c75"))
			_stone_block(canvas, 7, 3, 18, 7, Color("#6a8286"))
			_rect(canvas, 10, 11, 13, 25, Color("#293d49"))
			_rect(canvas, 16, 12, 1, 22, GOLD_DARK)
		"bell":
			_ellipse(canvas, 16, 16, 8, 10, GOLD_DARK)
			_trap(canvas, 10, 13, 14, 6, 22, 15, GOLD)
			_rect(canvas, 7, 27, 21, 3, GOLD_LIGHT)
			_rect(canvas, 14, 29, 5, 6, GOLD_DARK)
		_:
			_diamond(canvas, 16, 21, 7, 13, TEAL_DARK)
			_diamond(canvas, 16, 20, 5, 10, TEAL_LIGHT)
			_px(canvas, 16, 13, GOLD_LIGHT)
	return _finish(key, canvas)


static func portrait(key: String, emotion: String = "neutral") -> Texture2D:
	var person: String = "lynn" if key.to_lower() in ["lynn", "hero", "林恩"] else _npc_key(key)
	var mood: String = emotion if emotion in ["neutral", "worried", "determined", "relieved"] else "neutral"
	var cache_key: String = "portrait_%s_%s" % [person, mood]
	if _cache.has(cache_key):
		return _cache[cache_key] as Texture2D
	var canvas: Image = _canvas(128, 128)
	_draw_portrait(canvas, person, mood)
	return _finish(cache_key, canvas)


static func slash() -> Texture2D:
	return sword_slash()


static func _npc_key(key: String) -> String:
	match key.to_lower():
		"cen", "cen_deng", "mentor", "keeper", "岑灯": return "cen"
		"xiaohe", "xiao_he", "child", "小禾": return "xiaohe"
		_: return "afu"


static func _enemy_key(key: String) -> String:
	match key.to_lower():
		"firefly", "lamp_moth", "灯噬萤": return "firefly"
		"shade", "mist_beast", "雾影兽": return "shade"
		"vine", "vine_root", "蔓缚株": return "vine"
		"woodguard", "wood_guard", "木壳卫": return "woodguard"
		"spider", "marsh_spider", "泽行蛛": return "spider"
		"drowned", "drowned_shadow", "溺影": return "drowned"
		"sentinel", "ruin_sentinel", "遗迹哨兵": return "sentinel"
		"statue", "cracked_statue", "裂纹石像": return "statue"
		"patrol", "hollow_patrol", "空灯巡卒": return "patrol"
		"rootslinger", "dusk_archer", "暮根射手": return "rootslinger"
		_: return "shade"


static func _boss_key(key: String) -> String:
	match key.to_lower():
		"guardian", "gate_guardian", "归灯守卫": return "guardian"
		"hunter", "mist_hunter", "雾泽巡猎者": return "hunter"
		"colossus", "rune_colossus", "铭文守像": return "colossus"
		"nightwatch", "night_warden", "巡夜者": return "nightwatch"
		"rootheart", "root_heart", "暮根之心": return "rootheart"
		_: return "guardian"


static func _draw_portrait(canvas: Image, person: String, mood: String) -> void:
	var elder: bool = person == "cen"
	var merchant: bool = person == "afu"
	var child: bool = person == "xiaohe"
	var hair_dark: Color = Color("#aaa99c") if elder else Color("#d1bfa5")
	var hair_mid: Color = Color("#dedcca") if elder else Color("#eadbc0")
	var hair_light: Color = Color("#f9f0d7")
	if merchant:
		hair_dark = Color("#573b37")
		hair_mid = Color("#965b42")
		hair_light = Color("#c68c5c")
	elif child:
		hair_dark = Color("#58483c")
		hair_mid = Color("#947451")
		hair_light = Color("#bea16c")
	# Shoulders and collar are composed at this resolution, not rescaled sprites.
	var cloth_dark: Color = TEAL_DARK
	var cloth_mid: Color = TEAL
	var cloth_light: Color = TEAL_LIGHT
	if elder:
		cloth_dark = Color("#182d3b")
		cloth_mid = Color("#304956")
		cloth_light = Color("#596e70")
	elif merchant:
		cloth_dark = Color("#67493c")
		cloth_mid = Color("#ab7350")
		cloth_light = Color("#d1a071")
	elif child:
		cloth_dark = Color("#677e80")
		cloth_mid = Color("#b1bfa7")
		cloth_light = Color("#e2dfbe")
	_trap(canvas, 39, 49, 88, 8, 112, 40, OUTLINE)
	_trap(canvas, 41, 45, 89, 11, 106, 38, cloth_mid)
	_trap(canvas, 45, 36, 93, 25, 80, 34, cloth_dark)
	_rect(canvas, 48, 84, 32, 23, Color("#bf8e6f"))
	_rect(canvas, 52, 86, 22, 18, Color("#edc59e"))
	_trap(canvas, 52, 24, 100, 40, 49, 28, Color("#c8b898"))
	_trap(canvas, 54, 20, 100, 45, 38, 28, Color("#f4e6c7"))
	_trap(canvas, 43, 21, 94, 12, 52, 28, cloth_mid)
	_trap(canvas, 65, 19, 95, 81, 34, 27, cloth_dark)
	_line(canvas, 17, 116, 53, 107, cloth_light, 2)
	_line(canvas, 53, 107, 64, 106, GOLD, 2)
	_line(canvas, 74, 107, 105, 120, GOLD_DARK, 2)
	_ellipse(canvas, 64, 107, 6, 5, GOLD_DARK)
	_ellipse(canvas, 64, 106, 4, 3, GOLD)
	_px(canvas, 63, 105, GOLD_LIGHT)
	# Broad hair masses surround a warm, shaped face.
	_ellipse(canvas, 65, 49, 39, 43, OUTLINE)
	_ellipse(canvas, 65, 48, 37, 41, hair_dark)
	_ellipse(canvas, 64, 48, 35, 39, hair_mid)
	_ellipse(canvas, 64, 61, 27, 32, Color("#ba886c"))
	_ellipse(canvas, 65, 59, 25, 31, Color("#e9b88f"))
	_ellipse(canvas, 66, 55, 22, 27, Color("#f5cfaa"))
	_rect(canvas, 49, 81, 29, 6, Color("#dfaa83"))
	_ellipse(canvas, 38, 64, 6, 9, Color("#c38f71"))
	_ellipse(canvas, 39, 63, 4, 7, Color("#f1c7a0"))
	_line(canvas, 38, 60, 40, 67, Color("#a87561"))
	# Hand-placed short locks break the ellipse silhouette in a controlled way.
	_trap(canvas, 38, 13, 26, 28, 14, 48, hair_dark)
	_trap(canvas, 41, 10, 23, 34, 10, 42, hair_mid)
	_trap(canvas, 46, 17, 20, 38, 12, 34, hair_light)
	_trap(canvas, 59, 17, 17, 51, 10, 31, hair_mid)
	_trap(canvas, 61, 10, 18, 59, 6, 26, hair_light)
	_trap(canvas, 72, 17, 20, 82, 9, 31, hair_mid)
	_trap(canvas, 80, 10, 26, 93, 10, 42, hair_dark)
	_trap(canvas, 78, 9, 23, 87, 8, 32, hair_light)
	_rect(canvas, 30, 63, 7, 21, hair_dark)
	_rect(canvas, 32, 59, 6, 21, hair_mid)
	_rect(canvas, 91, 60, 8, 24, hair_dark)
	_rect(canvas, 90, 56, 6, 21, hair_mid)
	_rect(canvas, 35, 79, 8, 9, hair_dark)
	_rect(canvas, 88, 78, 8, 10, hair_dark)
	_rect(canvas, 39, 11, 14, 5, hair_mid)
	_rect(canvas, 48, 8, 24, 5, hair_mid)
	_rect(canvas, 53, 9, 17, 3, hair_light)
	_line(canvas, 49, 24, 44, 35, hair_light, 2)
	_line(canvas, 75, 28, 82, 36, hair_light, 2)
	# Eyes use restrained dark lashes, amber irises, and one-pixel reflections.
	var brow_y: int = 50 if mood != "worried" else 48
	_line(canvas, 46, brow_y, 57, brow_y - (2 if mood == "determined" else 0), hair_dark, 2)
	_line(canvas, 72, brow_y - (2 if mood == "worried" else 0), 82, brow_y, hair_dark, 2)
	_rect(canvas, 46, 56, 13, 8, Color("#654a43"))
	_rect(canvas, 71, 56, 13, 8, Color("#654a43"))
	_rect(canvas, 47, 58, 11, 6, Color("#fff0cf"))
	_rect(canvas, 72, 58, 11, 6, Color("#fff0cf"))
	_rect(canvas, 52, 57, 5, 8, Color("#9f713b"))
	_rect(canvas, 74, 57, 5, 8, Color("#9f713b"))
	_rect(canvas, 54, 58, 2, 5, OUTLINE)
	_rect(canvas, 75, 58, 2, 5, OUTLINE)
	_rect(canvas, 52, 58, 2, 2, Color("#fff9df"))
	_rect(canvas, 74, 58, 2, 2, Color("#fff9df"))
	_rect(canvas, 54, 64, 3, 1, GOLD)
	_rect(canvas, 76, 64, 3, 1, GOLD)
	_line(canvas, 63, 62, 61, 70, Color("#cb987a"))
	_rect(canvas, 62, 70, 4, 2, Color("#e0a888"))
	_rect(canvas, 45, 69, 9, 2, Color("#eab290"))
	_rect(canvas, 76, 69, 8, 2, Color("#eab290"))
	var mouth_y: int = 78 if mood != "worried" else 80
	_rect(canvas, 60, mouth_y, 8, 1, Color("#a76a58"))
	if mood == "relieved" or merchant:
		_px(canvas, 59, mouth_y - 1, Color("#a76a58"))
		_px(canvas, 68, mouth_y - 1, Color("#a76a58"))
	if elder:
		_rect(canvas, 47, 75, 35, 10, hair_dark)
		_trap(canvas, 48, 33, 80, 59, 13, 27, hair_mid)
		_trap(canvas, 48, 9, 77, 57, 6, 22, hair_light)
		_rect(canvas, 58, 76, 13, 2, Color("#7c7c71"))
		_line(canvas, 72, 80, 67, 99, hair_dark, 2)
		_line(canvas, 44, 66, 50, 68, Color("#bc9077"))
		_line(canvas, 80, 66, 85, 64, Color("#bc9077"))
	elif merchant:
		_ellipse(canvas, 94, 83, 8, 10, hair_dark)
		_rect(canvas, 89, 44, 5, 3, GOLD)
		_px(canvas, 90, 43, GOLD_LIGHT)
	elif child:
		_rect(canvas, 51, 52, 7, 2, hair_mid)
		_rect(canvas, 72, 52, 7, 2, hair_mid)


static func _trap(canvas: Image, top_x: int, top_width: int, y: int, bottom_x: int, bottom_width: int, height: int, color: Color) -> void:
	for row: int in range(height):
		var ratio: float = float(row) / float(maxi(1, height - 1))
		var x: int = roundi(lerpf(float(top_x), float(bottom_x), ratio))
		var width: int = roundi(lerpf(float(top_width), float(bottom_width), ratio))
		_rect(canvas, x, y + row, width, 1, color)


static func _stone_block(canvas: Image, x: int, y: int, width: int, height: int, color: Color) -> void:
	_rect(canvas, x, y, width, height, OUTLINE)
	_rect(canvas, x + 1, y + 1, width - 2, height - 2, color)
	_rect(canvas, x + 2, y + 1, width - 4, 2, Color("#527c71"))
	_rect(canvas, x + 1, y + 3, 2, height - 5, Color("#668b7b"))
	_rect(canvas, x + width - 3, y + 3, 2, height - 4, Color("#1e4249"))
	_rect(canvas, x + 3, y + height - 3, width - 6, 2, Color("#1b3b43"))


static func _canvas(width: int, height: int) -> Image:
	var canvas: Image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	canvas.fill(Color.TRANSPARENT)
	return canvas


static func _finish(key: String, canvas: Image) -> Texture2D:
	var texture: ImageTexture = ImageTexture.create_from_image(canvas)
	_cache[key] = texture
	return texture


static func _px(canvas: Image, x: int, y: int, color: Color) -> void:
	if x >= 0 and y >= 0 and x < canvas.get_width() and y < canvas.get_height():
		canvas.set_pixel(x, y, color)


static func _rect(canvas: Image, x: int, y: int, width: int, height: int, color: Color) -> void:
	var bounds: Rect2i = Rect2i(x, y, width, height).intersection(
		Rect2i(0, 0, canvas.get_width(), canvas.get_height())
	)
	if bounds.has_area():
		canvas.fill_rect(bounds, color)


static func _ellipse(canvas: Image, cx: int, cy: int, rx: int, ry: int, color: Color) -> void:
	for y: int in range(cy - ry, cy + ry + 1):
		for x: int in range(cx - rx, cx + rx + 1):
			var dx: float = float(x - cx) / float(rx)
			var dy: float = float(y - cy) / float(ry)
			if dx * dx + dy * dy <= 1.0:
				_px(canvas, x, y, color)


static func _triangle(canvas: Image, cx: int, top: int, half_width: int, height: int, color: Color) -> void:
	for row: int in range(height):
		var spread: int = int(float(half_width) * float(row) / float(maxi(1, height - 1)))
		_rect(canvas, cx - spread, top + row, spread * 2 + 1, 1, color)


static func _diamond(canvas: Image, cx: int, cy: int, rx: int, ry: int, color: Color) -> void:
	for y: int in range(cy - ry, cy + ry + 1):
		for x: int in range(cx - rx, cx + rx + 1):
			var dx: float = absf(float(x - cx)) / float(rx)
			var dy: float = absf(float(y - cy)) / float(ry)
			if dx + dy <= 1.0:
				_px(canvas, x, y, color)


static func _line(canvas: Image, x0: int, y0: int, x1: int, y1: int, color: Color, width: int = 1) -> void:
	var x: int = x0
	var y: int = y0
	var dx: int = absi(x1 - x0)
	var dy: int = -absi(y1 - y0)
	var sx: int = 1 if x0 < x1 else -1
	var sy: int = 1 if y0 < y1 else -1
	var error: int = dx + dy
	while true:
		_rect(canvas, x, y, width, width, color)
		if x == x1 and y == y1:
			break
		var doubled: int = 2 * error
		if doubled >= dy:
			error += dy
			x += sx
		if doubled <= dx:
			error += dx
			y += sy
