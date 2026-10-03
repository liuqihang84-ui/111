extends CanvasLayer
## The complete Chinese game interface. Gameplay actions are owned by the controller.

signal action_requested(action: String, payload: Variant)

const Art = preload("res://scripts/pixel_art.gd")
const Content = preload("res://scripts/campaign_data.gd")
const MiniMap = preload("res://scripts/mini_map.gd")
const PuzzlePanel = preload("res://scripts/puzzle_panel.gd")
const PuzzleRules = preload("res://scripts/puzzle_rules.gd")
const PAPER := Color("efe9d2")
const GOLD := Color("dbad64")
const MUTED := Color("a0b8ae")
const INK := Color("102b32")
const MAP_NAMES := ["灯火村", "村外林径", "暮光林腹", "旧门庭", "雾泽栈道", "沉灯湿地", "雾镜湖", "遗迹外庭", "符文回廊", "沉没圣库", "旧城街巷", "熄灯工坊", "巡夜钟楼", "古树根庭", "灯塔圣所"]
const CHAPTER_NAMES := ["最后的灯火", "雾中的回声", "沉没的记忆", "无灯之城", "微光归来"]
const CHARM_NAMES := {"home_knot": "归灯结", "forest_leaf": "林行叶", "clear_stone": "澄光石", "echo_ring": "回响环", "night_clasp": "守夜扣", "warm_pendant": "温火坠"}
const CHARM_DESCRIPTIONS := {"home_knot": "绳结系住回家的方向。增加生命上限。", "forest_leaf": "叶脉记住每一次脚步。更快再次闪避。", "clear_stone": "透亮的石心缓缓蓄光。加快灯火恢复。", "echo_ring": "细环让余音留在灯中。缩短光脉冲冷却。", "night_clasp": "铜扣替旅人挡住夜风。增强守夜护罩。", "warm_pendant": "小小火种藏在衣襟里。提高药品治疗量。"}
const CHARM_PRICES := {"home_knot": 25, "forest_leaf": 30, "clear_stone": 30, "echo_ring": 35, "night_clasp": 40, "warm_pendant": 35}
const ABILITY_NAMES := {"pulse": "光脉冲", "lens": "映光透镜", "echo": "回响灯芯", "shield": "守夜护罩"}
const ABILITY_DESCRIPTIONS := {"pulse": "发出光波，驱散暗影并激活路标。", "lens": "举灯时看见雾中隐藏的道路。", "echo": "让举灯的光连接回廊与古老符文。", "shield": "短暂展开护罩，为危险的一刻留出余地。"}
const INPUT_LABELS := {"move_left": "向左", "move_right": "向右", "move_up": "向前", "move_down": "向后", "attack": "普攻", "dash": "闪避", "lantern": "举灯", "interact": "交互", "pulse": "光脉冲", "shield": "守夜护罩", "potion": "使用恢复药", "journal": "日记", "map": "地图", "inventory": "行囊"}

var model: RefCounted
var controller: Node
var root: Control
var hud: Control
var modal_shade: ColorRect
var modal_center: CenterContainer
var modal_panel: PanelContainer
var menu := ""
var last_status := ""
var previous_menu := ""
var selected_save := 0
var active_charm_slot := 0
var _journal_tab := "quests"
var _selected_record := ""
var _record_buttons: Dictionary = {}
var _record_detail: VBoxContainer
var _record_detail_scroll: ScrollContainer
var selected_travel := 0
var slot_mode := "new"
var waiting_rebind := ""
var _modal_focus: Control
var _theme: Theme
var _health: ProgressBar
var _light: ProgressBar
var _health_text: Label
var _light_text: Label
var _supplies: Label
var _location: Label
var _objective: Label
var _progress: Label
var _hint: Label
var _toast: Label
var _toast_time := 0.0
var _toast_revision := -1
var _boss_box: VBoxContainer
var _boss_name: Label
var _boss_phase: Label
var _boss_health: ProgressBar
var _mini_map: Control
var _dialogue: PanelContainer
var _dialogue_portrait: TextureRect
var _dialogue_name: Label
var _dialogue_text: Label
var _dialogue_count: Label
var _dialogue_next_button: Button
var _dialogue_controls: HBoxContainer
var _dialogue_choices: HBoxContainer
var _choice_key := ""
var _dialogue_key := ""
var _typewriter := 0.0
var _chapter_box: PanelContainer
var _chapter_label: Label
var _chapter_time := 0.0
var _last_chapter := -1
var _last_boss_health := 0
var _last_boss_type := ""
var _last_save_notice := ""
var _settings_suspended := false
var _text_scale := 1.0
var _gamepad := false
var _active_puzzle := ""
var _puzzle_panel: Control
var _puzzle_exit: Button
var _puzzle_solved_before := false


func setup(new_model: RefCounted, new_controller: Node) -> void:
	model = new_model
	controller = new_controller
	layer = 10
	root = Control.new()
	root.name = "Interface"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(root)
	_theme = _create_theme()
	root.theme = _theme
	var settings: Dictionary = _settings()
	_text_scale = clampf(float(settings.get("text_scale", 1.0)), 0.9, 1.25)
	_apply_text_scale()
	_build_hud()
	_build_dialogue()
	_build_modal()
	_build_chapter_banner()
	refresh(model, 0.0)


func refresh(new_model: RefCounted, delta: float) -> void:
	model = new_model
	if root == null or model == null:
		return
	var status := str(model.get("status"))
	if status != last_status:
		_sync_status(status)
		last_status = status
	var is_journey := status != "ready"
	hud.visible = is_journey and status != "won"
	var info: Dictionary = model.call("map_info")
	_location.text = str(info.get("name", "暮光之森"))
	var chapter: int = int(info.get("chapter", 1))
	if status == "playing" and chapter != _last_chapter:
		if chapter > 0 and chapter <= CHAPTER_NAMES.size():
			show_chapter(chapter, CHAPTER_NAMES[chapter - 1])
		_last_chapter = chapter
	_health.max_value = float(model.get("max_health"))
	_health.value = float(model.get("health"))
	_light.max_value = float(model.get("max_light"))
	_light.value = float(model.get("light"))
	_health_text.text = "生命  %d / %d" % [int(_health.value), int(_health.max_value)]
	_light_text.text = "灯火  %d / %d" % [int(_light.value), int(_light.max_value)]
	_supplies.text = "恢复药 %d    灯屑 %d" % [int(model.get("potions")), int(model.get("coins"))]
	_objective.text = str(model.call("objective_text"))
	var objective_value: Variant = model.call("objective_progress")
	if objective_value is Vector2i or objective_value is Vector2:
		_progress.text = "旅途进度  %d / %d" % [int(objective_value.x), int(objective_value.y)]
	else:
		_progress.text = ""
	_update_hint()
	var boss: Dictionary = model.get("boss")
	_boss_box.visible = not boss.is_empty() and str(boss.get("state", "dormant")) != "dormant" and int(boss.get("health", 0)) > 0
	if _boss_box.visible:
		_boss_name.text = str(boss.get("name", "守卫"))
		_boss_health.max_value = float(boss.get("max_health", 1))
		_boss_health.value = float(boss.get("health", 0))
		var phase: Variant = model.get("boss_phase_text")
		_boss_phase.text = str(phase) if phase is String else ""
	if menu == "puzzle" and _puzzle_panel != null:
		var states: Variant = model.get("puzzle_states")
		if states is Dictionary:
			var puzzle_state: Dictionary = states.get(_active_puzzle, PuzzleRules.initial_state(_active_puzzle))
			_puzzle_panel.call("refresh_state", puzzle_state)
			var solved := bool(_puzzle_panel.call("is_complete"))
			_puzzle_exit.text = "灯路已续好 · 返回旅途" if solved else "保留思路，稍后再来"
			if solved and not _puzzle_solved_before:
				_puzzle_exit.call_deferred("grab_focus")
			_puzzle_solved_before = solved
	var boss_type := str(boss.get("type", ""))
	if not boss_type.is_empty() and boss_type == _last_boss_type and _last_boss_health > 0 and int(boss.get("health", 0)) <= 0:
		show_chapter_complete(chapter)
	_last_boss_type = boss_type
	_last_boss_health = int(boss.get("health", 0))
	_mini_map.call("refresh", model)
	var save_notice := str(controller.get("save_notice")) if controller != null else ""
	if not save_notice.is_empty() and save_notice != _last_save_notice:
		_last_save_notice = save_notice
		show_toast(save_notice)
	var revision: int = int(model.get("toast_revision"))
	if revision != _toast_revision:
		_toast_revision = revision
		show_toast(str(model.get("toast")))
	_toast_time = maxf(0.0, _toast_time - delta)
	_toast.visible = _toast_time > 0.0 and not _toast.text.is_empty()
	_toast.modulate.a = minf(1.0, _toast_time)
	if status == "playing":
		_chapter_time = maxf(0.0, _chapter_time - delta)
	_chapter_box.visible = _chapter_time > 0.0 and status == "playing"
	_chapter_box.modulate.a = minf(1.0, _chapter_time)
	if status == "dialogue":
		_update_dialogue(delta)


