extends Control
## Tangible light puzzles. The rules own progress and rewards; this view owns no answers.
signal puzzle_action(action: Dictionary)

const Rules = preload("res://scripts/puzzle_rules.gd")
const PAPER := Color("efe9d2")
const GOLD := Color("dbad64")
const MUTED := Color("91afa4")
const TYPE_NAMES := {"mirror": "转动镜片，让光抵达灯座", "balance": "调节灯阀，让光流恢复平衡", "runes": "观察纹样，续起旧记忆", "network": "接通灯网，避开互相排斥的节点"}

var definition: Dictionary = {}
var puzzle_id := ""
var state: Dictionary = {}
var feedback: Dictionary = {}
var _state_key := ""
var _board: LightBoard
var _status: Label
var _readout: Label
var _hint: Label
var _hint_button: Button
var _rune_chain: Label
var _valves: Array[VSlider] = []
var _buttons: Array[Button] = []
var _valve_labels: Array[Label] = []
var _synchronizing := false
var _show_hint := false


func setup(new_definition: Dictionary, new_state: Dictionary) -> void:
	definition = new_definition.duplicate(true)
	puzzle_id = str(definition.get("id", ""))
	custom_minimum_size = Vector2(870, 350)
	var row := HBoxContainer.new()
	row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	row.add_theme_constant_override("separation", 22)
	add_child(row)
	var display := VBoxContainer.new()
	display.custom_minimum_size.x = 470
	display.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(display)
	_board = LightBoard.new()
	_board.definition = definition
	_board.custom_minimum_size = Vector2(450, 300)
	_board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	display.add_child(_board)
	_build_interactions()
	var sidebar := ScrollContainer.new()
	sidebar.custom_minimum_size.x = 335
	sidebar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sidebar.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	row.add_child(sidebar)
	var explanation := VBoxContainer.new()
	explanation.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sidebar.add_child(explanation)
	explanation.add_child(_label(str(TYPE_NAMES.get(str(definition.get("type", "")), "让沉睡的机关重新亮起")), 21, GOLD))
	explanation.add_child(_label(str(definition.get("description", "")), 19, MUTED))
	var divider := HSeparator.new()
	divider.modulate = Color("8e784b")
	explanation.add_child(divider)
	explanation.add_child(_label("留下的线索", 19, GOLD))
	explanation.add_child(_label(str(definition.get("clue", "")), 20, PAPER))
	_readout = _label("", 18, MUTED)
	explanation.add_child(_readout)
	_status = _label("", 20, GOLD)
	explanation.add_child(_status)
	_hint_button = Button.new()
	_hint_button.text = "再观察一点"
	_hint_button.pressed.connect(_toggle_hint)
	explanation.add_child(_hint_button)
	_hint = _label("", 18, MUTED)
	_hint.visible = false
	explanation.add_child(_hint)
	refresh_state(new_state)
	call_deferred("_focus_interaction")


