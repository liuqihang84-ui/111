extends RefCounted
## Lynn 0.3.1 visual layer. Gameplay and the original 32x48 art API stay intact.
## Sheets are original native 64x96 pixel drawings, not enlarged old textures.

const FOOT_ANCHOR: Vector2 = Vector2(32.0, 88.0)
const PIXEL_SIZE: float = 0.017
const FRAME_SIZE: Vector2i = Vector2i(64, 96)
const ROOT: String = "res://assets/art/characters/lynn_hd/"
const COUNTS: Dictionary = {"idle": 4, "walk": 6, "attack": 6, "dash": 4, "pulse": 6, "hit": 3, "death": 6, "interact": 4}
static var _sheets: Dictionary = {}
static var _frames: Dictionary = {}


static func frame(direction: String = "south", index: int = 0, action: String = "idle") -> Texture2D:
	var facing: String = direction if direction in ["south", "north", "east", "west"] else "south"
	var motion: String = action if COUNTS.has(action) else "idle"
	var pose: int = posmod(index, int(COUNTS[motion]))
	var sheet_key: String = motion + "_" + facing
	var key: String = sheet_key + "_" + str(pose)
	if _frames.has(key):
		return _frames[key] as Texture2D
	if not _sheets.has(sheet_key):
		var path: String = ROOT + "lynn_" + sheet_key + "_sheet.png"
		var sheet: Texture2D = load(path) as Texture2D
		if sheet == null:
			push_error("HeroVisual missing sheet: " + path)
			return null
		_sheets[sheet_key] = sheet
	var texture: AtlasTexture = AtlasTexture.new()
	texture.atlas = _sheets[sheet_key] as Texture2D
	texture.region = Rect2(pose * FRAME_SIZE.x, 0, FRAME_SIZE.x, FRAME_SIZE.y)
	texture.filter_clip = true
	_frames[key] = texture
	return texture
