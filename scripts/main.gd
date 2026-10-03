extends Node3D
## Integrates the campaign, world, UI, audio, save slots and player controls.
const Campaign = preload("res://scripts/campaign_model.gd")
const WorldView = preload("res://scripts/world_view.gd")
const GameUI = preload("res://scripts/game_ui.gd")
const GameAudio = preload("res://scripts/game_audio.gd")
const Store = preload("res://scripts/progress_store.gd")
const DEFAULT_KEYS := {
	"move_left": KEY_A, "move_right": KEY_D, "move_up": KEY_W, "move_down": KEY_S,
	"attack": KEY_J, "dash": KEY_SPACE, "pulse": KEY_Q, "lantern": KEY_L,
	"shield": KEY_F, "interact": KEY_E, "potion": KEY_H,
	"journal": KEY_TAB, "map": KEY_M, "inventory": KEY_I,
}
var model = Campaign.new()
var world
var ui
var audio
var player_sprite: Sprite3D
var camera: Camera3D
var selected_slot := 0
var save_root := "user://"
var saves: Array[Dictionary] = []
var stores: Array = []
var settings: Dictionary = {"volume": 0.65, "text_scale": 1.0, "quality": "standard", "difficulty": "standard", "bindings": {}}
var muted := false
var save_notice := ""
var _last_map_revision := -1
var _autosave_timer := 0.0
var _touch_origin := Vector2.ZERO
var _touch_input := Vector2.ZERO
var _active_touch := -1
var _closing := false

func _ready() -> void:
	get_tree().auto_accept_quit = false
	_load_settings()
	_bind_inputs()
	for slot in range(3):
		var store = Store.new()
		store.path = save_root.path_join("slot_%d.json" % (slot + 1))
		stores.append(store)
	_refresh_saves()
	world = WorldView.new()
	world.name = "AdventureWorld"
	add_child(world)
	world.build(model)
	player_sprite = world.player_sprite
	camera = world.camera
	audio = GameAudio.new()
	add_child(audio)
	audio.setup()
	audio.set_volume(float(settings.volume))
	ui = GameUI.new()
	add_child(ui)
	ui.setup(model, self)
	ui.action_requested.connect(request_action)
	_last_map_revision = int(model.map_revision)
	_apply_quality()
	_refresh(0.0)

func _bind_inputs() -> void:
	var arrows := {"move_left": KEY_LEFT, "move_right": KEY_RIGHT, "move_up": KEY_UP, "move_down": KEY_DOWN}
	for action in DEFAULT_KEYS:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.2)
		InputMap.action_erase_events(action)
		var bindings: Dictionary = settings.get("bindings", {})
		_add_key(action, int(bindings.get(action, DEFAULT_KEYS[action])))
		if arrows.has(action):
			_add_key(action, int(arrows[action]))
	for pair in [["pause", KEY_ESCAPE], ["confirm", KEY_ENTER]]:
		if not InputMap.has_action(pair[0]):
			InputMap.add_action(pair[0])
		InputMap.action_erase_events(pair[0])
		_add_key(pair[0], pair[1])
	var mouse := InputEventMouseButton.new()
	mouse.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("attack", mouse)
	var buttons := {"interact": JOY_BUTTON_A, "dash": JOY_BUTTON_B, "attack": JOY_BUTTON_X, "pulse": JOY_BUTTON_Y, "lantern": JOY_BUTTON_LEFT_SHOULDER, "shield": JOY_BUTTON_RIGHT_SHOULDER, "pause": JOY_BUTTON_START, "map": JOY_BUTTON_BACK, "potion": JOY_BUTTON_DPAD_UP, "inventory": JOY_BUTTON_DPAD_RIGHT, "journal": JOY_BUTTON_DPAD_LEFT}
	for action in buttons:
		var event := InputEventJoypadButton.new()
		event.button_index = buttons[action]
		InputMap.action_add_event(action, event)
	for pair in [["move_left", JOY_AXIS_LEFT_X, -1.0], ["move_right", JOY_AXIS_LEFT_X, 1.0], ["move_up", JOY_AXIS_LEFT_Y, -1.0], ["move_down", JOY_AXIS_LEFT_Y, 1.0]]:
		var event := InputEventJoypadMotion.new()
		event.axis = pair[1]
		event.axis_value = pair[2]
		InputMap.action_add_event(pair[0], event)