func handle_action(action: String) -> bool:
	var normalized := action
	if normalized in ["pause_game", "ui_cancel", "escape"]:
		normalized = "pause"
	if normalized in ["begin_game", "ui_accept", "interact"]:
		normalized = "confirm"
	if not waiting_rebind.is_empty():
		if normalized == "pause":
			waiting_rebind = ""
			_show_settings()
		return true
	var status := str(model.get("status")) if model != null else "ready"
	if normalized == "confirm" and status == "dialogue" and menu.is_empty():
		_advance_dialogue()
		return true
	if normalized == "pause":
		if status in ["ready", "lost", "won"]:
			if menu not in ["title", "death", "ending"]:
				_show_title()
			return true
		if not menu.is_empty():
			if menu in ["pause", "puzzle"]:
				_close_menu()
			elif menu == "settings" and _settings_suspended:
				_show_title()
			else:
				_show_pause()
		elif status == "dialogue":
			_open_journey_menu("pause")
		else:
			_open_journey_menu("pause")
		return true
	if normalized in ["journal", "map", "inventory", "settings", "shop"]:
		if status in ["lost", "won", "ready"] and normalized != "settings":
			return true
		if menu == normalized:
			_close_menu()
		else:
			_open_journey_menu(normalized)
		return true
	if normalized == "confirm" and status == "ready" and menu == "title":
		_show_slots("new")
		return true
	return not menu.is_empty()


func show_toast(message: String, duration: float = 3.8) -> void:
	_toast.text = message
	_toast_time = duration


func show_chapter(chapter: int, title: String) -> void:
	_chapter_label.text = "第%s章 · %s" % [_chinese_number(chapter), title]
	_chapter_time = 4.5


func show_chapter_complete(chapter: int) -> void:
	if chapter > 0 and chapter <= CHAPTER_NAMES.size():
		_chapter_label.text = "第%s章 · %s\n灯火已续，旅途向前" % [_chinese_number(chapter), CHAPTER_NAMES[chapter - 1]]
		_chapter_time = 5.0


func _input(event: InputEvent) -> void:
	if event is InputEventJoypadButton or event is InputEventJoypadMotion:
		_gamepad = true
	elif event is InputEventKey or event is InputEventMouseButton:
		_gamepad = false
	if waiting_rebind.is_empty():
		return
	if event is InputEventKey and event.pressed and not event.echo:
		get_viewport().set_input_as_handled()
		if event.physical_keycode == KEY_ESCAPE:
			waiting_rebind = ""
			_show_settings()
			return
		var chosen_action := waiting_rebind
		waiting_rebind = ""
		if event.physical_keycode in [KEY_ENTER]:
			show_toast("回车保留用于菜单确认，请选择其他按键。")
			_show_settings()
			return
		var old_key := _primary_keycode(chosen_action)
		for other: String in INPUT_LABELS:
			if other != chosen_action and _primary_keycode(other) == event.physical_keycode and old_key > 0:
				_request("rebind", {"action": other, "keycode": old_key})
		_request("rebind", {"action": chosen_action, "keycode": event.physical_keycode})
		_show_settings()


func _create_theme() -> Theme:
	var result := Theme.new()
	result.default_font = load("res://assets/fonts/lumenfall-ui-full.otf") as Font
	result.default_font_size = 22
	result.set_font_size("font_size", "Button", 22)
	result.set_font_size("font_size", "OptionButton", 21)
	result.set_font_size("font_size", "PopupMenu", 20)
	result.set_color("font_color", "Label", PAPER)
	result.set_color("font_color", "Button", PAPER)
	result.set_color("font_hover_color", "Button", Color("fff3cf"))
	result.set_color("font_focus_color", "Button", Color("fff3cf"))
	result.set_color("font_disabled_color", "Button", Color("657f7b"))
	result.set_stylebox("panel", "PanelContainer", _style(INK, Color("b18c52"), 1, 20))
	result.set_stylebox("normal", "Button", _style(Color("173c42"), Color("466a61"), 1, 12))
	result.set_stylebox("hover", "Button", _style(Color("25594f"), GOLD, 1, 12))
	result.set_stylebox("pressed", "Button", _style(Color("315e53"), GOLD, 2, 12))
	result.set_stylebox("focus", "Button", _style(Color(0, 0, 0, 0), GOLD, 2, 12))
	result.set_stylebox("disabled", "Button", _style(Color("153237"), Color("36534e"), 1, 12))
	result.set_stylebox("background", "ProgressBar", _style(Color("0b2028"), Color("426257"), 1, 0))
	result.set_stylebox("fill", "ProgressBar", _style(Color("66a18b"), Color("66a18b"), 0, 0))
	result.set_color("font_color", "OptionButton", PAPER)
	result.set_stylebox("normal", "OptionButton", _style(Color("173c42"), Color("466a61"), 1, 10))
	result.set_stylebox("hover", "OptionButton", _style(Color("25594f"), GOLD, 1, 10))
	result.set_stylebox("pressed", "OptionButton", _style(Color("315e53"), GOLD, 2, 10))
	result.set_stylebox("focus", "OptionButton", _style(Color(0, 0, 0, 0), GOLD, 2, 10))
	result.set_constant("separation", "VBoxContainer", 12)
	result.set_constant("separation", "HBoxContainer", 12)
	return result


