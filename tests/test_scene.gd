extends SceneTree
## Real scene, connected UI signals and persisted records. Geometry is tested elsewhere.
const Puzzles = preload("res://scripts/puzzle_rules.gd")
const CampaignTests = preload("res://tests/test_campaign.gd")
var checks := 0
var failures := 0
var game: Node
var sandbox := "user://integration_test_%d" % OS.get_process_id()

func _initialize() -> void:
	call_deferred("_run_tests")

func _check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ", label)

func _button(container: Node, text: String) -> Button:
	if container is Button and container.text == text:
		return container
	for child in container.get_children():
		var result := _button(child, text)
		if result != null:
			return result
	return null

func _click(text: String) -> bool:
	var button: Button = _button(game.ui.modal_panel, text) if game.ui.modal_panel != null else null
	_check(button != null and not button.disabled, "Connected menu button exists: " + text)
	if button == null or button.disabled:
		return false
	button.pressed.emit()
	return true

func _settle() -> void:
	await process_frame
	await process_frame
	game.set_physics_process(false)

func _finish_dialogue() -> void:
	var advances := 0
	while game.model.status == "dialogue" and advances < 100:
		game.ui.refresh(game.model, 20.0)
		game.ui.handle_action("confirm")
		advances += 1
	_check(game.model.status != "dialogue", "Dialogue finishes through connected confirm action")
	game._physics_process(0.0)

func _focused_menu(label: String) -> void:
	var focused: Control = game.get_viewport().gui_get_focus_owner()
	_check(focused != null and game.ui.modal_panel != null and game.ui.modal_panel.is_ancestor_of(focused), label + " receives keyboard/gamepad focus")

func _has_input_kind(action: String, kind: String) -> bool:
	if not InputMap.has_action(action):
		return false
	for event: InputEvent in InputMap.action_get_events(action):
		if kind == "key" and event is InputEventKey:
			return true
		if kind == "button" and event is InputEventJoypadButton:
			return true
		if kind == "axis" and event is InputEventJoypadMotion:
			return true
		if kind == "mouse" and event is InputEventMouseButton:
			return true
	return false

func _chinese_characters(value: Variant, output: Dictionary) -> void:
	if value is String:
		for index in range(value.length()):
			var code: int = value.unicode_at(index)
			if code >= 0x4e00 and code <= 0x9fff:
				output[code] = true
	elif value is Dictionary:
		for field in value.values():
			_chinese_characters(field, output)
	elif value is Array:
		for field in value:
			_chinese_characters(field, output)

func _canonical(data: Dictionary) -> Variant:
	var clean := data.duplicate(true)
	clean.erase("saved_at")
	return JSON.parse_string(JSON.stringify(clean))

func _perform_panel_action(panel: Control, action: Dictionary) -> void:
	match str(action.kind):
		"rotate": panel._board.mirror_buttons[int(action.index)].pressed.emit()
		"adjust": panel._valves[int(action.index)].value = int(panel.state.valves[int(action.index)]) + int(action.delta)
		"choose":
			var index: int = panel.definition.config.symbols.find(action.symbol)
			panel._board.rune_buttons[index].pressed.emit()
		"toggle": panel._board.network_buttons[int(action.index)].pressed.emit()