func refresh_state(new_state: Dictionary) -> void:
	var signature := JSON.stringify(new_state)
	if signature == _state_key:
		return
	_state_key = signature
	state = new_state.duplicate(true)
	feedback = Rules.view(puzzle_id, state)
	_board.state = state
	_board.feedback = feedback
	_board.queue_redraw()
	var solved := bool(feedback.get("solved", false))
	_status.text = "旧机关亮起来了。灯路已经续好。" if solved else "慢慢观察，铜灯会给出回应。"
	_synchronizing = true
	for button: Button in _buttons:
		button.disabled = solved
	var kind := str(definition.get("type", ""))
	var config: Dictionary = definition.get("config", {})
	match kind:
		"mirror":
			_readout.text = "光已抵达灯座。" if bool(feedback.get("beam_reached", false)) else ("光在镜片间绕回来了。" if bool(feedback.get("cycle", false)) else "沿着金色的光，观察它在哪里停下。")
		"balance":
			var values: Array = feedback.get("valves", state.get("valves", []))
			for index in range(_valves.size()):
				var value: int = int(values[index]) if index < values.size() else 0
				_valves[index].set_value_no_signal(value)
				_valves[index].editable = not solved
				var weights: Array = config.get("weights", [1, 1, 1])
				_valve_labels[index].text = ["左阀", "中阀", "右阀"][index] + " · %d 格\n每格供光 %d" % [value, int(weights[index])]
			_readout.text = "总光量  %d / %d\n两侧光差  %d / %d" % [int(feedback.get("power_total", 0)), int(config.get("total", 0)), int(feedback.get("power_difference", 0)), int(config.get("difference", 0))]
		"runes":
			var chosen: Array = feedback.get("chosen", state.get("chosen", []))
			var symbols: PackedStringArray = []
			for symbol: Variant in chosen:
				symbols.append(_symbol_name(str(symbol)))
			_rune_chain.text = "  →  ".join(symbols) if not symbols.is_empty() else "等待第一道纹样"
			_readout.text = "已刻下 %d / %d 道纹样" % [chosen.size(), int(feedback.get("expected_length", 0))]
			if bool(feedback.get("complete", false)) and not solved:
				_status.text = "纹样还没有共鸣。看看线索里先后相接的景象。"
		"network":
			var lit: Array = feedback.get("lit", [])
			var glowing := 0
			for value: Variant in lit:
				if bool(value):
					glowing += 1
			_readout.text = "已有 %d 盏灯亮起。灯座旁的小点标记应当保留的光。" % glowing
			if bool(feedback.get("dangerous", false)):
				_status.text = "红色连线正在相斥，先分开这两处光。"
	_synchronizing = false
	if _show_hint:
		_hint.text = str(Rules.hint(puzzle_id, state))


func is_complete() -> bool:
	return bool(feedback.get("solved", false))


func _build_interactions() -> void:
	var kind := str(definition.get("type", ""))
	var config: Dictionary = definition.get("config", {})
	match kind:
		"mirror":
			var cells: Array = config.get("cells", [])
			for index in range(cells.size()):
				var mirror_index: int = index
				var button := _overlay_button("转动这枚镜片", func(): _emit({"kind": "rotate", "index": mirror_index}))
				_board.add_child(button)
				_board.mirror_buttons.append(button)
		"balance":
			for index in range(3):
				var valve_index: int = index
				var slider := VSlider.new()
				slider.min_value = 0
				slider.max_value = int(config.get("max_power", 6))
				slider.step = 1
				slider.custom_minimum_size = Vector2(28, 192)
				slider.value_changed.connect(func(value: float): _change_valve(valve_index, int(value)))
				_board.add_child(slider)
				_board.valve_sliders.append(slider)
				_valves.append(slider)
				var label := _label("", 16, GOLD)
				label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				_board.add_child(label)
				_board.valve_labels.append(label)
				_valve_labels.append(label)
		"runes":
			var symbols: Array = config.get("symbols", [])
			for symbol: Variant in symbols:
				var symbol_id := str(symbol)
				var button := _overlay_button(_symbol_name(symbol_id), func(): _emit({"kind": "choose", "symbol": symbol_id}))
				var name_label := _label(_symbol_name(symbol_id), 18, PAPER)
				name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				name_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
				name_label.offset_top = -40
				name_label.offset_bottom = -5
				button.add_child(name_label)
				_board.add_child(button)
				_board.rune_buttons.append(button)
			_rune_chain = _label("", 18, GOLD)
			_rune_chain.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			_board.add_child(_rune_chain)
			_board.rune_chain = _rune_chain
			var undo := Button.new()
			undo.text = "收回上一道"
			undo.pressed.connect(func(): _emit({"kind": "undo"}))
			_board.add_child(undo)
			_board.rune_undo = undo
			_buttons.append(undo)
			var clear := Button.new()
			clear.text = "重新刻纹"
			clear.pressed.connect(func(): _emit({"kind": "clear"}))
			_board.add_child(clear)
			_board.rune_clear = clear
			_buttons.append(clear)
		"network":
			var switches: Array = config.get("effects", [])
			for index in range(switches.size()):
				var switch_index: int = index
				var button := _overlay_button("拨动这枚铜环", func(): _emit({"kind": "toggle", "index": switch_index}))
				_board.add_child(button)
				_board.network_buttons.append(button)
			var labels: Array = config.get("node_labels", ["岸灯", "枝灯", "门灯", "芯灯"])
			for label_text: Variant in labels:
				var label := _label(str(label_text), 17, MUTED)
				label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				_board.add_child(label)
				_board.network_node_labels.append(label)
	_board.resized.connect(_board.layout_controls)
	_board.call_deferred("layout_controls")