func _style(background: Color, border: Color, width: int = 1, padding: int = 12) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(width)
	style.set_corner_radius_all(3)
	style.content_margin_left = padding
	style.content_margin_right = padding
	style.content_margin_top = padding
	style.content_margin_bottom = padding
	return style


func _build_hud() -> void:
	hud = Control.new()
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(hud)
	var left := PanelContainer.new()
	left.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	left.position = Vector2(22, 20)
	left.custom_minimum_size = Vector2(310, 158)
	left.add_theme_stylebox_override("panel", _style(Color(0.04, 0.12, 0.14, 0.91), Color("9b7b4c"), 1, 15))
	hud.add_child(left)
	var stats := VBoxContainer.new()
	stats.add_theme_constant_override("separation", 7)
	left.add_child(stats)
	_location = _label("灯火村", 23, GOLD)
	stats.add_child(_location)
	_health_text = _label("生命", 17)
	stats.add_child(_health_text)
	_health = _bar(260, 9, Color("80b192"))
	stats.add_child(_health)
	_light_text = _label("灯火", 17, GOLD)
	stats.add_child(_light_text)
	_light = _bar(260, 7, Color("d7b15f"))
	stats.add_child(_light)
	_supplies = _label("恢复药 3    灯屑 0", 18, MUTED)
	stats.add_child(_supplies)
	var quest := PanelContainer.new()
	quest.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	quest.offset_left = -348
	quest.offset_top = 20
	quest.offset_right = -22
	quest.add_theme_stylebox_override("panel", _style(Color(0.04, 0.12, 0.14, 0.91), Color("9b7b4c"), 1, 15))
	hud.add_child(quest)
	var quest_content := VBoxContainer.new()
	quest_content.add_theme_constant_override("separation", 6)
	quest.add_child(quest_content)
	quest_content.add_child(_label("当前旅途", 18, GOLD))
	_objective = _label("寻找导师留下的笔记", 20)
	_objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_objective.custom_minimum_size.x = 290
	quest_content.add_child(_objective)
	_progress = _label("", 17, MUTED)
	quest_content.add_child(_progress)
	_mini_map = MiniMap.new()
	_mini_map.custom_minimum_size = Vector2(180, 110)
	quest_content.add_child(_mini_map)
	var menu_row := HBoxContainer.new()
	quest_content.add_child(menu_row)
	for entry: Array in [["日记", "journal"], ["地图", "map"], ["行囊", "inventory"]]:
		var entry_action := str(entry[1])
		var button := _button(str(entry[0]), func(): handle_action(entry_action), 0)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size", 17)
		menu_row.add_child(button)
	var boss_anchor := CenterContainer.new()
	boss_anchor.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	boss_anchor.offset_top = 26
	boss_anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(boss_anchor)
	_boss_box = VBoxContainer.new()
	_boss_box.custom_minimum_size.x = 420
	boss_anchor.add_child(_boss_box)
	_boss_name = _label("归灯守卫", 22, PAPER)
	_boss_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_box.add_child(_boss_name)
	_boss_health = _bar(420, 10, Color("bd8061"))
	_boss_box.add_child(_boss_health)
	_boss_phase = _label("", 16, Color("ead7b4"))
	_boss_phase.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_boss_phase.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_box.add_child(_boss_phase)
	_hint = _label("", 17, Color("e1d8b9"))
	_hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_hint.offset_left = 24
	_hint.offset_right = -24
	_hint.offset_top = -41
	_hint.offset_bottom = -13
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint.add_theme_color_override("font_shadow_color", Color("09232a"))
	_hint.add_theme_constant_override("shadow_offset_x", 1)
	_hint.add_theme_constant_override("shadow_offset_y", 2)
	hud.add_child(_hint)
	_toast = _label("", 22, Color("ffebbe"))
	_toast.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_toast.offset_left = 150
	_toast.offset_right = -150
	_toast.offset_top = -88
	_toast.offset_bottom = -50
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_toast.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_toast.add_theme_color_override("font_shadow_color", Color("09232a"))
	_toast.add_theme_constant_override("shadow_offset_x", 2)
	_toast.add_theme_constant_override("shadow_offset_y", 2)
	hud.add_child(_toast)


func _build_dialogue() -> void:
	_dialogue = PanelContainer.new()
	_dialogue.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_dialogue.offset_left = 110
	_dialogue.offset_right = -110
	_dialogue.offset_top = -340
	_dialogue.offset_bottom = -60
	_dialogue.add_theme_stylebox_override("panel", _style(Color(0.035, 0.1, 0.12, 0.98), GOLD, 1, 22))
	root.add_child(_dialogue)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	_dialogue.add_child(row)
	_dialogue_portrait = TextureRect.new()
	_dialogue_portrait.custom_minimum_size = Vector2(128, 128)
	_dialogue_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_dialogue_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	row.add_child(_dialogue_portrait)
	var words := VBoxContainer.new()
	words.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(words)
	_dialogue_name = _label("林恩", 23, GOLD)
	words.add_child(_dialogue_name)
	_dialogue_text = _label("", 22)
	_dialogue_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_dialogue_text.size_flags_vertical = Control.SIZE_EXPAND_FILL
	words.add_child(_dialogue_text)
	var controls := HBoxContainer.new()
	_dialogue_controls = controls
	words.add_child(controls)
	_dialogue_count = _label("", 16, MUTED)
	_dialogue_count.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	controls.add_child(_dialogue_count)
	_dialogue_next_button = _button("继续", _advance_dialogue, 120)
	controls.add_child(_dialogue_next_button)
	_dialogue_choices = HBoxContainer.new()
	_dialogue_choices.add_theme_constant_override("separation", 10)
	words.add_child(_dialogue_choices)
	_dialogue_choices.visible = false
	_dialogue.visible = false


func _build_modal() -> void:
	modal_shade = ColorRect.new()
	modal_shade.color = Color(0.012, 0.035, 0.044, 0.77)
	modal_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(modal_shade)
	modal_center = CenterContainer.new()
	modal_center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(modal_center)
	modal_shade.visible = false
	modal_center.visible = false


func _build_chapter_banner() -> void:
	var anchor := CenterContainer.new()
	anchor.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	anchor.offset_top = 205
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(anchor)
	_chapter_box = PanelContainer.new()
	_chapter_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chapter_box.add_theme_stylebox_override("panel", _style(Color(0.04, 0.14, 0.15, 0.9), Color("b59055"), 1, 18))
	anchor.add_child(_chapter_box)
	_chapter_label = _label("", 26, GOLD)
	_chapter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chapter_box.add_child(_chapter_label)
	_chapter_box.visible = false


func _sync_status(status: String) -> void:
	_dialogue.visible = status == "dialogue"
	if status != "dialogue":
		_dialogue_key = ""
	match status:
		"ready":
			_show_title()
		"lost":
			_show_death()
		"won":
			_show_ending()
		"paused":
			if menu.is_empty():
				_show_pause()
		"playing":
			if menu in ["title", "slots", "overwrite", "death", "ending", "pause"]:
				_hide_modal()
		"dialogue":
			_hide_modal()


