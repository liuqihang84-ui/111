extends SceneTree
## Real puzzle solutions, illegal actions, copy isolation and map accessibility.
const Rules = preload("res://scripts/puzzle_rules.gd")
const Data = preload("res://scripts/campaign_data.gd")
const Model = preload("res://scripts/campaign_model.gd")
var checks := 0
var failures := 0

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ",label)

func _without_moves(state: Dictionary) -> Dictionary:
	var result := state.duplicate(true)
	result.erase("moves")
	return result

func _reachable(model: RefCounted, spawn: Vector2, target: Vector2) -> bool:
	# Search walkable cells rather than treating a clear target as a reachable one.
	var stride := 0.75
	var start := Vector2i(roundi(spawn.x / stride),roundi(spawn.y / stride))
	var queue: Array[Vector2i] = [start]
	var visited: Dictionary = {start:true}
	var cursor := 0
	while cursor < queue.size() and cursor < 15000:
		var cell := queue[cursor]
		cursor += 1
		var point := Vector2(cell) * stride
		if point.distance_to(target) < 1.2:
			return true
		for direction: Vector2i in [Vector2i.RIGHT,Vector2i.LEFT,Vector2i.UP,Vector2i.DOWN]:
			var next := cell + direction
			if visited.has(next):
				continue
			var next_point := Vector2(next) * stride
			if model.can_stand(next_point) and model.can_stand((point + next_point) * 0.5):
				visited[next] = true
				queue.append(next)
	return false