func _overlay_button(hint_text: String, callback: Callable) -> Button:
	var button := Button.new()
	button.tooltip_text = hint_text
	button.focus_mode = Control.FOCUS_ALL
	var empty := StyleBoxEmpty.new()
	button.add_theme_stylebox_override("normal", empty)
	var focus := StyleBoxFlat.new()
	focus.bg_color = Color(0.95, 0.73, 0.36, 0.12)
	focus.border_color = GOLD
	focus.set_border_width_all(2)
	focus.set_corner_radius_all(3)
	button.add_theme_stylebox_override("focus", focus)
	button.add_theme_stylebox_override("hover", focus)
	button.add_theme_stylebox_override("pressed", focus)
	button.add_theme_stylebox_override("disabled", empty)
	button.pressed.connect(callback)
	_buttons.append(button)
	return button


func _change_valve(index: int, value: int) -> void:
	if _synchronizing or is_complete():
		return
	var values: Array = state.get("valves", [])
	var old_value := int(values[index]) if index < values.size() else 0
	var difference := value - old_value
	for step in range(absi(difference)):
		_emit({"kind": "adjust", "index": index, "delta": 1 if difference > 0 else -1})


func _emit(action: Dictionary) -> void:
	if not is_complete():
		puzzle_action.emit(action)


func _toggle_hint() -> void:
	_show_hint = not _show_hint
	_hint.visible = _show_hint
	_hint_button.text = "收起观察" if _show_hint else "再观察一点"
	if _show_hint:
		_hint.text = str(Rules.hint(puzzle_id, state))


func _focus_interaction() -> void:
	if not _valves.is_empty():
		_valves[0].grab_focus()
	elif not _buttons.is_empty() and not _buttons[0].disabled:
		_buttons[0].grab_focus()


func _label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.set_meta("base_font_size", font_size)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label


func _symbol_name(symbol: String) -> String:
	return str({"leaf": "叶", "moon": "月", "wave": "水", "branch": "枝", "star": "星", "bird": "鸟", "root": "根", "flame": "火", "sun": "日", "stone": "石", "wind": "风", "flower": "花"}.get(symbol, symbol))