func _update_dialogue(delta: float) -> void:
	var lines: Array = model.get("dialogue_lines")
	var index: int = int(model.get("dialogue_index"))
	if lines.is_empty() or index < 0 or index >= lines.size():
		return
	var speaker := str(model.get("dialogue_speaker"))
	var text := str(lines[index])
	var key := "%s/%d/%s" % [speaker, index, text]
	if key != _dialogue_key:
		_dialogue_key = key
		_typewriter = 0.0
		_dialogue_text.text = text
		_dialogue_text.visible_characters = 0
		_dialogue_name.text = _speaker_name(speaker)
		var portrait_key := _speaker_key(speaker)
		_dialogue_portrait.texture = Art.portrait(portrait_key)
		_dialogue_count.text = "%d / %d" % [index + 1, lines.size()]
	_typewriter += delta * 44.0
	_dialogue_text.visible_characters = int(_typewriter)
	_update_dialogue_choices(lines, index)


func _advance_dialogue() -> void:
	if model == null or str(model.get("status")) != "dialogue":
		return
	if _dialogue_text.visible_characters >= 0 and _dialogue_text.visible_characters < _dialogue_text.text.length():
		_typewriter = float(_dialogue_text.text.length())
		_dialogue_text.visible_characters = -1
	else:
		var choices: Variant = model.get("dialogue_choices")
		var lines: Array = model.get("dialogue_lines")
		if choices is Array and not choices.is_empty() and int(model.get("dialogue_index")) == lines.size() - 1:
			_update_dialogue_choices(lines, int(model.get("dialogue_index")))
			return
		_request("next_dialogue")


func _open_journey_menu(which: String) -> void:
	if str(model.get("status")) not in ["paused", "ready"]:
		_request("pause")
	match which:
		"journal": _show_journal()
		"map": _show_world_map()
		"inventory": _show_inventory()
		"settings": _show_settings()
		"shop": _show_shop()
		_: _show_pause()


func _close_menu() -> void:
	_hide_modal()
	_request("resume")
	if str(model.get("status")) == "dialogue":
		if _dialogue_choices.visible:
			for child: Node in _dialogue_choices.get_children():
				if child is Button and not child.disabled:
					child.call_deferred("grab_focus")
					break
		else:
			_dialogue_next_button.call_deferred("grab_focus")


func _hide_modal() -> void:
	menu = ""
	_active_puzzle = ""
	_puzzle_panel = null
	_puzzle_exit = null
	waiting_rebind = ""
	modal_shade.visible = false
	modal_center.visible = false
	if modal_panel != null:
		modal_panel.queue_free()
		modal_panel = null


func _panel(which: String, title: String, width: float = 690.0) -> VBoxContainer:
	if modal_panel != null:
		modal_panel.queue_free()
	menu = which
	modal_shade.visible = true
	modal_center.visible = true
	modal_panel = PanelContainer.new()
	modal_panel.custom_minimum_size.x = minf(width, root.get_rect().size.x - 80.0)
	modal_center.add_child(modal_panel)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 14)
	modal_panel.add_child(content)
	var heading := _label(title, 30, GOLD)
	content.add_child(heading)
	var divider := HSeparator.new()
	divider.modulate = Color("8e784b")
	content.add_child(divider)
	_modal_focus = null
	return content


func _focus_first() -> void:
	if _modal_focus != null and is_instance_valid(_modal_focus) and (not _modal_focus is BaseButton or not _modal_focus.disabled):
		_modal_focus.call_deferred("grab_focus")
	elif modal_panel != null:
		_focus_available(modal_panel)


func _show_title() -> void:
	_settings_suspended = true
	var content := _panel("title", "暮光之森", 560)
	var subtitle := _label("L U M E N F A L L", 18, MUTED)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(subtitle)
	var words := _label("为后来的人，留一盏灯。", 23)
	words.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	words.custom_minimum_size.y = 58
	content.add_child(words)
	content.add_child(_button("开始新的旅程", func(): _show_slots("new")))
	var has_save := false
	for save: Dictionary in _saves():
		if not save.is_empty():
			has_save = true
	var continue_button := _button("继续旅程", func(): _show_slots("continue"))
	continue_button.disabled = not has_save
	content.add_child(continue_button)
	content.add_child(_button("设置", _show_settings))
	content.add_child(_button("退出", func(): _request("quit")))
	content.add_child(_label("单人旅程 · 键盘与手柄均可使用", 16, MUTED))
	_focus_first()


func _show_slots(mode: String) -> void:
	slot_mode = mode
	var content := _panel("slots", "选择旅途记录" if mode == "continue" else "新的旅途 · 选择记录位置", 760)
	var records := _saves()
	var notice := str(controller.get("save_notice")) if controller != null else ""
	if mode == "continue" and notice.contains("无法"):
		content.add_child(_wrapped(notice, 19, Color("e4a87c")))
	for index in range(3):
		var slot: int = index
		var record: Dictionary = records[index] if index < records.size() else {}
		var row := HBoxContainer.new()
		content.add_child(row)
		var details := VBoxContainer.new()
		details.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(details)
		details.add_child(_label("旅途 %d" % [index + 1], 23, GOLD))
		if record.is_empty():
			details.add_child(_label("尚未出发", 19, MUTED))
		else:
			var metadata: Dictionary = record.get("metadata", record)
			var map_id: int = int(metadata.get("map_id", record.get("map_id", 0)))
			var time: float = float(metadata.get("elapsed", record.get("elapsed", 0.0)))
			var chapter: int = int(metadata.get("chapter", _map_chapter(map_id)))
			details.add_child(_label("第%s章 · %s    %s" % [_chinese_number(chapter), _map_name(map_id), _format_time(time)], 19, MUTED))
		var choose := _button("继续" if mode == "continue" else "在此开始", func(): _select_slot(slot), 130)
		choose.disabled = mode == "continue" and record.is_empty()
		row.add_child(choose)
	content.add_child(_button("返回", _show_title))
	_focus_first()


func _select_slot(slot: int) -> void:
	selected_save = slot
	if slot_mode == "continue":
		_hide_modal()
		_request("continue", slot)
		if str(model.get("status")) == "ready":
			_show_slots("continue")
		return
	var records := _saves()
	var record: Dictionary = records[slot] if slot < records.size() else {}
	if not record.is_empty():
		var content := _panel("overwrite", "重新开始这段旅途？", 650)
		content.add_child(_wrapped("旅途 %d 已有记录。重新出发会替换这个位置的旧记录。" % [slot + 1], 22))
		content.add_child(_button("保留旧记录", func(): _show_slots("new")))
		content.add_child(_button("确认重新出发", func(): _start_new(slot)))
		_focus_first()
	else:
		_start_new(slot)


func _start_new(slot: int) -> void:
	_hide_modal()
	_last_chapter = -1
	_request("new", slot)


func _show_pause() -> void:
	_settings_suspended = false
	var content := _panel("pause", "歇一歇，灯还亮着", 590)
	content.add_child(_button("继续旅途", _close_menu))
	var row := HBoxContainer.new()
	content.add_child(row)
	for entry: Array in [["旅途日记", "journal"], ["世界地图", "map"], ["行囊与灯具", "inventory"]]:
		var action := str(entry[1])
		row.add_child(_button(str(entry[0]), func(): _open_journey_menu(action), 140))
	content.add_child(_button("保存旅途", func(): _request("save")))
	content.add_child(_button("设置", _show_settings))
	content.add_child(_button("返回标题", _confirm_return_title))
	_focus_first()