func _exercise_puzzles(map_id: int) -> void:
	for definition: Dictionary in Puzzles.definitions():
		if int(definition.map_id) != map_id:
			continue
		var id: String = definition.id
		game.model.player_position = definition.position
		game.request_action("interact")
		game._physics_process(0.0)
		await _settle()
		_check(game.ui.menu == "puzzle" and game.model.status == "paused" and game.ui._active_puzzle == id, definition.type + " opens from real world interaction")
		var panel: Control = game.ui._puzzle_panel
		if panel == null:
			_check(false,"Interactive puzzle panel exists")
			continue
		_focused_menu(str(definition.type) + " puzzle")
		var frozen_time: float = game.model.elapsed
		var frozen_position: Vector2 = game.model.player_position
		Input.action_press("move_right")
		game._physics_process(0.1)
		Input.action_release("move_right")
		_check(game.model.elapsed == frozen_time and game.model.player_position == frozen_position,"Puzzle menu freezes adventure simulation")
		var actions := Puzzles.solution_path(id)
		var expected_state := Puzzles.initial_state(id)
		var before_coins: int = game.model.coins
		_perform_panel_action(panel,actions[0])
		expected_state = Puzzles.apply_action(id,expected_state,actions[0])
		_check(_canonical(panel.state) == _canonical(expected_state) and _canonical(game.model.puzzle_states[id]) == _canonical(expected_state),"Puzzle button updates model and visible feedback")
		_check(not panel.is_complete() and game.model.coins == before_coins,"Partial work awards nothing")
		var partial: Dictionary = game.model.puzzle_states[id].duplicate(true)
		_click("保留思路，稍后再来")
		_check(game.model.status == "playing" and game.ui.menu.is_empty(),"Close puzzle restores adventure")
		game.request_action("continue",game.selected_slot)
		game.model.player_position = definition.position
		_check(_canonical(game.model.puzzle_states[id]) == _canonical(partial),"Incomplete puzzle survives actual disk reload")
		game.request_action("interact")
		game._physics_process(0.0)
		await _settle()
		panel = game.ui._puzzle_panel
		_check(panel != null and _canonical(panel.state) == _canonical(partial),"Reopening displays remembered partial state")
		if panel == null:
			continue
		var panel_id := panel.get_instance_id()
		for index in range(1,actions.size()):
			_perform_panel_action(panel,actions[index])
			expected_state = Puzzles.apply_action(id,expected_state,actions[index])
			_check(_canonical(panel.state) == _canonical(expected_state) and panel.get_instance_id() == panel_id,"Visible puzzle state updates without rebuilding controls")
		_check(panel.is_complete() and game.model.flags.get("puzzle:" + id,false),"Real control sequence completes " + str(definition.type))
		_check(game.model.coins == before_coins + int(definition.reward_coins),"First solution awards exactly advertised reward")
		var solved_coins: int = game.model.coins
		var solved_state: Dictionary = game.model.puzzle_states[id].duplicate(true)
		panel.puzzle_action.emit(actions[0])
		_check(game.model.coins == solved_coins and _canonical(game.model.puzzle_states[id]) == _canonical(solved_state),"Replayed solved-panel signal cannot repeat reward")
		_check(panel.feedback.solved and not panel._status.text.is_empty(),"Puzzle visibly confirms restored light")
		_click("灯路已续好 · 返回旅途")
		_check(game.model.status == "playing" and game.ui.menu.is_empty(),"Solved panel returns control to adventure")
		game.request_action("continue",game.selected_slot)
		_check(_canonical(game.model.puzzle_states[id]) == _canonical(solved_state) and game.model.flags.get("puzzle:" + id,false),"Solved state and first-reward marker survive reload")
		_check(game.model.coins == solved_coins,"Reloading completed puzzle grants no additional reward")

func _finish_map_fixture() -> void:
	var required: Array = game.model.map_info().get("required",[])
	for object: Dictionary in game.model.objects:
		if object.id in required:
			object.completed = true
			game.model.flags["object:" + str(object.id)] = true

func _dialogue_layout() -> void:
	game.ui._change_text_scale(1.25)
	var lines: Array[String] = []
	for map: Dictionary in game.model.Data.maps():
		lines.append_array(map.intro)
		lines.append_array(map.outro)
		for object: Dictionary in map.objects:
			lines.append_array(object.get("text",[]))
	lines.sort_custom(func(a: String,b: String): return a.length() > b.length())
	for index in range(mini(12,lines.size())):
		game.model._open_dialogue("林恩",[lines[index]])
		game._refresh(0.0)
		game.ui.refresh(game.model,20.0)
		await _settle()
		var label: Label = game.ui._dialogue_text
		var label_font: Font = label.get_theme_font("font")
		var font_size := label.get_theme_font_size("font_size")
		var count := label.get_line_count()
		var required_height := label_font.get_height(font_size) * count + label.get_theme_constant("line_spacing") * maxi(0,count - 1)
		_check(label.size.y + 1.0 >= required_height,"Long dialogue %d fits its real 125%% text area" % index)
		_check(game.ui._dialogue.get_global_rect().end.y <= 721.0 and game.ui._dialogue_next_button.get_global_rect().end.y <= 721.0,"Dialogue and confirm button stay inside 720p window")
		await _finish_dialogue()