func _add_key(action: String, key: int) -> void:
	var event := InputEventKey.new()
	event.physical_keycode = key
	InputMap.action_add_event(action, event)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.echo:
		return
	if model.status != "playing" or not str(ui.menu).is_empty():
		if event.is_action_pressed("ui_cancel"):
			ui.handle_action("pause")
			get_viewport().set_input_as_handled()
			return
		if event.is_action_pressed("ui_accept"):
			ui.handle_action("confirm")
			get_viewport().set_input_as_handled()
			return
	for action in ["pause", "confirm", "journal", "map", "inventory"]:
		if event.is_action_pressed(action):
			ui.handle_action(action)
			get_viewport().set_input_as_handled()
			return
	if not str(ui.menu).is_empty():
		return
	if model.status == "dialogue" and event.is_action_pressed("interact"):
		ui.handle_action("confirm")
		get_viewport().set_input_as_handled()
		return
	if model.status == "playing":
		var acted := false
		if event.is_action_pressed("attack"):
			acted = model.attack()
		elif event.is_action_pressed("dash"):
			acted = model.dash(_movement_direction())
		elif event.is_action_pressed("pulse"):
			acted = model.pulse()
		elif event.is_action_pressed("lantern"):
			acted = model.lantern()
		elif event.is_action_pressed("shield"):
			acted = model.shield()
		elif event.is_action_pressed("interact"):
			acted = model.interact()
		elif event.is_action_pressed("potion"):
			acted = model.use_potion()
		if acted:
			get_viewport().set_input_as_handled()
	if event is InputEventScreenTouch:
		if event.pressed and _active_touch < 0:
			_active_touch = event.index
			_touch_origin = event.position
		elif not event.pressed and event.index == _active_touch:
			_active_touch = -1
			_touch_input = Vector2.ZERO
	elif event is InputEventScreenDrag and event.index == _active_touch:
		_touch_input = ((event.position - _touch_origin) / 70.0).limit_length(1.0)

func _movement_direction() -> Vector2:
	var input := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if _active_touch >= 0:
		input = _touch_input
	if not is_instance_valid(camera):
		return input
	var right := Vector2(camera.global_basis.x.x, camera.global_basis.x.z).normalized()
	var forward := Vector2(-camera.global_basis.z.x, -camera.global_basis.z.z).normalized()
	return (right * input.x - forward * input.y).limit_length(1.0)

func _physics_process(delta: float) -> void:
	model.update(_movement_direction(), delta)
	if int(model.map_revision) != _last_map_revision:
		_rebuild_world()
		_save_now()
	var pending: Array = model.events.duplicate()
	model.events.clear()
	var has_tone := false
	for event in pending:
		if str(event).begins_with("tone_") or str(event).begins_with("tone:"):
			has_tone = true
	for event in pending:
		if event == "save":
			_save_now()
		elif event == "shop":
			ui.handle_action("shop")
		elif str(event).begins_with("puzzle:"):
			ui.open_puzzle(str(event).trim_prefix("puzzle:"))
		if not muted and not (has_tone and event == "interact"):
			audio.play_event(str(event))
	if model.status == "playing":
		_autosave_timer += delta
		if _autosave_timer >= 60.0:
			_save_now()
	_refresh(delta)

func _refresh(delta: float) -> void:
	if _closing:
		return
	world.sync(model, delta)
	ui.refresh(model, delta)
	var region := str(model.map_info().get("region", "village"))
	if region == "sanctum":
		region = "sanctuary"
	if model.status == "ready":
		region = "title"
	elif model.status == "won":
		region = "ending"
	var battle := false
	if not model.boss.is_empty() and model.status == "playing":
		battle = model.boss.get("state", "dormant") not in ["dormant", "defeated"]
	audio.set_region(region, battle)