func _confirm_return_title() -> void:
	var content := _panel("return_title", "暂别这段旅途", 600)
	content.add_child(_wrapped("将保存当前旅途，再返回标题。", 22))
	content.add_child(_button("继续留在这里", _show_pause))
	content.add_child(_button("保存并返回标题", func(): _request("title")))
	_focus_first()


func _show_journal() -> void:
	var content := _panel("journal", "守灯人的旅途日记", 930)
	var tabs := HBoxContainer.new()
	content.add_child(tabs)
	var quests_button := _button("任务", func(): _select_journal_tab("quests"), 160)
	var records_button := _button("调查记录", func(): _select_journal_tab("records"), 160)
	tabs.add_child(quests_button)
	tabs.add_child(records_button)
	_modal_focus = quests_button if _journal_tab == "quests" else records_button
	_record_buttons.clear()
	_record_detail = null
	_record_detail_scroll = null
	if _journal_tab == "records":
		_build_journal_records(content)
	else:
		_build_journal_quests(content)
	content.add_child(_button("返回旅途", _close_menu))
	_focus_first()


func _build_journal_quests(content: VBoxContainer) -> void:
	var scroll := _scroll(content, 350)
	var info: Dictionary = model.call("map_info")
	var chapter: int = clampi(int(info.get("chapter", 1)), 1, 5)
	scroll.add_child(_label("第%s章 · %s" % [_chinese_number(chapter), CHAPTER_NAMES[chapter - 1]], 24))
	var progress: Variant = model.call("objective_progress")
	var main_card := _card(scroll, "正在寻找 · %s" % str(model.call("objective_text")))
	main_card.add_child(_wrapped("当前地点：%s。留意暖色灯火、旧路标和导师的修补痕迹。" % str(info.get("name", "")), 20, MUTED))
	if progress is Vector2i or progress is Vector2:
		main_card.add_child(_label("已完成 %d / %d" % [int(progress.x), int(progress.y)], 18, GOLD))
	var entries: Array = model.call("quest_log")
	for value: Variant in entries:
		if not value is Dictionary:
			continue
		var quest: Dictionary = value
		if str(quest.get("id", "")) == "main":
			continue
		var completed := bool(quest.get("completed", false))
		var title := str(quest.get("title", "沿途的故事"))
		var card := _card(scroll, ("已完成 · " if completed else "沿途 · ") + title)
		card.add_child(_wrapped(str(quest.get("description", "")), 19, MUTED))
		var total: int = int(quest.get("total", 0))
		if total > 0:
			card.add_child(_label("%d / %d" % [int(quest.get("progress", 0)), total], 17, GOLD))


func _build_journal_records(content: VBoxContainer) -> void:
	var records: Array = model.call("journal_records") if model.has_method("journal_records") else []
	var row := HBoxContainer.new()
	row.custom_minimum_size.y = 350
	row.add_theme_constant_override("separation", 18)
	content.add_child(row)
	if records.is_empty():
		_selected_record = ""
		row.add_child(_wrapped("还没有调查记录。读过的笔记、修好的灯路，会留在这里，随时都能翻看。", 22, MUTED))
		return
	var selected: Dictionary = {}
	for value: Variant in records:
		if value is Dictionary and str(value.get("id", "")) == _selected_record:
			selected = value
	if selected.is_empty():
		selected = records[0]
		_selected_record = str(selected.get("id", ""))
	var list_scroll := ScrollContainer.new()
	list_scroll.custom_minimum_size = Vector2(265, 350)
	list_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_scroll.follow_focus = true
	row.add_child(list_scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 7)
	list_scroll.add_child(list)
	var last_map := ""
	for value: Variant in records:
		if not value is Dictionary:
			continue
		var record: Dictionary = value
		var map_name := str(record.get("map_name", "沿途"))
		if map_name != last_map:
			list.add_child(_label(map_name, 17, GOLD))
			last_map = map_name
		var record_id := str(record.get("id", ""))
		var button := _button("", func(): _select_journal_record(record_id), 0)
		button.custom_minimum_size.y = 68
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.tooltip_text = str(record.get("title", "调查记录"))
		list.add_child(button)
		var title := _label(("◆ " if record_id == _selected_record else "") + str(record.get("title", "调查记录")), 19)
		title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		title.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		title.offset_left = 12
		title.offset_right = -12
		title.offset_top = 8
		title.offset_bottom = -8
		button.add_child(title)
		_record_buttons[record_id] = button
	_record_detail_scroll = ScrollContainer.new()
	_record_detail_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_record_detail_scroll.custom_minimum_size.y = 350
	_record_detail_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(_record_detail_scroll)
	_record_detail = VBoxContainer.new()
	_record_detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_record_detail.add_theme_constant_override("separation", 12)
	_record_detail_scroll.add_child(_record_detail)
	_record_detail.add_child(_wrapped(str(selected.get("title", "调查记录")), 24, GOLD))
	_record_detail.add_child(_label(str(selected.get("map_name", "")), 17, MUTED))
	var divider := HSeparator.new()
	divider.modulate = Color("8e784b")
	_record_detail.add_child(divider)
	for line: Variant in selected.get("lines", []):
		_record_detail.add_child(_wrapped(str(line), 20))
	_record_detail.add_child(_wrapped("翻看记录不会改变任务进度。", 17, MUTED))


func _select_journal_tab(tab: String) -> void:
	_journal_tab = tab
	_show_journal()


func _select_journal_record(id: String) -> void:
	_selected_record = id
	_show_journal()
	if _record_buttons.has(id):
		var button: Button = _record_buttons[id]
		button.call_deferred("grab_focus")


func _show_world_map() -> void:
	var content := _panel("map", "灯火相连的地方", 970)
	content.add_child(_wrapped("沿着修好的灯路，可以回到已经到过的地方。尚未打通的道路会继续留在雾中。", 20, MUTED))
	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 24)
	content.add_child(columns)
	var map_grid := GridContainer.new()
	map_grid.columns = 3
	map_grid.add_theme_constant_override("h_separation", 8)
	map_grid.add_theme_constant_override("v_separation", 8)
	map_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_child(map_grid)
	for index in range(MAP_NAMES.size()):
		var target: int = index
		var current := target == int(model.get("map_id"))
		var available: bool = bool(model.call("can_travel", target))
		var flags: Dictionary = model.get("flags")
		var known := bool(flags.get("visited:" + str(target), false))
		var text := ("◆ " if current else "") + str(MAP_NAMES[index])
		var button := _button(text, func(): _select_map(target), 165)
		button.custom_minimum_size.y = 48
		button.add_theme_font_size_override("font_size", 18)
		if not known and not available and not current:
			button.modulate = Color("728985")
		map_grid.add_child(button)
	var details := VBoxContainer.new()
	details.custom_minimum_size.x = 255
	columns.add_child(details)
	if selected_travel < 0:
		selected_travel = int(model.get("map_id"))
	var can_go: bool = bool(model.call("can_travel", selected_travel))
	var chapter := _map_chapter(selected_travel)
	var flags: Dictionary = model.get("flags")
	var known := bool(flags.get("visited:" + str(selected_travel), false))
	details.add_child(_label(_map_name(selected_travel), 26, GOLD))
	details.add_child(_label("第%s章 · %s" % [_chinese_number(chapter), CHAPTER_NAMES[chapter - 1]], 18, MUTED))
	details.add_child(_wrapped("灯火村是旅途的归处，阿芙与小禾仍在等你。" if selected_travel == 0 else ("这里的灯路已经打通，可以沿光回访。" if can_go else ("这里已记在日记中。走到出口或篝火旁，再沿灯路前往。" if known else "先沿主线继续前行，修好通向这里的灯路。")), 21))
	var travel_button := _button("沿灯路前往", func(): _travel_to(selected_travel))
	travel_button.disabled = not can_go or selected_travel == int(model.get("map_id"))
	details.add_child(travel_button)
	content.add_child(_button("返回旅途", _close_menu))
	_focus_first()