func _choice_button(id: String) -> Button:
	for index in range(game.model.dialogue_choices.size()):
		if str(game.model.dialogue_choices[index].id) == id:
			return game.ui._dialogue_choices.get_child(index) as Button
	return null

func _ledger_test() -> void:
	game.model.player_position = game.model.map_info().camp
	game.request_action("travel",0)
	await _finish_dialogue()
	var quest: Dictionary = {}
	for entry: Dictionary in game.model.Data.side_quests():
		if entry.id == "city_ledger":
			quest = entry
			break
	_check(not quest.is_empty(),"Ledger side quest has authored choice rules")
	if quest.is_empty():
		return
	# Page acquisition is model-tested; here vary read-page flags to test the NPC UI.
	for index in range(quest.object_ids.size()):
		game.model.flags["object:" + str(quest.object_ids[index])] = index < 2
	var merchant: Dictionary = {}
	for object: Dictionary in game.model.objects:
		if object.get("npc_key","") == "afu":
			merchant = object
	_check(not merchant.is_empty(),"Any village merchant can handle late-game ledger")
	if merchant.is_empty():
		return
	game.model.player_position = merchant.position
	game.request_action("interact")
	game._physics_process(0.0)
	_click("收好行囊")
	await _finish_dialogue()
	_check(game.model.dialogue_choices.is_empty() and not game.model.flags.get("quest:city_ledger",false),"Two read pages do not offer ledger answer buttons")
	game.model.flags["object:" + str(quest.object_ids[-1])] = true
	game.request_action("interact")
	game._physics_process(0.0)
	_click("收好行囊")
	var advances := 0
	while game.model.status == "dialogue" and game.model.dialogue_choices.is_empty() and advances < 100:
		game.ui.refresh(game.model,20.0)
		game.ui.handle_action("confirm")
		advances += 1
	game.ui.refresh(game.model,20.0)
	await _settle()
	_check(game.model.dialogue_choices.size() == 3 and game.ui._dialogue_choices.visible and game.ui._dialogue_choices.get_child_count() == 3,"Reading all pages opens three real ledger choices through merchant")
	var before_coins: int = game.model.coins
	var before_index: int = game.model.dialogue_index
	var interact_event := InputEventAction.new()
	interact_event.action = "interact"
	interact_event.pressed = true
	game._unhandled_input(interact_event)
	_check(game.model.status == "dialogue" and game.model.dialogue_index == before_index and not game.model.flags.get("quest:city_ledger",false),"Ordinary E input cannot select an answer implicitly")
	var wrong := _choice_button("five")
	_check(wrong != null,"Wrong ledger answer has real connected button")
	if wrong != null:
		wrong.pressed.emit()
	game.ui.refresh(game.model,20.0)
	await _settle()
	_check(game.model.coins == before_coins and not game.model.flags.get("quest:city_ledger",false) and game.ui._dialogue_choices.visible,"Incorrect answer is free and permits immediate retry")
	_check(game.ui._dialogue.get_global_rect().end.y <= 721.0,"Three-answer dialogue fits 720p at 125% font size")
	for button: Button in game.ui._dialogue_choices.get_children():
		_check(button.get_global_rect().end.y <= 721.0 and button.get_global_rect().end.x <= 1281.0,"Real choice button remains within window")
	var correct := _choice_button("three")
	_check(correct != null,"Correct three-lamp answer has real connected button")
	if correct != null:
		correct.pressed.emit()
	_check(game.model.flags.get("quest:city_ledger",false) and game.model.coins == before_coins + int(quest.reward_coins),"Correct ledger button grants exactly one quest reward")
	await _finish_dialogue()
	var after_reward: int = game.model.coins
	game.request_action("save")
	game.request_action("continue",game.selected_slot)
	_check(game.model.flags.get("quest:city_ledger",false) and game.model.coins == after_reward,"Ledger result and reward survive save/load")
	game.model.player_position = merchant.position
	game.request_action("interact")
	game._physics_process(0.0)
	_click("收好行囊")
	await _finish_dialogue()
	game.request_action("choose_choice","three")
	_check(game.model.dialogue_choices.is_empty() and game.model.coins == after_reward,"Retalking and replaying choice after reload cannot grant second reward")
	game.model.player_position = game.model.map_info().camp
	game.request_action("travel",1)
	await _finish_dialogue()
	_check(game.model.map_id == 1,"Ledger interaction returns to active forest journey")