func request_action(action: String, payload: Variant = null) -> void:
	if _closing:
		return
	match action:
		"new", "new_game":
			selected_slot = _slot_from_payload(payload)
			var difficulty := str(settings.get("difficulty", "standard"))
			if payload is Dictionary:
				difficulty = str(payload.get("difficulty", difficulty))
			model.begin(difficulty)
			_save_now()
			_rebuild_world()
		"continue", "load":
			selected_slot = _slot_from_payload(payload)
			if not model.load_data(stores[selected_slot].load_checkpoint()):
				save_notice = "存档无法读取，请选择其他槽位。"
			else:
				_rebuild_world()
		"save":
			_save_now()
		"pause":
			if model.status == "playing":
				model.toggle_pause()
		"resume":
			if model.status == "paused":
				model.toggle_pause()
		"retry":
			model.retry()
			_rebuild_world()
			_save_now()
		"continue_exploring":
			if model.has_method("continue_exploring") and model.call("continue_exploring"):
				_rebuild_world()
				_save_now()
		"confirm", "next_dialogue", "dialogue_next":
			if model.status == "dialogue":
				model.next_dialogue()
		"choose_choice":
			if model.has_method("choose_choice"):
				if model.call("choose_choice", str(payload)):
					_save_now()
		"attack":
			model.attack()
		"dash":
			model.dash(_movement_direction())
		"pulse":
			model.pulse()
		"lantern":
			model.lantern()
		"shield":
			model.shield()
		"interact":
			model.interact()
		"potion":
			model.use_potion()
		"travel":
			if model.travel(int(payload)):
				_rebuild_world()
				_save_now()
		"buy":
			if model.buy(str(payload)):
				_save_now()
		"equip":
			var equipped := false
			if payload is Dictionary:
				equipped = model.equip(str(payload.get("charm_id", "")), int(payload.get("slot", -1)))
			else:
				equipped = model.equip(str(payload))
			if equipped:
				_save_now()
		"puzzle_action":
			if payload is Dictionary and model.has_method("puzzle_action"):
				if model.call("puzzle_action", str(payload.get("id", "")), payload.get("action", {})):
					_save_now()
		"difficulty":
			settings.difficulty = str(payload)
			model.difficulty = str(payload)
			_save_settings()
		"volume":
			settings.volume = clampf(float(payload), 0.0, 1.0)
			audio.set_volume(float(settings.volume))
			_save_settings()
		"text_scale":
			settings.text_scale = clampf(float(payload), 0.8, 1.4)
			_save_settings()
		"quality":
			settings.quality = str(payload)
			_apply_quality()
			_save_settings()
		"rebind":
			if payload is Dictionary:
				var binding := str(payload.get("action", ""))
				var code := int(payload.get("keycode", 0))
				if DEFAULT_KEYS.has(binding) and code > 0 and code not in [KEY_ESCAPE, KEY_ENTER]:
					settings.bindings[binding] = code
					_bind_inputs()
					_save_settings()
		"reset_bindings":
			settings.bindings = {}
			_bind_inputs()
			_save_settings()
		"title", "return_title":
			_save_now()
			model.status = "ready"
			_refresh_saves()
		"quit":
			_quit_safely()
	_refresh(0.0)

func _quit_safely() -> void:
	if _closing:
		return
	_closing = true
	_save_now()
	_save_settings()
	set_physics_process(false)
	set_process_unhandled_input(false)
	if is_instance_valid(audio):
		audio.stop_all()
	# Let the audio mixer retire its playback handles before the scene is freed.
	await get_tree().create_timer(0.3).timeout
	get_tree().quit()

func _slot_from_payload(payload: Variant) -> int:
	if payload is Dictionary:
		return clampi(int(payload.get("slot", selected_slot)), 0, 2)
	if payload is int or payload is float:
		return clampi(int(payload), 0, 2)
	return selected_slot

func _rebuild_world() -> void:
	world.build(model)
	player_sprite = world.player_sprite
	camera = world.camera
	_last_map_revision = int(model.map_revision)
	_apply_quality()

func _save_now() -> bool:
	if stores.is_empty() or model.status == "ready":
		return false
	var data: Dictionary = model.save_data()
	data["saved_at"] = int(Time.get_unix_time_from_system())
	if not stores[selected_slot].save_checkpoint(data):
		save_notice = "保存失败，请检查数据目录空间与权限。"
		return false
	_autosave_timer = 0.0
	save_notice = "旅途已保存"
	_refresh_saves()
	return true

func _refresh_saves() -> void:
	saves.clear()
	for store in stores:
		saves.append(store.load_checkpoint())

func _load_settings() -> void:
	var settings_path := save_root.path_join("settings.json")
	if not FileAccess.file_exists(settings_path):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not parsed is Dictionary:
		return
	settings.volume = clampf(float(parsed.get("volume", 0.65)), 0.0, 1.0)
	settings.text_scale = clampf(float(parsed.get("text_scale", 1.0)), 0.8, 1.4)
	settings.quality = str(parsed.get("quality", "standard"))
	settings.difficulty = str(parsed.get("difficulty", "standard"))
	if parsed.get("bindings") is Dictionary:
		settings.bindings = parsed.bindings

func _save_settings() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(save_root))
	var file := FileAccess.open(save_root.path_join("settings.json"), FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(settings))
		file.close()

func _apply_quality() -> void:
	if is_instance_valid(world) and world.has_method("apply_settings"):
		world.apply_settings(settings)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST and is_instance_valid(ui):
		request_action("quit")
	elif what == NOTIFICATION_APPLICATION_FOCUS_OUT and not _closing and model.status == "playing":
		ui.handle_action("pause")

func _begin() -> void:
	request_action("new", selected_slot)
