extends SceneTree
## Exercise every authored stage and prove ordinary synchronization keeps it.

const Model = preload("res://scripts/campaign_model.gd")
const Data = preload("res://scripts/campaign_data.gd")
const WorldView = preload("res://scripts/world_view.gd")
var _failures: int = 0


func _initialize() -> void:
	call_deferred("_run")


func _check(condition: bool, message: String) -> void:
	if not condition:
		_failures += 1
		printerr(message)


func _run() -> void:
	var model: Variant = Model.new()
	model.begin()
	var view: Node3D = WorldView.new()
	root.add_child(view)
	view.build(model)
	for map_id: int in range(Data.map_count()):
		model._enter_map(map_id)
		view.sync(model, 0.0)
		var stage: Node = view.get_node_or_null("Stage_" + str(map_id))
		_check(stage != null, "Missing stage for M%02d" % map_id)
		var stage_id: int = stage.get_instance_id() if stage != null else 0
		var actor_count: int = view.get_node("Actors").get_child_count()
		for frame: int in range(4):
			view.sync(model, 1.0 / 60.0)
		_check(view.get_node("Stage_" + str(map_id)).get_instance_id() == stage_id, "Ordinary sync rebuilt M%02d" % map_id)
		_check(view.get_node("Actors").get_child_count() == actor_count, "Ordinary sync changed actor count")
		_check(view.player_sprite.position.distance_to(Vector3(model.player_position.x, 0.04, model.player_position.y)) < 0.001, "Hero foot is not at model position")
		_check(view.camera.projection == Camera3D.PROJECTION_ORTHOGONAL, "Stage camera lost its orthographic projection")
		for enemy: Dictionary in model.enemies:
			enemy.phase = "telegraph"
			enemy.attack_target = model.player_position
		view.sync(model, 1.0 / 60.0)
		for enemy: Dictionary in model.enemies:
			enemy.phase = "attack"
		view.sync(model, 1.0 / 60.0)
		if not model.boss.is_empty():
			for pattern: String in ["ring", "charge", "thrust", "fan", "sword", "rune"]:
				model.boss.state = "telegraph"
				model.boss.pattern = pattern
				model.boss.attack_target = model.player_position
				model.boss.charge_distance = 5.0
				view.sync(model, 1.0 / 60.0)
			for puzzle: Dictionary in model.boss.puzzle_nodes:
				puzzle.active = true
				puzzle.completed = false
			view.sync(model, 1.0 / 60.0)
		model.projectiles.append({"position": model.player_position + Vector2(1.0, 0.0), "direction": Vector2.RIGHT, "radius": 0.18})
		model.hazards.append({"position": model.player_position + Vector2(2.0, 0.0), "radius": 1.3, "remaining": 3.0})
		view.sync(model, 1.0 / 60.0)
		var effect_count: int = view.get_node("Effects").get_child_count()
		view.sync(model, 1.0 / 60.0)
		_check(view.get_node("Effects").get_child_count() == effect_count, "Effect synchronization allocated new geometry")
		model.projectiles.clear()
		model.hazards.clear()
		view.sync(model, 1.0 / 60.0)
		model.attack_for = 0.15
		model.pulse_for = 0.15
		model.shield_for = 0.5
		model.lantern_for = 1.0
		view.sync(model, 1.0 / 60.0)
		view.apply_settings({"quality": "low"})
		view.apply_settings({"quality": "standard"})
		if "--capture" in OS.get_cmdline_user_args() and map_id in [0, 1, 6, 14] and DisplayServer.get_name() != "headless":
			var info: Dictionary = model.map_info()
			model.player_position = info["bounds"].get_center()
			model.attack_for = 0.0
			model.pulse_for = 0.0
			model.shield_for = 0.0
			view.sync(model, 0.0)
			await process_frame
			await RenderingServer.frame_post_draw
			var screenshot: Image = root.get_texture().get_image()
			_check(screenshot.save_png("res://builds/world-M%02d.png" % map_id) == OK, "Could not save world screenshot")
		await process_frame
	model.flags["ending"] = true
	view.sync(model, 0.0)
	view.queue_free()
	model = null
	await process_frame
	print("World stages: 15 maps, retained geometry, actors, abilities and attack previews checked; failures=", _failures)
	quit(1 if _failures > 0 else 0)