func _label_texts(node: Node) -> Array[String]:
	var result: Array[String] = []
	if node is Label:
		result.append(node.text)
	for child: Node in node.get_children():
		result.append_array(_label_texts(child))
	return result

func _journal_records_test() -> void:
	var discovered_object: Dictionary = {}
	for object: Dictionary in game.model.objects:
		if object.id == "m01_child_sign":
			discovered_object = object
			break
	_check(not discovered_object.is_empty() and not discovered_object.completed,"Journal fixture contains an unread optional investigation")
	if discovered_object.is_empty():
		return
	var unknown: Dictionary = {}
	for map: Dictionary in game.model.Data.maps():
		for object: Dictionary in map.objects:
			if bool(object.get("hidden",false)) and not game.model.flags.get("object:" + str(object.id),false):
				unknown = object
				break
		if not unknown.is_empty():
			break
	_check(not unknown.is_empty(),"Journal fixture keeps an undiscovered hidden investigation")
	game.model.player_position = discovered_object.position
	game.request_action("interact")
	game._physics_process(0.0)
	await _finish_dialogue()
	var record_id := "object:" + str(discovered_object.id)
	_check(game.model.flags.get(record_id,false),"Real world interaction records discovered text")
	game.ui.handle_action("journal")
	await _settle()
	_check(game.ui._journal_tab == "quests" and _button(game.ui.modal_panel,"调查记录") != null,"Journal opens on tasks and offers investigation tab")
	_click("调查记录")
	await _settle()
	_check(game.ui.menu == "journal" and game.ui._journal_tab == "records" and game.model.status == "paused","Investigation tab remains a paused journal page")
	_check(game.ui._record_buttons.has(record_id),"Discovered investigation has a real selectable record button")
	if not unknown.is_empty():
		_check(not game.ui._record_buttons.has("object:" + str(unknown.id)),"Undiscovered hidden item has no record button")
		_check(not "\n".join(_label_texts(game.ui.modal_panel)).contains(str(unknown.title)),"Undiscovered hidden item title is absent from record UI")
	var before: Dictionary = game.model.save_data().duplicate(true)
	var before_events: Array = game.model.events.duplicate()
	if game.ui._record_buttons.has(record_id):
		var read_button: Button = game.ui._record_buttons[record_id]
		read_button.pressed.emit()
		await _settle()
		var visible_text := "\n".join(_label_texts(game.ui._record_detail))
		for line: String in discovered_object.get("text",[]):
			_check(visible_text.contains(line),"Actual record selection rereads complete discovered line")
		_check(visible_text.contains(str(discovered_object.title)) and visible_text.contains(str(game.model.map_info().name)),"Record detail identifies investigation and map")
		_focused_menu("Selected investigation record")
	_check(_canonical(game.model.save_data()) == _canonical(before) and game.model.events == before_events,"Reading records cannot award, unlock or mutate adventure progress")
	game.ui._change_text_scale(1.25)
	var longest: Dictionary = {}
	var longest_length := 0
	for record: Dictionary in game.model.journal_records():
		var length := 0
		for line: String in record.lines:
			length += line.length()
		if length > longest_length:
			longest = record
			longest_length = length
	_check(not longest.is_empty(),"Completed scene supplies long rereadable record")
	if not longest.is_empty() and game.ui._record_buttons.has(str(longest.id)):
		var read_button: Button = game.ui._record_buttons[str(longest.id)]
		read_button.pressed.emit()
		await _settle()
		var body_text := "\n".join(_label_texts(game.ui._record_detail))
		var all_present := true
		for line: String in longest.lines:
			all_present = all_present and body_text.contains(line)
		_check(all_present,"Long record retains every authored line in scrollable detail")
		var bounds: Rect2 = game.ui.modal_panel.get_global_rect()
		_check(bounds.end.y <= 721.0 and bounds.end.x <= 1281.0 and bounds.position.y >= -1.0,"Record journal fits 720p at 125% text size")
		_check(bounds.encloses(game.ui._record_detail_scroll.get_global_rect()),"Long record scrolling viewport stays within journal")
		var scrollbar: VScrollBar = game.ui._record_detail_scroll.get_v_scroll_bar()
		_check(scrollbar.max_value > scrollbar.page + 1.0,"Long investigation has accessible scrolling instead of clipped text")
	_click("返回旅途")
	_check(game.model.status == "playing" and game.ui.menu.is_empty(),"Closing investigation records returns to adventure")
	game.request_action("save")
	game.request_action("continue",game.selected_slot)
	await _settle()
	game.ui.handle_action("journal")
	_click("调查记录")
	await _settle()
	_check(game.ui._record_buttons.has(record_id),"Discovered record remains readable after real disk reload")
	if not unknown.is_empty():
		_check(not game.ui._record_buttons.has("object:" + str(unknown.id)),"Reload does not disclose unread hidden record")
	_click("任务")
	await _settle()
	_check(game.ui._journal_tab == "quests" and game.ui.menu == "journal","Tasks remain available alongside rereadable investigations")
	_click("返回旅途")