func _select_map(target: int) -> void:
	selected_travel = target
	_show_world_map()


func _travel_to(target: int) -> void:
	if not bool(model.call("can_travel", target)):
		show_toast("这里的灯路还没有打通。")
		return
	_hide_modal()
	_request("travel", target)
	_request("resume")


func _show_inventory() -> void:
	var content := _panel("inventory", "行囊与灯具", 960)
	content.add_child(_label("恢复药 %d    灯屑 %d    生命上限 %d" % [int(model.get("potions")), int(model.get("coins")), int(model.get("max_health"))], 22, GOLD))
	var scroll := _scroll(content, 365)
	var columns := HBoxContainer.new()
	scroll.add_child(columns)
	var lantern_column := VBoxContainer.new()
	lantern_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_child(lantern_column)
	lantern_column.add_child(_label("我的灯具", 24, GOLD))
	lantern_column.add_child(_wrapped("铜灯一直在左手。举灯照亮旧机关，能力会随着旅途逐一醒来。", 20, MUTED))
	var abilities: Array = model.get("abilities")
	for id: String in ABILITY_NAMES:
		var unlocked := abilities.has(id)
		var card := _card(lantern_column, str(ABILITY_NAMES[id]) + (" · 已唤醒" if unlocked else " · 尚未唤醒"))
		card.add_child(_wrapped(str(ABILITY_DESCRIPTIONS[id]) if unlocked else "继续寻找导师留下的修复线索。", 19, MUTED))
	var charm_column := VBoxContainer.new()
	charm_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_child(charm_column)
	charm_column.add_child(_label("旅途护符", 24, GOLD))
	charm_column.add_child(_wrapped("在篝火旁整理两个护符槽，两枚护符的效果共同生效。", 20, MUTED))
	var owned: Array = model.get("owned_charms")
	var equipped_slots := _equipped_slots()
	var slot_row := HBoxContainer.new()
	charm_column.add_child(slot_row)
	for slot in range(2):
		var slot_index: int = slot
		var slot_id := str(equipped_slots[slot])
		var name := str(CHARM_NAMES.get(slot_id, "未佩戴"))
		var text := ("◆ " if slot == active_charm_slot else "") + "槽%s · %s" % [_chinese_number(slot + 1), name]
		var slot_button := _button(text, func(): _select_charm_slot(slot_index), 0)
		slot_button.add_theme_font_size_override("font_size", 16)
		slot_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		slot_row.add_child(slot_button)
	var unequip_button := _button("卸下当前槽的护符", func(): _equip_charm("", active_charm_slot), 0)
	unequip_button.disabled = str(equipped_slots[active_charm_slot]).is_empty()
	unequip_button.add_theme_font_size_override("font_size", 17)
	charm_column.add_child(unequip_button)
	for id: String in CHARM_NAMES:
		var charm_id := id
		var in_selected_slot := str(equipped_slots[active_charm_slot]) == id
		var in_other_slot := str(equipped_slots[1 - active_charm_slot]) == id
		var card := _card(charm_column, str(CHARM_NAMES[id]) + (" · 佩戴中" if in_selected_slot or in_other_slot else ""))
		card.add_child(_wrapped(_charm_description(id), 18, MUTED))
		var button_text := "已在当前槽" if in_selected_slot else (("移至当前槽" if in_other_slot else "佩戴至当前槽") if owned.has(id) else "尚未获得")
		var button := _button(button_text, func(): _equip_charm(charm_id, active_charm_slot), 0)
		button.add_theme_font_size_override("font_size", 17)
		var info: Dictionary = model.call("map_info")
		var camp: Vector2 = info.get("camp", Vector2.ZERO)
		var position: Vector2 = model.get("player_position")
		button.disabled = not owned.has(id) or in_selected_slot or position.distance_to(camp) > 2.2
		card.add_child(button)
	content.add_child(_button("返回旅途", _close_menu))
	_focus_first()


func _equip_charm(id: String, slot: int = -1) -> void:
	_request("equip", {"charm_id": id, "slot": active_charm_slot if slot < 0 else slot})
	_show_inventory()


func _show_shop() -> void:
	var content := _panel("shop", "阿芙的行路铺", 820)
	content.add_child(_wrapped("“东西不多，够你安心走下一段路。灯油记得留一点。”", 22))
	content.add_child(_label("持有灯屑  %d" % int(model.get("coins")), 22, GOLD))
	var products := _scroll(content, 360)
	var potion_card := _card(products, "恢复药 · 8 灯屑")
	potion_card.add_child(_wrapped("恢复生命。路上先找安全的地方，再打开药瓶。", 20, MUTED))
	var potion_button := _button("购买恢复药", func(): _buy_item("potion"))
	potion_button.disabled = int(model.get("coins")) < 8 or int(model.get("potions")) >= 3
	potion_card.add_child(potion_button)
	var owned: Array = model.get("owned_charms")
	for id: String in CHARM_NAMES:
		var charm_id := id
		var price: int = _charm_price(id)
		var card := _card(products, "%s · %d 灯屑" % [str(CHARM_NAMES[id]), price])
		card.add_child(_wrapped(_charm_description(id), 18, MUTED))
		var buy_button := _button("已在行囊中" if owned.has(id) else "购买护符", func(): _buy_item(charm_id))
		buy_button.disabled = owned.has(id) or int(model.get("coins")) < price
		card.add_child(buy_button)
	content.add_child(_button("收好行囊", _close_menu))
	_focus_first()


func _buy_item(id: String) -> void:
	_request("buy", id)
	_show_shop()


