extends Control
## A compact overview of the current location, grounded in campaign coordinates.

const PADDING := 9.0
const BACKGROUND := Color(0.025, 0.085, 0.095, 0.82)
const BORDER := Color(0.67, 0.58, 0.35, 0.6)
const PLAYER_COLOR := Color("fff1cf")
var model: RefCounted
var bounds := Rect2(-18, -14, 36, 28)


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(180, 110)
	clip_contents = true


func refresh(new_model: RefCounted) -> void:
	model = new_model
	if model != null and model.has_method("map_info"):
		var info: Dictionary = model.call("map_info")
		var value: Variant = info.get("bounds")
		if value is Rect2 and value.size.x > 0.0 and value.size.y > 0.0:
			bounds = value
	queue_redraw()


func _draw() -> void:
	if size.x <= PADDING * 2 or size.y <= PADDING * 2:
		return
	draw_rect(Rect2(Vector2.ONE, size - Vector2(2, 2)), BACKGROUND)
	draw_rect(Rect2(Vector2.ONE, size - Vector2(2, 2)), BORDER, false, 1.0)
	if model == null:
		return
	var info: Dictionary = model.call("map_info")
	for tree: Variant in info.get("trees", []):
		if tree is Vector2:
			draw_circle(_point(tree), 1.2, Color(0.18, 0.34, 0.29, 0.72))
	var objects: Array = model.get("objects")
	for object: Dictionary in objects:
		var object_position: Variant = object.get("position")
		if not object_position is Vector2:
			continue
		var kind := str(object.get("type", ""))
		if kind == "npc":
			draw_circle(_point(object_position), 2.4, Color("70b7ac"))
		elif kind != "camp" and not bool(object.get("completed", false)):
			_diamond(_point(object_position), 1.8, Color("cfbf7a"))
	var camp: Variant = info.get("camp")
	if camp is Vector2:
		_diamond(_point(camp), 3.0, Color("dfa64e"))
	var exit_position: Variant = info.get("exit")
	if exit_position is Vector2:
		draw_arc(_point(exit_position), 4.0, 0, TAU, 16, Color("a1d5b9"), 1.0)
	var boss: Dictionary = model.get("boss")
	if not boss.is_empty() and int(boss.get("health", 0)) > 0:
		var position_value: Variant = boss.get("position")
		if position_value is Vector2:
			draw_circle(_point(position_value), 3.4, Color("dc8871"))
	var center := _point(model.get("player_position"))
	var direction: Vector2 = model.get("last_direction")
	if not direction.is_finite() or direction.length_squared() < 0.000001:
		direction = Vector2.UP
	direction = (direction / bounds.size).normalized()
	var side := Vector2(-direction.y, direction.x)
	var arrow := PackedVector2Array([center + direction * 5, center - direction * 3 + side * 3, center - direction, center - direction * 3 - side * 3])
	draw_circle(center, 6, Color(0.76, 0.9, 0.73, 0.18))
	draw_colored_polygon(arrow, PLAYER_COLOR)


func _point(position_value: Vector2) -> Vector2:
	var relative := ((position_value - bounds.position) / bounds.size).clamp(Vector2.ZERO, Vector2.ONE)
	return Vector2(PADDING, PADDING) + relative * (size - Vector2(PADDING * 2, PADDING * 2))


func _diamond(center: Vector2, radius: float, color: Color) -> void:
	draw_colored_polygon(PackedVector2Array([center + Vector2(0, -radius), center + Vector2(radius, 0), center + Vector2(0, radius), center + Vector2(-radius, 0)]), color)