func _post_ending_test() -> void:
	# The shared fixture actually completes every main mechanism and defeats all
	# bosses. It preserves strict save invariants instead of fabricating flags.
	var completed: RefCounted = CampaignTests.complete_campaign_model("standard")
	_check(completed != null,"Real rule playthrough supplies valid completed campaign")
	if completed == null:
		return
	game.model = completed
	game.model.events.clear()
	game.selected_slot = 2
	game._rebuild_world()
	game._refresh(0.0)
	await _settle()
	_check(game.model.status == "won" and game.ui.menu == "ending" and game.model.flags.get("ending_seen",false),"Actual campaign victory displays real ending UI")
	_focused_menu("Ending")
	_check(game.ui.modal_panel.get_global_rect().end.y <= 721.0,"Ending and exploration button fit 720p with larger text")
	var reward_coins: int = game.model.coins
	var permanent: Dictionary = game.model.flags.duplicate(true)
	_click("继续探索，完成余下的约定")
	await _settle()
	_check(game.model.status == "playing" and game.ui.menu.is_empty() and game.ui.hud.visible,"Ending exploration button returns control to playing HUD")
	_check(game.model.flags == permanent and game.model.coins == reward_coins,"Continuing preserves ending markers and does not repeat rewards")
	_check(game.model.player_position.is_equal_approx(game.model.map_info().camp),"Post-ending exploration starts at safe camp")
	game.ui.handle_action("map")
	await _settle()
	_check(game.ui.menu == "map" and game.model.status == "paused","Completed campaign can open normal world map")
	_click("灯火村")
	await _settle()
	var travel := _button(game.ui.modal_panel,"沿灯路前往")
	_check(travel != null and not travel.disabled,"Visited village is available from final safe camp")
	_click("沿灯路前往")
	await _settle()
	_check(game.model.map_id == 0 and game.model.status == "playing" and game.ui.menu.is_empty(),"Real map travel revisits village after ending")
	_check(game.model.flags.get("ending_seen",false) and game.model.coins == reward_coins,"Backtracking keeps seen ending and original rewards")
	game.request_action("save")
	var record: Dictionary = game.stores[2].load_checkpoint()
	_check(record.flags.get("ending_seen",false) and int(record.map_id) == 0,"Post-ending revisit persists in real save slot")
	game.model.coins = 0
	game.request_action("continue",2)
	await _settle()
	_check(game.model.status == "playing" and game.ui.menu.is_empty() and game.ui.hud.visible and game.model.map_id == 0,"Loading seen ending restores exploration instead of locking ending page")
	_check(game.model.coins == reward_coins and game.model.flags == permanent,"Post-ending load restores coins and permanent flags without rewards")
	game.ui.handle_action("journal")
	await _settle()
	_check(game.ui.menu == "journal" and game.model.status == "paused","Unfinished side stories remain accessible after ending reload")
	game.ui.handle_action("journal")
	_check(game.model.status == "playing" and game.ui.menu.is_empty(),"Post-ending journal closes back to active exploration")