func _show_settings() -> void:
	var content := _panel("settings", "把旅途调到舒服的样子", 830)
	var settings := _settings()
	var scroll := _scroll(content, 350)
	var difficulty_row := _setting_row(scroll, "旅途难度")
	var difficulty := OptionButton.new()
	for label_text: String in ["故事 · 从容探索", "标准 · 留意灯火", "挑战 · 谨慎前行"]:
		difficulty.add_item(label_text)
	var difficulty_ids := ["story", "standard", "challenge"]
	var current_difficulty := str(model.get("difficulty")) if str(model.get("status")) != "ready" else str(settings.get("difficulty", "standard"))
	difficulty.select(maxi(0, difficulty_ids.find(current_difficulty)))
	difficulty.item_selected.connect(func(index: int): _request("difficulty", difficulty_ids[index]))
	difficulty_row.add_child(difficulty)
	var volume_row := _setting_row(scroll, "主音量")
	var volume := HSlider.new()
	volume.min_value = 0.0
	volume.max_value = 1.0
	volume.step = 0.05
	volume.value = float(settings.get("volume", 0.75))
	volume.custom_minimum_size.x = 270
	volume.value_changed.connect(func(value: float): _request("volume", value))
	volume_row.add_child(volume)
	var text_row := _setting_row(scroll, "文字大小")
	var text_size := OptionButton.new()
	for label_text: String in ["舒适", "稍大", "更大"]:
		text_size.add_item(label_text)
	text_size.select(0 if _text_scale < 1.08 else (1 if _text_scale < 1.2 else 2))
	text_size.item_selected.connect(func(index: int): _change_text_scale([1.0, 1.12, 1.25][index]))
	text_row.add_child(text_size)
	var quality_row := _setting_row(scroll, "画面细节")
	var quality := OptionButton.new()
	quality.add_item("简洁")
	quality.add_item("细腻")
	quality.select(0 if str(settings.get("quality", "high")) == "low" else 1)
	quality.item_selected.connect(func(index: int): _request("quality", "low" if index == 0 else "high"))
	quality_row.add_child(quality)
	scroll.add_child(_label("键盘操作 · 点击动作后按下新的按键", 21, GOLD))
	var input_grid := GridContainer.new()
	input_grid.columns = 3
	input_grid.add_theme_constant_override("h_separation", 8)
	input_grid.add_theme_constant_override("v_separation", 8)
	scroll.add_child(input_grid)
	for action: String in INPUT_LABELS:
		var bind_action := action
		var label_text := str(INPUT_LABELS[action]) + "  [" + _key_name(action) + "]"
		var button := _button(label_text, func(): _begin_rebind(bind_action), 215)
		button.add_theme_font_size_override("font_size", 18)
		input_grid.add_child(button)
	scroll.add_child(_wrapped("方向键与菜单确认、返回始终可用。手柄左摇杆移动，方向键切换菜单。", 17, MUTED))
	content.add_child(_button("恢复默认按键", func(): _request("reset_bindings"); _show_settings()))
	content.add_child(_button("返回", _show_title if _settings_suspended else _show_pause))
	_focus_first()


func _begin_rebind(action: String) -> void:
	waiting_rebind = action
	var content := _panel("rebind", "为“%s”选择按键" % str(INPUT_LABELS.get(action, action)), 640)
	content.add_child(_wrapped("按下想使用的键。按 Esc 取消。若按键已用于其他动作，将交换两个动作的按键。", 22))
	content.add_child(_button("取消", func(): waiting_rebind = ""; _show_settings()))
	_focus_first()


func _change_text_scale(scale: float) -> void:
	_text_scale = scale
	_apply_text_scale()
	_request("text_scale", scale)


func _apply_text_scale() -> void:
	if _theme != null:
		_theme.default_font_size = int(22.0 * _text_scale)
		_theme.set_font_size("font_size", "Button", int(22.0 * _text_scale))
		_theme.set_font_size("font_size", "OptionButton", int(21.0 * _text_scale))
		_theme.set_font_size("font_size", "PopupMenu", int(20.0 * _text_scale))
	if root != null:
		_scale_labels(root)


func _show_death() -> void:
	var content := _panel("death", "灯火暂歇", 650)
	content.add_child(_wrapped("林恩在最近点亮的篝火边醒来。修好的道路、沿途的收获和旅途记录都还在。", 23))
	content.add_child(_button("回到篝火，继续前行", func(): _hide_modal(); _request("retry")))
	content.add_child(_button("返回标题", func(): _request("title")))
	_focus_first()


func _show_ending() -> void:
	var content := _panel("ending", "微光归来", 790)
	var story := _scroll(content, 300)
	story.add_child(_wrapped("暮根之心的光不再急促地闪烁。林恩扶起岑灯，走上那条为后来的人留下的路。", 24))
	story.add_child(_wrapped("“原来，灯从来不需要一个人独自守着。”\n\n清晨，灯火村的旧灯一盏接一盏亮起。阿芙备好了热汤，小禾在门前画下新的路标。林恩的铜灯仍在左手，里面的火焰安静而明亮。", 22))
	story.add_child(_label("旅途时间  %s" % _format_time(float(model.get("elapsed"))), 20, GOLD))
	var entries: Array = model.call("quest_log")
	var complete := 0
	for entry: Variant in entries:
		if entry is Dictionary and str(entry.get("id", "")) != "main" and bool(entry.get("completed", false)):
			complete += 1
	story.add_child(_label("沿途的故事  %d / 8" % complete, 20, MUTED))
	story.add_child(_wrapped("还有想看的路、想见的人，林恩都可以沿着点亮的灯路继续寻找。", 19, MUTED))
	story.add_child(_label("感谢你陪林恩走到这里。", 18, MUTED))
	content.add_child(_button("继续探索，完成余下的约定", func(): _hide_modal(); _request("continue_exploring")))
	content.add_child(_button("把这段旅途留在灯中 · 返回标题", func(): _request("save"); _request("title")))
	_focus_first()


func _update_hint() -> void:
	if _dialogue_next_button != null:
		_dialogue_next_button.text = "继续 · 南面键" if _gamepad else "继续  [%s]" % _key_name("interact")
	if _gamepad:
		_hint.text = "左摇杆 移动    西面键 普攻    东面键 闪避    左肩 举灯    南面键 交互    北面键 光脉冲    菜单 暂停"
	else:
		var movement := "%s%s%s%s" % [_key_name("move_up"), _key_name("move_left"), _key_name("move_down"), _key_name("move_right")]
		_hint.text = "%s 移动    %s 普攻    %s 闪避    %s 举灯    %s 交互    %s 恢复药    Esc 暂停" % [movement, _key_name("attack"), _key_name("dash"), _key_name("lantern"), _key_name("interact"), _key_name("potion")]


func _key_name(action: String) -> String:
	var aliases := {"attack": "attack_game", "dash": "dash", "lantern": "light_lantern", "interact": "interact_game", "pulse": "light_pulse", "shield": "night_shield", "potion": "use_potion"}
	var input_action := action
	if not InputMap.has_action(input_action):
		input_action = str(aliases.get(action, action))
	if InputMap.has_action(input_action):
		for event: InputEvent in InputMap.action_get_events(input_action):
			if event is InputEventKey:
				var code: int = event.physical_keycode if event.physical_keycode != 0 else event.keycode
				return "空格" if code == KEY_SPACE else OS.get_keycode_string(code)
			if event is InputEventMouseButton:
				return "鼠标左键" if event.button_index == MOUSE_BUTTON_LEFT else "鼠标键"
	var defaults := {"attack": "J", "dash": "空格", "lantern": "L", "interact": "E", "pulse": "Q", "shield": "F", "potion": "H", "journal": "Tab", "map": "M", "inventory": "I", "move_left": "A", "move_right": "D", "move_up": "W", "move_down": "S"}
	return str(defaults.get(action, "—"))


func _request(action: String, payload: Variant = null) -> void:
	action_requested.emit(action, payload)
	if action == "save" and controller != null:
		show_toast(str(controller.get("save_notice")))


func _settings() -> Dictionary:
	if controller == null:
		return {}
	var value: Variant = controller.get("settings")
	return value if value is Dictionary else {}


