extends SceneTree
## Captures real GL-rendered scenes; this is not generated concept art.
func _initialize() -> void:
	call_deferred("_capture")

func _capture() -> void:
	if DisplayServer.get_name() == "headless":
		printerr("Capture requires a graphical display.")
		quit(1)
		return
	var packed := load("res://scenes/main.tscn") as PackedScene
	if packed == null:
		quit(1)
		return
	var game = packed.instantiate()
	game.save_root = "/tmp/lumenfall-capture-%d" % OS.get_process_id()
	root.add_child(game)
	await process_frame
	game.set_physics_process(false)
	var args := OS.get_cmdline_user_args()
	var map_id := 1
	for arg in args:
		if arg.begins_with("--map="):
			map_id = clampi(int(arg.trim_prefix("--map=")), 0, 14)
	var playing := "--playing" in args
	if playing:
		game.model.begin()
		game.model._enter_map(map_id)
		game.model.status = "playing"
		game.model.player_position = Vector2(-5.0, 4.0) if map_id > 0 else Vector2(-8.0, 5.0)
		if "--spawn" in args:
			game.model.player_position = game.model.map_info().spawn
		if not game.model.can_stand(game.model.player_position):
			game.model.player_position = game.model.map_info().camp
		game._rebuild_world()
		game.ui.refresh(game.model, 0.0)
	for index in range(20):
		game._refresh(0.1)
		await process_frame
	if playing:
		# Let the ordinary chapter banner finish so scenery remains visible.
		game.ui.refresh(game.model, 5.0)
		await process_frame
	await RenderingServer.frame_post_draw
	var screenshot := root.get_texture().get_image()
	var output := "res://builds/gameplay.png" if playing else "res://builds/title.png"
	for arg in args:
		if arg.begins_with("--output="):
			output = arg.trim_prefix("--output=")
	var result := screenshot.save_png(output)
	if result != OK:
		printerr("Screenshot write failed: ", result)
		quit(1)
		return
	print("Rendered ", screenshot.get_width(), "x", screenshot.get_height(), " to ", output)
	game.queue_free()
	game = null
	await process_frame
	await process_frame
	await create_timer(0.3).timeout
	quit(0)