func _run_tests() -> void:
	root.size = Vector2i(1280,720)
	root.content_scale_size = Vector2i(1280,720)
	var packed := load("res://scenes/main.tscn") as PackedScene
	if packed == null:
		printerr("FAIL: campaign main scene cannot load")
		quit(1)
		return
	game = packed.instantiate()
	if not game.has_method("request_action"):
		printerr("FAIL: main scene script could not load")
		game.free()
		game = null
		quit(1)
		return
	game.save_root = sandbox
	game.set_physics_process(false)
	root.add_child(game)
	await _settle()
	game.muted = true
	game.audio.set_volume(0.0)
	_check(game.player_sprite is Sprite3D and game.player_sprite.texture != null, "Main creates textured 3D pixel player")
	_check(game.camera is Camera3D and game.camera.current and game.camera.projection == Camera3D.PROJECTION_ORTHOGONAL, "Active orthographic HD-2D camera")
	_check(game.world.get_child_count() > 4 and game.world._stage.get_child_count() > 0, "Campaign creates layered 3D stage")
	_check(game.model.status == "ready" and game.ui.menu == "title" and game.ui.modal_center.visible, "Chinese title menu is initial state")
	_check(game.saves.size() == 3 and game.saves.all(func(record): return record.is_empty()), "Isolated profile has three empty slots")
	_check(game.stores.all(func(store): return store.path.begins_with(sandbox)), "Save slots use isolated profile")
	for tone: Array in [["tone:low",0.75],["tone_high",1.5],["tone:mid",1.0]]:
		var voice_index: int = game.audio._next_voice
		game.audio.play_event(str(tone[0]))
		_check(game.audio._voices[voice_index].playing and is_equal_approx(game.audio._voices[voice_index].pitch_scale,float(tone[1])),"Listening puzzle uses distinct actual note pitch: " + str(tone[0]))
	_focused_menu("Title")
	for action: String in ["move_left", "move_right", "move_up", "move_down"]:
		_check(_has_input_kind(action, "key") and _has_input_kind(action, "axis"), action + " keyboard/gamepad mappings")
	for action: String in ["attack", "dash", "pulse", "lantern", "shield", "interact", "potion", "pause", "inventory", "journal", "map"]:
		_check(_has_input_kind(action, "key") and _has_input_kind(action, "button"), action + " keyboard/gamepad mappings")
	_check(_has_input_kind("attack", "mouse"), "Mouse attack mapping")
	var continue_button := _button(game.ui.modal_panel, "继续旅程")
	_check(continue_button != null and continue_button.disabled, "Empty profile disables Continue")
	_click("开始新的旅程")
	await _settle()
	_check(game.ui.menu == "slots", "New journey opens three-slot selector")
	_click("在此开始")
	await _settle()
	_check(game.selected_slot == 0 and game.model.status in ["playing", "dialogue"], "Slot signal starts campaign")
	if game.model.status != "dialogue":
		for object: Dictionary in game.model.objects:
			if not object.get("text", []).is_empty() and object.get("npc_key", "") != "afu" and object.type != "camp":
				game.model.player_position = object.position
				game.request_action("interact")
				break
	_check(game.model.status == "dialogue" and game.ui._dialogue.visible and not game.ui._dialogue_text.text.is_empty(), "Story displays Chinese dialogue")
	_check(game.ui._dialogue_portrait.texture != null, "Dialogue speaker portrait")
	await _finish_dialogue()
	_check(game.model.status == "playing" and game.ui.hud.visible and game.ui.menu.is_empty(), "Dialogue returns to playable HUD")
	var initial_position: Vector2 = game.model.player_position
	Input.action_press("move_right")
	game._physics_process(0.05)
	Input.action_release("move_right")
	_check(game.model.player_position != initial_position, "Mapped movement reaches model")
	_check(Vector2(game.player_sprite.position.x, game.player_sprite.position.z).is_equal_approx(game.model.player_position), "Visible player follows model x/z")
	game.ui.handle_action("pause")
	await _settle()
	_check(game.model.status == "paused" and game.ui.menu == "pause", "Pause menu freezes through controller")
	_focused_menu("Pause")
	var frozen_position: Vector2 = game.model.player_position
	var frozen_elapsed: float = game.model.elapsed
	Input.action_press("move_right")
	game._physics_process(0.1)
	Input.action_release("move_right")
	_check(game.model.player_position == frozen_position and game.model.elapsed == frozen_elapsed, "Paused physics preserves time and position")
	_click("继续旅途")
	_check(game.model.status == "playing" and game.ui.menu.is_empty(), "Resume button restores gameplay")
	for menu_name: String in ["inventory", "journal", "map", "shop"]:
		game.ui.handle_action(menu_name)
		await _settle()
		_check(game.ui.menu == menu_name and game.model.status == "paused", menu_name + " pauses gameplay")
		_focused_menu(menu_name)
		game.ui.handle_action(menu_name)
		_check(game.ui.menu.is_empty() and game.model.status == "playing", menu_name + " closes and resumes")
	var merchant: Dictionary = {}
	for object: Dictionary in game.model.objects:
		if object.get("npc_key", "") == "afu":
			merchant = object
			break
	_check(not merchant.is_empty(), "Hub contains actual merchant interaction")
	if not merchant.is_empty():
		game.model.player_position = merchant.position
		game.model.potions = 2
		game.model.coins = 20
		game.request_action("interact")
		game._physics_process(0.0)
		await _settle()
		_check(game.ui.menu == "shop", "Merchant model event opens connected shop UI")
		_click("购买恢复药")
		_check(game.model.potions == 3 and game.model.coins == 12, "Shop button purchases model item and refreshes inventory")
		_click("收好行囊")
		await _finish_dialogue()
		_check(game.model.status == "playing" and game.ui.menu.is_empty(), "Merchant shop and dialogue close back to adventure")
	game.ui.handle_action("map")
	_click("灯塔圣所")
	await _settle()
	var travel_button := _button(game.ui.modal_panel, "沿灯路前往")
	_check(travel_button != null and travel_button.disabled, "Unvisited late region cannot be fast-traveled to")
	var old_map: int = game.model.map_id
	game.request_action("travel", 14)
	_check(game.model.map_id == old_map and not game.model.flags.get("visited:14", false), "Controller rejects unauthorized fast travel")
	game.ui.handle_action("map")
	game.ui.handle_action("settings")
	await _settle()
	var panel_id: int = game.ui.modal_panel.get_instance_id()
	var root_id: int = game.ui.root.get_instance_id()
	var font_before: int = game.ui._health_text.get_theme_font_size("font_size")
	game.request_action("volume", 0.0)
	_check(AudioServer.is_bus_mute(AudioServer.get_bus_index("LumenfallMusic")) and AudioServer.is_bus_mute(AudioServer.get_bus_index("LumenfallEffects")), "Volume zero mutes actual music/effect buses")
	game.ui._change_text_scale(1.25)
	_check(game.ui._health_text.get_theme_font_size("font_size") > font_before, "Text size enlarges existing HUD")
	for index in range(12):
		game._physics_process(0.016)
	_check(game.ui.root.get_instance_id() == root_id and game.ui.modal_panel.get_instance_id() == panel_id, "Refresh preserves UI nodes across frames")
	_check(FileAccess.file_exists(sandbox.path_join("settings.json")), "Settings also use isolated profile")
	game.ui.handle_action("settings")
	var expected_slots: Array[Dictionary] = []
	for slot in range(3):
		game.request_action("new", {"slot": slot, "difficulty": ["story", "standard", "challenge"][slot]})
		await _finish_dialogue()
		game.model.coins = 40 + slot * 11
		game.model.elapsed = 65.5 + slot * 60.0
		game.model.health = 93 - slot * 7
		game.request_action("save")
		var expected: Dictionary = game.model.save_data().duplicate(true)
		expected_slots.append(expected)
		_check(_canonical(game.stores[slot].load_checkpoint()) == _canonical(expected), "Slot %d persists actual payload" % (slot + 1))
	for slot in range(3):
		game.request_action("continue", slot)
		_check(game.selected_slot == slot and game.model.status == "playing", "Continue selects independent slot %d" % (slot + 1))
		_check(_canonical(game.model.save_data()) == _canonical(expected_slots[slot]), "Slot %d restores full persistent content" % (slot + 1))
	game.request_action("continue", 0)
	# Complete a valid hub fixture; unit tests separately cover objective rules.
	var required: Array = game.model.map_info().get("required", [])
	for object: Dictionary in game.model.objects:
		if object.id in required:
			object.completed = true
			game.model.flags["object:" + str(object.id)] = true
	game.model._maybe_outro()
	game._refresh(0.0)
	await _finish_dialogue()
	game.model.player_position = game.model.map_info().exit
	var old_stage_id: int = game.world._stage.get_instance_id()
	game.request_action("travel", 1)
	await _settle()
	await _finish_dialogue()
	_check(game.model.map_id == 1 and game.world._map_id == "1" and game.world._stage.get_instance_id() != old_stage_id, "Transition rebuilds actual 3D stage")
	_check(game.player_sprite == game.world.player_sprite and Vector2(game.player_sprite.position.x, game.player_sprite.position.z).is_equal_approx(game.model.player_position), "Transition reconnects new player view")
	_check(game.ui._location.text == game.model.map_info().name and game.audio._target_track == "forest", "Transition refreshes HUD and soundtrack")
	await _exercise_puzzles(1)
	_finish_map_fixture()
	game.model._maybe_outro()
	game._refresh(0.0)
	await _finish_dialogue()
	game.model.player_position = game.model.map_info().exit
	game.request_action("travel",2)
	await _finish_dialogue()
	_check(game.model.map_id == 2,"Solved mandatory mechanisms allow real next-map transition")
	await _exercise_puzzles(2)
	game.model.player_position = game.model.map_info().camp
	game.request_action("travel",1)
	await _finish_dialogue()
	_check(game.model.map_id == 1,"Visited-map return keeps completed mechanisms")
	await _dialogue_layout()
	await _ledger_test()
	await _journal_records_test()
	var preserved_flags: Dictionary = game.model.flags.duplicate(true)
	game.model.health = 0
	game.model.status = "lost"
	game._physics_process(0.0)
	_check(game.ui.menu == "death" and game.ui.modal_center.visible, "Death displays recovery menu")
	_click("回到篝火，继续前行")
	await _settle()
	_check(game.model.status == "playing" and game.model.health == game.model.max_health and game.ui.menu.is_empty(), "Retry button restores checkpoint and HUD")
	_check(game.model.flags == preserved_flags and game.player_sprite == game.world.player_sprite, "Retry preserves progress and reconnects scene")
	game.ui.handle_action("pause")
	_click("返回标题")
	_check(game.ui.menu == "return_title", "Return title presents save-and-return prompt")
	_click("保存并返回标题")
	await _settle()
	_check(game.model.status == "ready" and game.ui.menu == "title" and not game.ui.hud.visible, "Return signal restores title")
	_click("开始新的旅程")
	_click("在此开始")
	_check(game.ui.menu == "overwrite", "Existing journey requires explicit overwrite confirmation")
	_click("保留旧记录")
	_check(game.ui.menu == "slots" and int(game.stores[0].load_checkpoint().map_id) == 1, "Cancel overwrite preserves saved forest journey")
	_click("返回")
	_click("继续旅程")
	_check(game.ui.menu == "slots", "Title Continue opens saved journeys")
	_click("继续")
	await _settle()
	_check(game.model.status == "playing" and game.model.map_id == 1 and game.ui.hud.visible and game.ui.menu.is_empty(), "Continue restores forest journey")
	var characters: Dictionary = {}
	_chinese_characters(game.model.Data.maps(), characters)
	_chinese_characters(game.model.Data.side_quests(), characters)
	_chinese_characters(game.ui.MAP_NAMES, characters)
	_chinese_characters(game.ui.CHARM_DESCRIPTIONS, characters)
	_chinese_characters("暮光之森灯火生命恢复药行囊旅途日记保存地图设置微光归来林恩岑灯阿芙小禾", characters)
	var font: Font = game.ui.root.theme.default_font
	var missing := ""
	for code: int in characters:
		if font == null or not font.has_char(code):
			missing += String.chr(code)
	_check(font != null and missing.is_empty(), "Bundled Chinese font coverage (missing: " + missing.substr(0, 100) + ")")
	await _post_ending_test()
	for store in game.stores:
		_check(store.clear_checkpoint(), "Remove isolated checkpoint")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(sandbox.path_join("settings.json")))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(sandbox))
	game.queue_free()
	game = null
	call_deferred("_finish")

func _finish() -> void:
	# Give the audio thread time to consume queued playback stops.
	await create_timer(0.3).timeout
	print("CampaignScene: ", checks - failures, "/", checks, " checks passed")
	quit(1 if failures > 0 else 0)
