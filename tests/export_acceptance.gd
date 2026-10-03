extends SceneTree
## Run externally using Godot and the actual release PCK, outside the repo.
## Only references release resources; no editor, other tests or source checkout.
var checks := 0
var failures := 0
var game
var sandbox := ""

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ", label)

func _run() -> void:
	_check(str(ProjectSettings.get_setting("application/config/version", "")) == "0.3.0-dev", "Expected exported project version")
	var scene := load("res://scenes/main.tscn") as PackedScene
	_check(scene != null, "Release contains its main scene")
	if scene == null:
		quit(1)
		return
	game = scene.instantiate()
	sandbox = "/tmp/lumenfall-export-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]
	game.save_root = sandbox
	root.add_child(game)
	await process_frame
	game.set_physics_process(false)
	_check(game.model.status == "ready" and game.ui.menu == "title", "Packaged title and controller are connected")
	_check(game.world.camera.projection == Camera3D.PROJECTION_ORTHOGONAL and game.player_sprite.texture != null, "Packaged 3D view and pixel hero load")
	_check(game.audio._music.size() == 9 and game.audio._effects.size() == 8, "All packaged music and sound resources load")
	var font: Font = game.ui.root.theme.default_font
	_check(font != null and font.has_char("暮".unicode_at(0)) and font.has_char("灯".unicode_at(0)), "Packaged Chinese font loads")
	game.request_action("new", {"slot": 0, "difficulty": "story"})
	_check(game.model.status == "dialogue" and game.model.map_id == 0, "Packaged new journey starts the actual introduction")
	var guard := 0
	while game.model.status == "dialogue" and guard < 1000:
		game.ui.handle_action("confirm")
		game._refresh(0.0)
		guard += 1
	_check(game.model.status == "playing" and game.ui.hud.visible, "Introduction returns to live adventure")
	var before: Vector2 = game.model.player_position
	game.model.update(Vector2.RIGHT, 0.1)
	game._refresh(0.1)
	_check(game.model.player_position.distance_to(before) > 0.1 and Vector2(game.player_sprite.position.x, game.player_sprite.position.z).is_equal_approx(game.model.player_position), "Packaged movement drives the visible hero")
	game.ui.handle_action("pause")
	before = game.model.player_position
	game.model.update(Vector2.RIGHT, 0.1)
	_check(game.model.status == "paused" and game.model.player_position == before, "Packaged pause freezes gameplay")
	game.model.coins = 73
	game.request_action("save")
	_check(FileAccess.file_exists(sandbox.path_join("slot_1.json")), "Packaged game writes a real save")
	game.model.coins = 0
	game.request_action("continue", 0)
	_check(game.model.status == "playing" and game.model.coins == 73, "Packaged game reloads persistent progress")
	game.ui.handle_action("journal")
	_check(game.ui.menu == "journal" and game.model.quest_log().size() == 9, "Packaged journal contains the main objective and eight side quests")
	game.ui.handle_action("journal")
	_check(game.ui.menu.is_empty() and game.model.status == "playing", "Packaged journal resumes exploration")
	for store in game.stores:
		store.clear_checkpoint()
	DirAccess.remove_absolute(sandbox)
	game.queue_free()
	game = null
	await process_frame
	await create_timer(0.3).timeout
	print("ExportAcceptance: ", checks - failures, "/", checks, " checks passed")
	quit(1 if failures else 0)