func _saves() -> Array:
	if controller == null:
		return [{}, {}, {}]
	var value: Variant = controller.get("saves")
	return value if value is Array else [{}, {}, {}]


func _label(text: String, font_size: int = 22, color: Color = PAPER) -> Label:
	var label := Label.new()
	label.text = text
	label.set_meta("base_font_size", font_size)
	label.add_theme_font_size_override("font_size", int(font_size * _text_scale))
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label


func _wrapped(text: String, font_size: int = 22, color: Color = PAPER) -> Label:
	var label := _label(text, font_size, color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label


func _button(text: String, callback: Callable, min_width: float = 0.0) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(min_width, 42)
	button.focus_mode = Control.FOCUS_ALL
	button.pressed.connect(callback)
	if _modal_focus == null:
		_modal_focus = button
	return button


func _bar(width: float, height: float, fill: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.custom_minimum_size = Vector2(width, height)
	bar.show_percentage = false
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_theme_stylebox_override("fill", _style(fill, fill, 0, 0))
	return bar


func _scroll(parent: Control, height: float) -> VBoxContainer:
	var container := ScrollContainer.new()
	container.custom_minimum_size.y = height
	container.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	parent.add_child(container)
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 12)
	container.add_child(content)
	return content


func _card(parent: Control, heading: String) -> VBoxContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _style(Color("15353a"), Color("476657"), 1, 12))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(panel)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 7)
	panel.add_child(content)
	content.add_child(_wrapped(heading, 21, GOLD))
	return content


func _setting_row(parent: Control, title: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	parent.add_child(row)
	var label := _label(title, 21)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)
	return row


func _speaker_key(speaker: String) -> String:
	if speaker in ["cen", "岑灯", "mentor", "keeper"]:
		return "cen"
	if speaker in ["afu", "阿芙"]:
		return "afu"
	if speaker in ["xiaohe", "小禾"]:
		return "xiaohe"
	return "lynn"


func _speaker_name(speaker: String) -> String:
	return {"lynn": "林恩", "cen": "岑灯", "afu": "阿芙", "xiaohe": "小禾"}.get(speaker, speaker)


func _map_name(id: int) -> String:
	var index: int = id
	return str(MAP_NAMES[index]) if index >= 0 and index < MAP_NAMES.size() else "灯火村"


func _map_chapter(id: int) -> int:
	var index: int = id
	if index <= 3:
		return 1
	if index <= 6:
		return 2
	if index <= 9:
		return 3
	if index <= 12:
		return 4
	return 5


func _chinese_number(number: int) -> String:
	return ["一", "二", "三", "四", "五"][clampi(number, 1, 5) - 1]


func _format_time(seconds: float) -> String:
	var minutes := int(seconds / 60.0)
	return "%d 小时 %02d 分" % [int(minutes / 60), minutes % 60]


func _scale_labels(node: Node) -> void:
	if node is Label and node.has_meta("base_font_size"):
		node.add_theme_font_size_override("font_size", int(float(node.get_meta("base_font_size")) * _text_scale))
	for child: Node in node.get_children():
		_scale_labels(child)


func _primary_keycode(action: String) -> int:
	if InputMap.has_action(action):
		for event: InputEvent in InputMap.action_get_events(action):
			if event is InputEventKey:
				return event.physical_keycode if event.physical_keycode != 0 else event.keycode
	return 0


func _focus_available(node: Node) -> bool:
	if node is BaseButton and not node.disabled and node.focus_mode != Control.FOCUS_NONE:
		node.call_deferred("grab_focus")
		return true
	for child: Node in node.get_children():
		if _focus_available(child):
			return true
	return false


func _equipped_slots() -> Array:
	var slots: Variant = model.get("equipped_charms")
	if slots is Array and slots.size() >= 2:
		return [str(slots[0]), str(slots[1])]
	return [str(model.get("equipped_charm")), ""]


func _select_charm_slot(slot: int) -> void:
	active_charm_slot = clampi(slot, 0, 1)
	_show_inventory()


func open_puzzle(id: String) -> void:
	var definition: Dictionary = PuzzleRules.definition(id)
	if definition.is_empty():
		show_toast("这处机关还没有回应。")
		return
	if str(model.get("status")) == "playing":
		_request("pause")
	_active_puzzle = id
	_puzzle_solved_before = false
	var states: Variant = model.get("puzzle_states")
	var state: Dictionary = states.get(id, PuzzleRules.initial_state(id)) if states is Dictionary else PuzzleRules.initial_state(id)
	var content := _panel("puzzle", str(definition.get("title", "旧灯机关")), 1040)
	_puzzle_panel = PuzzlePanel.new()
	content.add_child(_puzzle_panel)
	_puzzle_panel.call("setup", definition, state)
	_puzzle_panel.connect("puzzle_action", _on_puzzle_action)
	_puzzle_exit = _button("保留思路，稍后再来", _close_menu)
	content.add_child(_puzzle_exit)
	_apply_text_scale()
	var tween := create_tween()
	modal_panel.modulate.a = 0.0
	tween.tween_property(modal_panel, "modulate:a", 1.0, 0.22)


func _on_puzzle_action(action: Dictionary) -> void:
	if menu != "puzzle" or _active_puzzle.is_empty():
		return
	_request("puzzle_action", {"id": _active_puzzle, "action": action})


func _update_dialogue_choices(lines: Array, index: int) -> void:
	var choice_value: Variant = model.get("dialogue_choices")
	var choices: Array = choice_value if choice_value is Array else []
	var final_line := index == lines.size() - 1
	var text_finished := _dialogue_text.visible_characters < 0 or _dialogue_text.visible_characters >= _dialogue_text.text.length()
	var can_choose := not choices.is_empty() and final_line and text_finished
	_dialogue_choices.visible = can_choose
	_dialogue_next_button.visible = not can_choose
	_dialogue.offset_top = -420 if can_choose else -340
	if not can_choose:
		_choice_key = ""
		return
	var signature := _dialogue_key + JSON.stringify(choices)
	if signature == _choice_key:
		return
	_choice_key = signature
	for old: Node in _dialogue_choices.get_children():
		old.queue_free()
	var first: Button
	for item: Variant in choices:
		if not item is Dictionary:
			continue
		var choice: Dictionary = item
		var id := str(choice.get("id", ""))
		var button := _button("", func(): _request("choose_choice", id), 0)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.custom_minimum_size.y = 100
		_dialogue_choices.add_child(button)
		var label := _label(str(choice.get("text", "")), 19)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		label.offset_left = 10
		label.offset_right = -10
		label.offset_top = 8
		label.offset_bottom = -8
		button.add_child(label)
		if first == null:
			first = button
	_dialogue_count.text = "选择林恩的回答"
	if first != null:
		first.call_deferred("grab_focus")


func _charm_description(id: String) -> String:
	for charm: Dictionary in Content.charms():
		if str(charm.get("id", "")) == id:
			return str(charm.get("description", ""))
	return str(CHARM_DESCRIPTIONS.get(id, ""))


func _charm_price(id: String) -> int:
	for charm: Dictionary in Content.charms():
		if str(charm.get("id", "")) == id:
			return int(charm.get("price", 0))
	return int(CHARM_PRICES.get(id, 0))