class LightBoard extends Control:
	var definition: Dictionary = {}
	var state: Dictionary = {}
	var feedback: Dictionary = {}
	var mirror_buttons: Array[Button] = []
	var valve_sliders: Array[VSlider] = []
	var valve_labels: Array[Label] = []
	var rune_buttons: Array[Button] = []
	var network_buttons: Array[Button] = []
	var network_node_labels: Array[Label] = []
	var rune_chain: Label
	var rune_undo: Button
	var rune_clear: Button

	func layout_controls() -> void:
		var kind := str(definition.get("type", ""))
		var config: Dictionary = definition.get("config", {})
		match kind:
			"mirror":
				var cells: Array = config.get("cells", [])
				var grid_size: int = int(config.get("size", 4))
				var cell_size := minf((size.x - 45) / (grid_size + 1), (size.y - 44) / (grid_size + 1))
				var origin := Vector2((size.x - cell_size * grid_size) * 0.5, (size.y - cell_size * grid_size) * 0.5)
				for index in range(mirror_buttons.size()):
					var coordinate: Vector2i = cells[index]
					mirror_buttons[index].position = origin + Vector2(coordinate) * cell_size + Vector2(3, 3)
					mirror_buttons[index].size = Vector2.ONE * (cell_size - 6)
			"balance":
				for index in range(valve_sliders.size()):
					var center := Vector2(size.x * (index + 1) / 4.0, 32)
					valve_sliders[index].position = center + Vector2(24, 4)
					valve_sliders[index].size = Vector2(28, size.y - 127)
					valve_labels[index].position = Vector2(center.x - 68, size.y - 74)
					valve_labels[index].size = Vector2(140, 68)
			"runes":
				var count := rune_buttons.size()
				var columns := 3 if count <= 6 else 4
				var cell := Vector2((size.x - 32) / columns, 96)
				for index in range(count):
					rune_buttons[index].position = Vector2(16 + (index % columns) * cell.x, 8 + int(index / columns) * cell.y)
					rune_buttons[index].size = cell - Vector2(8, 8)
					rune_buttons[index].alignment = HORIZONTAL_ALIGNMENT_CENTER
				if rune_chain != null:
					rune_chain.position = Vector2(10, size.y - 100)
					rune_chain.size = Vector2(size.x - 20, 50)
				if rune_undo != null:
					rune_undo.position = Vector2(16, size.y - 44)
					rune_undo.size = Vector2(size.x * 0.5 - 24, 40)
				if rune_clear != null:
					rune_clear.position = Vector2(size.x * 0.5 + 8, size.y - 44)
					rune_clear.size = Vector2(size.x * 0.5 - 24, 40)
			"network":
				for index in range(network_buttons.size()):
					var center := _switch_point(index, network_buttons.size())
					network_buttons[index].position = center - Vector2(27, 27)
					network_buttons[index].size = Vector2(54, 54)
				for index in range(network_node_labels.size()):
					network_node_labels[index].position = _lamp_point(index) + Vector2(-42, 20)
					network_node_labels[index].size = Vector2(84, 28)
		queue_redraw()

	func _draw() -> void:
		draw_style_box(_background(), Rect2(Vector2.ZERO, size))
		var kind := str(definition.get("type", ""))
		match kind:
			"mirror": _draw_mirrors()
			"balance": _draw_valves()
			"runes": _draw_runes()
			"network": _draw_network()

	func _background() -> StyleBoxFlat:
		var background := StyleBoxFlat.new()
		background.bg_color = Color("0c252d")
		background.border_color = Color("547264")
		background.set_border_width_all(1)
		background.set_corner_radius_all(3)
		return background

	func _draw_mirrors() -> void:
		var config: Dictionary = definition.get("config", {})
		var grid_size: int = int(config.get("size", 4))
		var cell_size := minf((size.x - 45) / (grid_size + 1), (size.y - 44) / (grid_size + 1))
		var origin := Vector2((size.x - cell_size * grid_size) * 0.5, (size.y - cell_size * grid_size) * 0.5)
		for x in range(grid_size + 1):
			draw_line(origin + Vector2(x * cell_size, 0), origin + Vector2(x * cell_size, grid_size * cell_size), Color("31504d"), 1)
		for y in range(grid_size + 1):
			draw_line(origin + Vector2(0, y * cell_size), origin + Vector2(grid_size * cell_size, y * cell_size), Color("31504d"), 1)
		var beam: Array = feedback.get("beam", [])
		for index in range(1, beam.size()):
			var from_point := _grid_point(beam[index - 1], origin, cell_size)
			var to_point := _grid_point(beam[index], origin, cell_size)
			draw_line(from_point, to_point, Color(1.0, 0.74, 0.3, 0.14), 12)
			draw_line(from_point, to_point, Color("f0c977"), 3, true)
			draw_line(from_point, to_point, Color("fff2c2"), 1, true)
		var cells: Array = config.get("cells", [])
		var orientations: Array = state.get("orientations", [])
		for index in range(cells.size()):
			var center := _grid_point(cells[index], origin, cell_size)
			var radius := cell_size * 0.24
			var slash := int(orientations[index]) if index < orientations.size() else 0
			var diagonal := Vector2(radius, -radius if slash == 0 else radius)
			draw_circle(center, radius + 6, Color("173b40"))
			draw_arc(center, radius + 6, 0, TAU, 32, Color("ac8958"), 2, true)
			draw_line(center - diagonal, center + diagonal, Color("d2e4d8"), 5, true)
			draw_circle(center - diagonal, 3, Color("d9aa62"))
			draw_circle(center + diagonal, 3, Color("d9aa62"))
		var source: Variant = config.get("source", Vector2i(-1, 0))
		var target: Variant = config.get("target", Vector2i(grid_size, grid_size - 1))
		_draw_lamp(_grid_point(source, origin, cell_size), true, false)
		_draw_lamp(_grid_point(target, origin, cell_size), bool(feedback.get("beam_reached", false)), true)

	func _draw_valves() -> void:
		var config: Dictionary = definition.get("config", {})
		var values: Array = state.get("valves", [])
		var maximum := maxi(1, int(config.get("max_power", 6)))
		for index in range(3):
			var x := size.x * (index + 1) / 4.0
			var tube := Rect2(x - 33, 36, 40, size.y - 129)
			draw_rect(tube, Color("16363b"))
			draw_rect(tube, Color("967846"), false, 2)
			var value: int = int(values[index]) if index < values.size() else 0
			var power := clampf(float(value) / maximum, 0, 1)
			var fill := Rect2(tube.position + Vector2(4, tube.size.y * (1 - power) + 4), Vector2(tube.size.x - 8, maxf(0, tube.size.y * power - 8)))
			draw_rect(fill, Color("d8ad58"))
			for tick in range(maximum + 1):
				var y := tube.end.y - tube.size.y * tick / maximum
				draw_line(Vector2(tube.position.x - 8, y), Vector2(tube.position.x - 2, y), Color("8fae96"), 1)
			draw_circle(Vector2(x - 13, 20), 10, Color("b88949"))
			draw_circle(Vector2(x - 13, 20), 5, Color("173238"))

	func _draw_runes() -> void:
		for index in range(rune_buttons.size()):
			var rect := Rect2(rune_buttons[index].position, rune_buttons[index].size)
			draw_rect(rect, Color("204239"))
			draw_rect(rect.grow(-2), Color("907951"), false, 1)
			var center := rect.get_center() + Vector2(0, -16)
			var color := Color("dbad64")
			var config: Dictionary = definition.get("config", {})
			var symbols: Array = config.get("symbols", [])
			var symbol := str(symbols[index]) if index < symbols.size() else "芽"
			var form: int = ["芽", "羽", "波", "根", "星", "门", "石", "灯"].find(symbol)
			if form < 0:
				form = index % 8
			match form:
				0:
					draw_line(center + Vector2(0, 13), center + Vector2(0, -5), color, 2, true)
					draw_colored_polygon(PackedVector2Array([center + Vector2(0, 0), center + Vector2(-13, -2), center + Vector2(-8, -13)]), color)
					draw_colored_polygon(PackedVector2Array([center + Vector2(0, 2), center + Vector2(11, -1), center + Vector2(8, -11)]), color)
				1:
					draw_line(center + Vector2(-9, 13), center + Vector2(9, -13), color, 2, true)
					for offset in [-7, -2, 3, 8]:
						var feather_point := center + Vector2(offset * 0.55, -offset)
						draw_line(feather_point, feather_point + Vector2(-8, -6), color, 2, true)
						draw_line(feather_point, feather_point + Vector2(7, 5), color, 2, true)
				2:
					for offset in [-6, 0, 6]:
						draw_arc(center + Vector2(0, offset), 12, PI * 0.1, PI * 0.9, 16, color, 2, true)
				3:
					draw_line(center + Vector2(0, 13), center + Vector2(0, -14), color, 2, true)
					for side in [-1, 1]:
						draw_line(center + Vector2(0, -2), center + Vector2(side * 12, 11), color, 2, true)
				4:
					var points := PackedVector2Array([center + Vector2(0, -14), center + Vector2(4, -4), center + Vector2(14, 0), center + Vector2(4, 4), center + Vector2(0, 14), center + Vector2(-4, 4), center + Vector2(-14, 0), center + Vector2(-4, -4)])
					draw_colored_polygon(points, color)
				5:
					draw_line(center + Vector2(-11, 13), center + Vector2(-11, -12), color, 2, true)
					draw_line(center + Vector2(11, 13), center + Vector2(11, -12), color, 2, true)
					draw_line(center + Vector2(-11, -12), center + Vector2(11, -12), color, 3, true)
				6:
					draw_colored_polygon(PackedVector2Array([center + Vector2(-12, 8), center + Vector2(-6, -10), center + Vector2(8, -6), center + Vector2(13, 8)]), color)
				7:
					draw_rect(Rect2(center + Vector2(-9, -8), Vector2(18, 20)), color, false, 2)
					draw_arc(center + Vector2(0, -9), 7, PI, TAU, 16, color, 2, true)
					draw_circle(center + Vector2(0, 4), 4, color)

	func _draw_network() -> void:
		var config: Dictionary = definition.get("config", {})
		var effects: Array = config.get("effects", [])
		var switches: Array = state.get("switches", [])
		var lit: Array = feedback.get("lit", [])
		for index in range(effects.size()):
			var source := _switch_point(index, effects.size())
			var active := bool(switches[index]) if index < switches.size() else false
			for lamp in range(4):
				if int(effects[index]) & (1 << lamp):
					draw_line(source, _lamp_point(lamp), Color("ba9253") if active else Color("34524d"), 2 if active else 1, true)
			_draw_lamp(source, active, false)
		var target: Array = config.get("target", [])
		for index in range(4):
			var point := _lamp_point(index)
			_draw_lamp(point, bool(lit[index]) if index < lit.size() else false, true)
			var wanted := bool(target[index]) if index < target.size() else true
			draw_circle(point + Vector2(19, -16), 4, Color("eac66f") if wanted else Color("56746a"))
		var danger: Array = feedback.get("danger_edges", config.get("danger_pairs", []))
		for edge: Variant in danger:
			var pair := _coordinate(edge)
			if pair.x >= 0 and pair.x < 4 and pair.y >= 0 and pair.y < 4:
				draw_line(_lamp_point(pair.x), _lamp_point(pair.y), Color("d78970"), 2, true)

	func _draw_lamp(center: Vector2, lit: bool, target: bool) -> void:
		if lit:
			draw_circle(center, 21, Color(0.92, 0.71, 0.34, 0.1))
			draw_circle(center, 15, Color(0.92, 0.71, 0.34, 0.2))
		draw_circle(center, 11, Color("ad8751"))
		draw_circle(center, 8, Color("f6d993") if lit else Color("244742"))
		if target:
			draw_arc(center, 16, 0, TAU, 24, Color("92b29a"), 1, true)

	func _switch_point(index: int, count: int) -> Vector2:
		return Vector2(size.x * (index + 1) / float(count + 1), size.y - 45)

	func _lamp_point(index: int) -> Vector2:
		return Vector2(size.x * (0.32 if index % 2 == 0 else 0.68), 58 + int(index / 2) * 106)

	func _grid_point(value: Variant, origin: Vector2, cell_size: float) -> Vector2:
		return origin + (Vector2(_coordinate(value)) + Vector2(0.5, 0.5)) * cell_size

	func _coordinate(value: Variant) -> Vector2i:
		if value is Vector2i or value is Vector2:
			return Vector2i(value)
		if value is Array and value.size() >= 2:
			return Vector2i(int(value[0]), int(value[1]))
		return Vector2i.ZERO