func _run() -> void:
	var definitions := Rules.definitions()
	_check(definitions.size() == 30,"Thirty authored light puzzles")
	var per_chapter := [0,0,0,0,0]
	var per_map: Dictionary = {}
	var ids: Dictionary = {}
	var kinds: Dictionary = {}
	var model = Model.new()
	for data: Dictionary in definitions:
		var id: String = data.id
		var tag := id + ": "
		_check(not ids.has(id),tag + "unique ID")
		ids[id] = true
		per_chapter[mini(4,int((int(data.map_id) - 1) / 3))] += 1
		per_map[data.map_id] = int(per_map.get(data.map_id,0)) + (1 if data.required else 0)
		kinds[data.type] = true
		_check(data.map_id >= 1 and data.map_id <= 14 and data.position is Vector2,tag + "campaign map and position")
		_check(data.reward_coins >= 8 and data.reward_coins <= 18,tag + "bounded first-completion reward")
		_check(not data.has("solution_path") and not data.config.has("solution") and not data.config.has("pattern"),tag + "public configuration does not expose rune answer")
		var initial := Rules.initial_state(id)
		_check(Rules.is_state_valid(id,initial),tag + "valid initial state")
		_check(not Rules.is_solved(id,initial),tag + "initial state needs thought")
		var snapshot := initial.duplicate(true)
		var current := initial.duplicate(true)
		var actions := Rules.solution_path(id)
		_check(actions.size() >= 2,tag + "nontrivial authored solution")
		for action: Dictionary in actions:
			var prior := current.duplicate(true)
			current = Rules.apply_action(id,current,action)
			_check(Rules.is_state_valid(id,current),tag + "solution action remains valid")
			_check(prior != current and int(current.moves) == int(prior.moves) + 1,tag + "solution changes state once")
		_check(initial == snapshot,tag + "actions never mutate caller state")
		_check(Rules.is_solved(id,current),tag + "authored actions really solve rule")
		var detail := Rules.view(id,current)
		_check(detail.valid and detail.solved and detail.type == data.type,tag + "view agrees with rule")
		_check(not Rules.hint(id,initial).is_empty() and not Rules.hint(id,current).is_empty(),tag + "useful clue feedback")
		var malformed := initial.duplicate(true)
		malformed.moves = NAN
		_check(not Rules.is_state_valid(id,malformed) and not Rules.is_solved(id,malformed),tag + "NaN state cannot claim solved")
		for bad: Dictionary in [{},{"kind":"teleport"},{"kind":"rotate","index":-1},{"kind":"toggle","index":4},{"kind":"adjust","index":0,"delta":999},{"kind":"choose","symbol":"答案"}]:
			_check(Rules.apply_action(id,initial,bad) == initial,tag + "reject illegal operation")
		var moves_only := current.duplicate(true)
		moves_only.moves = 9999
		_check(Rules.is_solved(id,moves_only),tag + "solved truth is independent of arbitrary waiting/count")
		_check(not current.has("reward") and not current.has("coins") and not current.has("reward_claimed"),tag + "pure rules do not issue repeat rewards")
		match str(data.type):
			"mirror":
				_check(detail.beam.size() > 3 and detail.beam[0] == data.config.source and detail.beam[-1] == data.config.target,tag + "actual traced beam reaches lamp")
				var twice := Rules.apply_action(id,initial,{"kind":"rotate","index":0})
				twice = Rules.apply_action(id,twice,{"kind":"rotate","index":0})
				_check(_without_moves(twice) == _without_moves(initial),tag + "two mirror rotations restore geometry")
				var short := initial.duplicate(true)
				short.orientations.pop_back()
				_check(not Rules.is_state_valid(id,short),tag + "reject missing mirror")
			"balance":
				var total := 0
				for index in range(3):
					total += int(current.valves[index]) * int(data.config.weights[index])
				_check(total == data.config.total and detail.power_difference == data.config.difference,tag + "independent weighted power and difference check")
				var lower := initial.duplicate(true)
				lower.valves[0] = 0
				_check(Rules.apply_action(id,lower,{"kind":"adjust","index":0,"delta":-1}) == lower,tag + "lower valve bound is stable")
				var upper := initial.duplicate(true)
				upper.valves[0] = int(data.config.max_power)
				_check(Rules.apply_action(id,upper,{"kind":"adjust","index":0,"delta":1}) == upper,tag + "upper valve bound is stable")
				var wrong := current.duplicate(true)
				wrong.valves[0] = (int(wrong.valves[0]) + 1) % (int(data.config.max_power) + 1)
				_check(not Rules.is_solved(id,wrong),tag + "incorrect power is rejected")
			"runes":
				_check(current.chosen.size() == data.config.length,tag + "clue sequence has complete length")
				var wrong := current.duplicate(true)
				var index: int = data.config.symbols.find(wrong.chosen[0])
				wrong.chosen[0] = data.config.symbols[(index + 1) % data.config.symbols.size()]
				_check(not Rules.is_solved(id,wrong),tag + "wrong first glyph is rejected")
				_check(Rules.apply_action(id,current,{"kind":"choose","symbol":data.config.symbols[0]}) == current,tag + "full glyph sequence cannot overflow")
				var undone := Rules.apply_action(id,current,{"kind":"undo"})
				_check(undone.chosen.size() == current.chosen.size() - 1,tag + "undo removes one glyph")
				var cleared := Rules.apply_action(id,current,{"kind":"clear"})
				_check(cleared.chosen.is_empty() and not Rules.is_solved(id,cleared),tag + "clear is a real reset")
			"network":
				var count := 0
				var dangerous_states := 0
				for mask in range(16):
					var candidate := initial.duplicate(true)
					for index in range(4):
						candidate.switches[index] = (mask & (1 << index)) != 0
					var evaluated := Rules.view(id,candidate)
					if evaluated.solved:
						count += 1
					if evaluated.dangerous:
						dangerous_states += 1
						_check(not evaluated.solved,tag + "short circuit never claims success")
				_check(count == 1 and dangerous_states > 0,tag + "circuit has one target solution and meaningful red-line hazards")
				var twice := Rules.apply_action(id,initial,{"kind":"toggle","index":2})
				twice = Rules.apply_action(id,twice,{"kind":"toggle","index":2})
				_check(_without_moves(twice) == _without_moves(initial),tag + "paired toggle restores circuit")
		# File-like JSON conversion retains rule state and solution recognition.
		var restored: Variant = JSON.parse_string(JSON.stringify(current))
		_check(restored is Dictionary and Rules.is_state_valid(id,restored) and Rules.is_solved(id,restored),tag + "JSON state round trip retains solved logic")
		model._enter_map(int(data.map_id))
		var map: Dictionary = Data.map_data(int(data.map_id))
		_check(model.can_stand(data.position),tag + "mechanism sits on playable ground")
		_check(_reachable(model,map.spawn,data.position),tag + "mechanism can be reached from spawn")
		var clear := true
		for object: Dictionary in map.objects:
			if data.position.distance_to(object.position) < 1.8:
				clear = false
		_check(clear,tag + "mechanism avoids existing interaction points")
	_check(per_chapter == [6,6,6,6,6],"Every chapter contains six puzzles")
	_check(kinds.size() == 4,"Four distinct logical puzzle types")
	for map_id in range(1,15):
		_check(int(per_map.get(map_id,0)) == 2,"Map %d has exactly two required mechanisms" % map_id)
	var first: Dictionary = definitions[0]
	var copy := Rules.definition(first.id)
	copy.config.cells[0] = Vector2i(99,99)
	copy.initial_state.orientations[0] = 99
	_check(Rules.definition(first.id).config.cells[0] != Vector2i(99,99) and Rules.initial_state(first.id).orientations[0] != 99,"Definition/config/state are deep copies")
	var path := Rules.solution_path(first.id)
	path[0].kind = "tampered"
	_check(Rules.solution_path(first.id)[0].kind == "rotate","Test solution path is copied too")
	_check(Rules.definition("unknown").is_empty() and Rules.initial_state("unknown").is_empty() and not Rules.is_solved("unknown",{}),"Unknown puzzle cannot claim success")
	model = null
	print("PuzzleRules: ",checks - failures,"/",checks," checks passed")
	quit(1 if failures > 0 else 0)
